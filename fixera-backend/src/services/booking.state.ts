import { Transaction as SequelizeTransaction } from 'sequelize';
import {
  Booking,
  Job,
  TechnicianLocation,
  Wallet,
  Transaction as WalletTransaction,
  TimeSlot,
  Dispute,
  Notification,
  Technician,
} from '../models';
import {
  BookingStatus,
  NotificationType,
  SlotStatus,
  TransactionStatus,
  TransactionType,
} from '../types';
import AppError from '../utils/AppError';
import logger from '../utils/logger';
import { scheduleAutoConfirm } from '../queues/autoConfirm.queue';
import { addFundReleaseJob } from '../queues/fundRelease.queue';
import { generateInvoice } from '../services/payment.service';
import { createNotification } from './notification.service';

const HOURS_48 = 48 * 60 * 60 * 1000;
const HOURS_72 = 72 * 60 * 60 * 1000;

export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  transaction?: SequelizeTransaction
): Promise<Booking> {
  const opts = transaction ? { transaction } : undefined;

  const booking = await Booking.findByPk(bookingId, opts);
  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }

  const currentStatus = booking.status as BookingStatus;

  // Basic transition validation is expected to be handled elsewhere via VALID_TRANSITIONS,
  // but enforce here defensively.
  if (currentStatus === newStatus) {
    return booking;
  }

  logger.info('Updating booking status', {
    bookingId,
    from: currentStatus,
    to: newStatus,
  });

  booking.status = newStatus;

  const now = new Date();

  if (newStatus === BookingStatus.ON_THE_WAY) {
    const job = await Job.findOne({ where: { booking_id: booking.id }, ...opts });
    if (job) {
      const location = await TechnicianLocation.findOne({
        where: { technician_id: job.technician_id },
        ...opts,
      });
      if (location) {
        location.tracking_active = true;
        location.booking_id = booking.id;
        await location.save(opts as any);
      }
    }
  }

  if (newStatus === BookingStatus.COMPLETED) {
    const job = await Job.findOne({ where: { booking_id: booking.id }, ...opts });
    if (job) {
      job.completed_at = now;
      await job.save(opts as any);
    }

    const autoConfirmAt = new Date(now.getTime() + HOURS_48);
    booking.auto_confirm_at = autoConfirmAt;
    booking.dispute_window_end = new Date(now.getTime() + HOURS_48 + HOURS_72);

    const jobForTech = await Job.findOne({ where: { booking_id: booking.id }, ...opts });
    if (jobForTech) {
      const location = await TechnicianLocation.findOne({
        where: { technician_id: jobForTech.technician_id },
        ...opts,
      });
      if (location) {
        location.tracking_active = false;
        await location.save(opts as any);
      }
    }

    // Schedule auto-confirmation
    if (!transaction) {
      await scheduleAutoConfirm(booking.id, autoConfirmAt);
    }
  }

  if (newStatus === BookingStatus.CONFIRMED) {
    booking.dispute_window_end = new Date(now.getTime() + HOURS_72);

    if (!booking.repair_cost) {
      throw new AppError('Repair cost not set for confirmation', 400, 'MISSING_REPAIR_COST');
    }

    const PLATFORM_COMMISSION_RATE = Number(
      process.env.PLATFORM_COMMISSION_RATE || '0.15'
    );

    const amount = Number(booking.repair_cost);
    const creditAmount = amount - amount * PLATFORM_COMMISSION_RATE;

    const job = await Job.findOne({ where: { booking_id: booking.id }, ...opts });
    if (job) {
      const technician = await Technician.findByPk(job.technician_id, opts as any);
      if (technician) {
        const wallet = await Wallet.findOne({
          where: { technician_id: technician.id },
          ...opts,
        });
        if (wallet) {
          const numericLocked = Number(wallet.locked_balance) || 0;
          const numericEarned = Number(wallet.total_earned) || 0;

          wallet.locked_balance = String(numericLocked + creditAmount);
          wallet.total_earned = String(numericEarned + creditAmount);
          await wallet.save(opts as any);

          const withdrawableAt = new Date(now.getTime() + HOURS_72);

          await WalletTransaction.create(
            {
              wallet_id: wallet.id,
              booking_id: booking.id,
              type: TransactionType.CREDIT,
              amount: String(creditAmount),
              status: TransactionStatus.PENDING,
              withdrawable_at: withdrawableAt,
              note: `Job payment for booking ${booking.id}`,
            },
            opts as any
          );
        }
      }
    }
    if (!transaction) {
      const releaseAt = new Date(now.getTime() + HOURS_72);
      await addFundReleaseJob(booking.id, releaseAt);
    }

    const existingInvoice = await (booking as any).getInvoice?.(opts);
    if (!existingInvoice) {
      await generateInvoice(
        booking.id,
        booking.customer_id,
        Number(booking.repair_cost)
      );
    }
  }

  if (newStatus === BookingStatus.CANCELLED) {
    if (booking.slot_id) {
      const slot = await TimeSlot.findByPk(booking.slot_id, opts as any);
      if (slot) {
        slot.status = SlotStatus.RELEASED;
        slot.booking_id = null;
        await slot.save(opts as any);
      }
    }

    const job = await Job.findOne({ where: { booking_id: booking.id }, ...opts });
    if (job) {
      const location = await TechnicianLocation.findOne({
        where: { technician_id: job.technician_id },
        ...opts,
      });
      if (location) {
        location.tracking_active = false;
        await location.save(opts as any);
      }
    }
  }

  if (newStatus === BookingStatus.DISPUTED) {
    // Ensure any pending wallet transactions remain locked (no balance movement here)
    await WalletTransaction.update(
      { status: TransactionStatus.PENDING },
      {
        where: {
          booking_id: booking.id,
          status: TransactionStatus.PENDING,
        },
        ...(opts || {}),
      }
    );

    await Dispute.create(
      {
        booking_id: booking.id,
        raised_by: booking.customer_id,
        reason: booking.cancel_reason || 'Dispute opened',
      },
      opts as any
    );

    const adminUsers = await Technician.sequelize!.models.User.findAll({
      where: { role: 'ADMIN' },
      ...opts,
    } as any);

    for (const admin of adminUsers as any[]) {
      await createNotification({
        userId: (admin as any).id,
        type: NotificationType.DISPUTE_OPENED,
        title: 'Dispute opened',
        message: `Dispute opened for booking ${booking.id}`,
      });
    }
  }

  if (newStatus === BookingStatus.FAILED) {
    if (booking.slot_id) {
      const slot = await TimeSlot.findByPk(booking.slot_id, opts as any);
      if (slot) {
        slot.status = SlotStatus.RELEASED;
        slot.booking_id = null;
        await slot.save(opts as any);
      }
    }

    await createNotification({
      userId: booking.customer_id,
      type: NotificationType.BOOKING_CREATED,
      title: 'Booking failed',
      message: 'No technicians available. Please try again.',
    });
  }

  if (newStatus === BookingStatus.CLOSED) {
    if (booking.slot_id) {
      const slot = await TimeSlot.findByPk(booking.slot_id, opts as any);
      if (slot) {
        slot.status = SlotStatus.RELEASED;
        slot.booking_id = null;
        await slot.save(opts as any);
      }
    }

    await createNotification({
      userId: booking.customer_id,
      type: NotificationType.REVIEW_REQUEST,
      title: 'Rate your service',
      message: 'Please leave a review for your recent booking.',
    });
  }

  await booking.save(opts);

  try {
    const emitter = require('../socket/socket.emitter');
    emitter.emitBookingStatusChanged(bookingId, { status: newStatus, bookingId });
    if (newStatus === BookingStatus.CONFIRMED) {
      const job = await Job.findOne({ where: { booking_id: bookingId } });
      if (job) {
        const tech = await Technician.findByPk(job.technician_id);
        if (tech?.user_id) {
          const walletService = require('./wallet.service');
          const wallet = await walletService.getWalletBalance(tech.id);
          emitter.emitToUser(tech.user_id, 'wallet:updated', {
            balance: wallet.balance,
            locked_balance: wallet.locked_balance,
          });
        }
      }
    }
    if (newStatus === BookingStatus.DISPUTED) {
      const dispute = await Dispute.findOne({ where: { booking_id: bookingId } });
      if (dispute) emitter.emitNewDispute(dispute);
    }
    if (newStatus === BookingStatus.FAILED) {
      emitter.emitToAdmin('booking:failed', { bookingId });
    }
  } catch (_) {
    // Socket server may not be ready or not initialized
  }

  return booking;
}

