import { Transaction as SequelizeTransaction, Op } from 'sequelize';
import sequelize from '../config/sequelize';
import {
  Dispute,
  Booking,
  Job,
  Payment,
  Wallet,
  Transaction,
  Technician,
  User,
} from '../models';
import {
  BookingStatus,
  DisputeStatus,
  DisputeResolution,
  UserRole,
  TransactionStatus,
  TransactionType,
  NotificationType,
} from '../types';
import AppError from '../utils/AppError';
import logger from '../utils/logger';
import { updateBookingStatus } from './booking.state';
import { processRefund } from './payment.service';
import { createNotification } from './notification.service';

const PLATFORM_COMMISSION_RATE = Number(process.env.PLATFORM_COMMISSION_RATE || '0.15');

const VALID_TRANSITIONS: Partial<Record<DisputeStatus, DisputeStatus[]>> = {
  [DisputeStatus.OPEN]: [DisputeStatus.UNDER_REVIEW],
  [DisputeStatus.UNDER_REVIEW]: [
    DisputeStatus.AWAITING_RESPONSE,
    DisputeStatus.RESOLVED,
    DisputeStatus.ESCALATED,
  ],
  [DisputeStatus.AWAITING_RESPONSE]: [DisputeStatus.UNDER_REVIEW],
  [DisputeStatus.ESCALATED]: [DisputeStatus.RESOLVED],
};

function toAmount(value: number): number {
  return parseFloat(value.toFixed(2));
}

export async function raiseDispute(
  bookingId: string,
  customerId: string,
  reason: string
): Promise<Dispute> {
  const booking = await Booking.findByPk(bookingId, {
    include: [{ association: 'payment' }, { association: 'job' }],
  });
  if (!booking) throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  if (booking.customer_id !== customerId) throw new AppError('Forbidden', 403, 'FORBIDDEN');

  const status = booking.status as BookingStatus;
  const allowed = [BookingStatus.PAYMENT_HELD, BookingStatus.COMPLETED, BookingStatus.CONFIRMED];
  if (!allowed.includes(status)) {
    throw new AppError('Dispute can only be raised for PAYMENT_HELD, COMPLETED or CONFIRMED bookings', 400, 'INVALID_STATE');
  }

  if (!booking.dispute_window_end || new Date() >= new Date(booking.dispute_window_end)) {
    throw new AppError('Dispute window has closed for this booking', 400, 'DISPUTE_WINDOW_CLOSED');
  }

  const existing = await Dispute.findOne({ where: { booking_id: bookingId } });
  if (existing) throw new AppError('Dispute already exists for this booking', 409, 'DISPUTE_ALREADY_EXISTS');

  let dispute: Dispute;

  await sequelize.transaction(async (t: SequelizeTransaction) => {
    dispute = await Dispute.create(
      {
        booking_id: bookingId,
        raised_by: customerId,
        reason,
        status: DisputeStatus.OPEN,
      },
      { transaction: t }
    );

    await updateBookingStatus(bookingId, BookingStatus.DISPUTED, t);

    await Transaction.update(
      { note: sequelize.literal(`note || ' [DISPUTED]'`) as any },
      {
        where: {
          booking_id: bookingId,
          type: TransactionType.CREDIT,
        },
        transaction: t,
      }
    );

    const admins = await User.findAll({ where: { role: 'ADMIN' }, attributes: ['id'], transaction: t } as any);
    for (const admin of admins as any[]) {
      await createNotification({
        userId: admin.id,
        type: NotificationType.DISPUTE_OPENED,
        title: 'Dispute opened',
        message: `Dispute raised for booking ${bookingId} by customer ${customerId}`,
      });
    }

    const job = await Job.findOne({ where: { booking_id: bookingId }, transaction: t });
    if (job) {
      const tech = await Technician.findByPk(job.technician_id, { transaction: t });
      if (tech) {
        await createNotification({
          userId: tech.user_id,
          type: NotificationType.DISPUTE_OPENED,
          title: 'Dispute raised',
          message: `A dispute has been raised for job ${bookingId}. Funds are on hold pending review.`,
        });
      }
    }
  });

  try {
    const emitter = require('../socket/socket.emitter');
    emitter.emitNewDispute(dispute!);
    const job = await Job.findOne({ where: { booking_id: bookingId } });
    if (job) {
      const tech = await Technician.findByPk(job.technician_id);
      if (tech?.user_id) {
        emitter.emitToUser(tech.user_id, 'dispute:raised', {
          bookingId,
          disputeId: dispute!.id,
        });
      }
    }
  } catch (_) {}

  return dispute!;
}

export async function updateDisputeStatus(
  disputeId: string,
  adminId: string,
  newStatus: DisputeStatus,
  note?: string
): Promise<Dispute> {
  const dispute = await Dispute.findByPk(disputeId);
  if (!dispute) throw new AppError('Dispute not found', 404, 'DISPUTE_NOT_FOUND');

  const current = dispute.status as DisputeStatus;
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new AppError(`Invalid status transition from ${current} to ${newStatus}`, 400, 'INVALID_STATE_TRANSITION');
  }

  dispute.status = newStatus;
  if (note != null) dispute.admin_note = note;
  if (newStatus === DisputeStatus.RESOLVED || newStatus === DisputeStatus.ESCALATED) {
    dispute.resolved_by = adminId;
  }
  if (newStatus === DisputeStatus.RESOLVED) {
    dispute.resolved_at = new Date();
  }
  await dispute.save();
  return dispute;
}

export async function resolveDispute(
  disputeId: string,
  adminId: string,
  resolution: DisputeResolution,
  data: { customerRefundAmount?: number; technicianAmount?: number; note: string }
): Promise<Dispute> {
  const dispute = await Dispute.findByPk(disputeId, {
    include: [{ association: 'booking', include: ['payment', 'job'] }],
  });
  if (!dispute) throw new AppError('Dispute not found', 404, 'DISPUTE_NOT_FOUND');

  const status = dispute.status as DisputeStatus;
  if (status !== DisputeStatus.UNDER_REVIEW && status !== DisputeStatus.ESCALATED) {
    throw new AppError('Dispute can only be resolved when UNDER_REVIEW or ESCALATED', 400, 'INVALID_STATE');
  }

  const booking = await Booking.findByPk(dispute.booking_id, {
    include: [{ association: 'job' }],
  });
  if (!booking) throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');

  const repairCost = Number(booking.repair_cost) || 0;
  const technicianAmount = toAmount(repairCost * (1 - PLATFORM_COMMISSION_RATE));

  await sequelize.transaction(async (t: SequelizeTransaction) => {
    if (resolution === DisputeResolution.REFUND_CUSTOMER) {
      await processRefund(dispute.booking_id, adminId, repairCost, data.note);

      const creditTrx = await Transaction.findOne({
        where: { booking_id: dispute.booking_id, type: TransactionType.CREDIT },
        transaction: t,
      } as any);
      if (creditTrx) {
        creditTrx.status = TransactionStatus.REVERSED;
        await creditTrx.save({ transaction: t });
      }

      const job = await Job.findOne({ where: { booking_id: dispute.booking_id }, transaction: t });
      if (job) {
        const wallet = await Wallet.findOne({ where: { technician_id: job.technician_id }, transaction: t });
        if (wallet) {
          const locked = Number(wallet.locked_balance) || 0;
          wallet.locked_balance = String(toAmount(Math.max(0, locked - technicianAmount)));
          await wallet.save({ transaction: t });
        }
      }

      await createNotification({
        userId: booking.customer_id,
        type: NotificationType.DISPUTE_RESOLVED,
        title: 'Dispute resolved',
        message: 'Dispute resolved. Full refund initiated.',
      });
      const job2 = await Job.findOne({ where: { booking_id: dispute.booking_id } });
      if (job2) {
        const tech = await Technician.findByPk(job2.technician_id);
        if (tech) {
          await createNotification({
            userId: tech.user_id,
            type: NotificationType.DISPUTE_RESOLVED,
            title: 'Dispute resolved',
            message: "Dispute resolved in customer's favour. Funds have been reversed.",
          });
        }
      }
      await updateBookingStatus(dispute.booking_id, BookingStatus.CLOSED, t);
    } else if (resolution === DisputeResolution.PAY_TECHNICIAN) {
      const job = await Job.findOne({ where: { booking_id: dispute.booking_id }, transaction: t });
      if (!job) throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
      const wallet = await Wallet.findOne({ where: { technician_id: job.technician_id }, transaction: t });
      if (!wallet) throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');

      const creditTrx = await Transaction.findOne({
        where: { booking_id: dispute.booking_id, type: TransactionType.CREDIT, status: TransactionStatus.PENDING },
        transaction: t,
      } as any);
      if (creditTrx) {
        creditTrx.status = TransactionStatus.COMPLETED;
        await creditTrx.save({ transaction: t });
      }

      const locked = Number(wallet.locked_balance) || 0;
      const balance = Number(wallet.balance) || 0;
      wallet.locked_balance = String(toAmount(Math.max(0, locked - technicianAmount)));
      wallet.balance = String(toAmount(balance + technicianAmount));
      await wallet.save({ transaction: t });

      const tech = await Technician.findByPk(job.technician_id);
      if (tech) {
        await createNotification({
          userId: tech.user_id,
          type: NotificationType.DISPUTE_RESOLVED,
          title: 'Dispute resolved',
          message: "Dispute resolved in your favour. Funds released to your wallet.",
        });
      }
      await createNotification({
        userId: booking.customer_id,
        type: NotificationType.DISPUTE_RESOLVED,
        title: 'Dispute resolved',
        message: 'Dispute resolved. Payment released to technician.',
      });
      await updateBookingStatus(dispute.booking_id, BookingStatus.CLOSED, t);
    } else if (resolution === DisputeResolution.PARTIAL_SPLIT) {
      const cust = data.customerRefundAmount ?? 0;
      const techAmt = data.technicianAmount ?? 0;
      const sum = toAmount(cust + techAmt);
      if (Math.abs(sum - repairCost) > 1) {
        throw new AppError('customerRefundAmount + technicianAmount must equal repair cost', 400, 'INVALID_AMOUNTS');
      }

      if (cust > 0) {
        await processRefund(dispute.booking_id, adminId, cust, data.note);
      }

      const job = await Job.findOne({ where: { booking_id: dispute.booking_id }, transaction: t });
      if (job && techAmt > 0) {
        const wallet = await Wallet.findOne({ where: { technician_id: job.technician_id }, transaction: t });
        if (wallet) {
          const locked = Number(wallet.locked_balance) || 0;
          const balance = Number(wallet.balance) || 0;
          wallet.locked_balance = String(toAmount(Math.max(0, locked - techAmt)));
          wallet.balance = String(toAmount(balance + techAmt));
          await wallet.save({ transaction: t });
        }
      }

      await createNotification({
        userId: booking.customer_id,
        type: NotificationType.DISPUTE_RESOLVED,
        title: 'Dispute resolved',
        message: 'Dispute resolved. Refund initiated as per resolution.',
      });
      if (job) {
        const tech = await Technician.findByPk(job.technician_id);
        if (tech) {
          await createNotification({
            userId: tech.user_id,
            type: NotificationType.DISPUTE_RESOLVED,
            title: 'Dispute resolved',
            message: 'Dispute resolved. Your share has been released.',
          });
        }
      }
      await updateBookingStatus(dispute.booking_id, BookingStatus.CLOSED, t);
    }

    dispute.status = DisputeStatus.RESOLVED;
    dispute.resolution = resolution;
    dispute.resolved_by = adminId;
    dispute.resolved_at = new Date();
    dispute.admin_note = data.note;
    await dispute.save({ transaction: t });
  });

  return dispute;
}

export async function getDispute(
  disputeId: string,
  requesterId: string,
  role: UserRole
): Promise<Dispute> {
  const dispute = await Dispute.findByPk(disputeId, {
    include: [
      { association: 'booking', include: ['customer', 'payment', 'invoice'] },
      { association: 'booking', include: [{ association: 'job', include: ['technician'] }] },
    ],
  } as any);
  if (!dispute) throw new AppError('Dispute not found', 404, 'DISPUTE_NOT_FOUND');

  const booking = await Booking.findByPk(dispute.booking_id, {
    include: [{ association: 'job' }],
  });
  if (!booking) throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');

  if (role === UserRole.ADMIN) return dispute;
  if (role === UserRole.CUSTOMER && booking.customer_id === requesterId) return dispute;
  if (role === UserRole.TECHNICIAN) {
    const tech = await Technician.findOne({ where: { user_id: requesterId } });
    const job = await Job.findOne({ where: { booking_id: dispute.booking_id } });
    if (tech && job && job.technician_id === tech.id) return dispute;
  }
  throw new AppError('Forbidden', 403, 'FORBIDDEN');
}

export async function getDisputeList(filters: {
  status?: DisputeStatus;
  page: number;
  limit: number;
}): Promise<{ disputes: Dispute[]; total: number; pages: number }> {
  const where: any = {};
  if (filters.status) where.status = filters.status;
  const offset = (filters.page - 1) * filters.limit;

  const { rows, count } = await Dispute.findAndCountAll({
    where,
    include: [
      {
        association: 'booking',
        include: [
          { association: 'service', attributes: ['name'] },
          { association: 'customer', attributes: ['name', 'phone'] },
          { association: 'job', include: [{ association: 'technician', include: ['user'] }] },
        ],
      },
    ],
    order: [['created_at', 'DESC']],
    offset,
    limit: filters.limit,
  } as any);

  const pages = Math.ceil(count / filters.limit) || 1;
  return { disputes: rows, total: count, pages };
}
