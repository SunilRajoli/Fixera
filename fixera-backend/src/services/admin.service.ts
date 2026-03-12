import { Op, Transaction as SequelizeTransaction } from 'sequelize';
import sequelize from '../config/sequelize';
import { Booking, Job, Technician, Payout, User, Wallet, Payment, Transaction, Invoice } from '../models';
import {
  VerificationStatus,
  BookingStatus,
  PayoutStatus,
  TransactionType,
  UserRole,
} from '../types';
import AppError from '../utils/AppError';
import { updateBookingStatus } from './booking.state';
import * as matchingService from './matching.service';
import { createNotification } from './notification.service';

export async function manualAssign(
  bookingId: string,
  technicianId: string
): Promise<Booking> {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }

  const status = booking.status as BookingStatus;
  if (status !== BookingStatus.FAILED && status !== BookingStatus.MATCHING) {
    throw new AppError(
      'Booking can only be assigned when status is FAILED or MATCHING',
      400,
      'INVALID_STATE'
    );
  }

  const technician = await Technician.findByPk(technicianId);
  if (!technician) {
    throw new AppError('Technician not found', 404, 'TECHNICIAN_NOT_FOUND');
  }
  if (technician.verification_status !== VerificationStatus.APPROVED) {
    throw new AppError('Technician is not approved', 400, 'TECHNICIAN_NOT_APPROVED');
  }
  if (!technician.is_online) {
    throw new AppError('Technician is not online', 400, 'TECHNICIAN_OFFLINE');
  }

  await sequelize.transaction(async (t: SequelizeTransaction) => {
    await Job.create(
      {
        booking_id: bookingId,
        technician_id: technicianId,
      },
      { transaction: t }
    );
    await updateBookingStatus(bookingId, BookingStatus.ASSIGNED, t);
  });

  const updated = await Booking.findByPk(bookingId);
  const attempt = updated?.matching_attempts ?? 0;
  await matchingService.notifyTechnician(technicianId, bookingId, attempt + 1);

  return (await Booking.findByPk(bookingId))!;
}

export async function getPayouts(
  status?: PayoutStatus,
  page = 1,
  limit = 20
): Promise<{ payouts: Payout[]; total: number; pages: number }> {
  const where: any = {};
  if (status) {
    where.status = status;
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await Payout.findAndCountAll({
    where,
    include: [
      {
        association: 'technician',
        include: [{ association: 'user' }],
      },
    ],
    order: [['created_at', 'DESC']],
    offset,
    limit,
  } as any);

  const pages = Math.ceil(count / limit) || 1;
  return { payouts: rows, total: count, pages };
}

export async function getDashboardStats(): Promise<{
  bookings: {
    total: number;
    today: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    failed: number;
    disputed: number;
  };
  revenue: {
    totalCollected: number;
    totalCommission: number;
    totalPayouts: number;
    pendingPayouts: number;
  };
  technicians: {
    total: number;
    active: number;
    pendingVerification: number;
    suspended: number;
  };
  customers: {
    total: number;
    newToday: number;
  };
  disputes: {
    open: number;
    underReview: number;
    resolved: number;
  };
}> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [
    bookingsTotal,
    bookingsToday,
    pending,
    inProgress,
    completed,
    cancelled,
    failed,
    disputed,
    totalCollected,
    totalCommission,
    totalPayouts,
    pendingPayouts,
    techTotal,
    techActive,
    techPendingVerification,
    customersTotal,
    customersNewToday,
  ] = await Promise.all([
    Booking.count(),
    Booking.count({ where: { createdAt: { [Op.gte]: startOfDay } } as any }),
    Booking.count({ where: { status: BookingStatus.PENDING } }),
    Booking.count({
      where: { status: [BookingStatus.ON_THE_WAY, BookingStatus.IN_PROGRESS] as any },
    }),
    Booking.count({ where: { status: BookingStatus.CLOSED } }),
    Booking.count({ where: { status: BookingStatus.CANCELLED } }),
    Booking.count({ where: { status: BookingStatus.FAILED } }),
    Booking.count({ where: { status: BookingStatus.DISPUTED } }),
    Payment.sum('amount', { where: { status: 'CAPTURED' } as any }),
    Invoice.sum('platform_commission', { where: { status: 'ISSUED' } as any }),
    Payout.sum('amount', { where: { status: PayoutStatus.PROCESSED } as any }),
    Payout.sum('amount', { where: { status: PayoutStatus.PENDING } as any }),
    Technician.count(),
    Technician.count({ where: { verification_status: VerificationStatus.APPROVED, is_online: true } }),
    Technician.count({ where: { verification_status: VerificationStatus.PENDING } }),
    User.count({ where: { role: UserRole.CUSTOMER } }),
    User.count({
      where: {
        role: UserRole.CUSTOMER,
        createdAt: { [Op.gte]: startOfDay },
      } as any,
    }),
  ]);

  const suspended = await User.count({
    where: { role: UserRole.TECHNICIAN, is_active: false },
  });

  const [openDisputes, underReviewDisputes, resolvedDisputes] = await Promise.all([
    Booking.count({ where: { status: BookingStatus.DISPUTED } }),
    Booking.count({ where: { status: BookingStatus.DISPUTED } }),
    Booking.count({ where: { status: BookingStatus.CLOSED } }),
  ]);

  return {
    bookings: {
      total: bookingsTotal,
      today: bookingsToday,
      pending,
      inProgress,
      completed,
      cancelled,
      failed,
      disputed,
    },
    revenue: {
      totalCollected: Number(totalCollected) || 0,
      totalCommission: Number(totalCommission) || 0,
      totalPayouts: Number(totalPayouts) || 0,
      pendingPayouts: Number(pendingPayouts) || 0,
    },
    technicians: {
      total: techTotal,
      active: techActive,
      pendingVerification: techPendingVerification,
      suspended,
    },
    customers: {
      total: customersTotal,
      newToday: customersNewToday,
    },
    disputes: {
      open: openDisputes,
      underReview: underReviewDisputes,
      resolved: resolvedDisputes,
    },
  };
}

export async function getTechnicianPerformance(
  page = 1,
  limit = 20,
  search?: string,
  onlineOnly?: boolean
): Promise<{
  technicians: Array<{
    id: string;
    name: string;
    phone: string;
    rating: number;
    totalJobs: number;
    completedJobs: number;
    acceptance_rate: number;
    totalEarned: number;
    city: string;
    verification_status: string;
  }>;
  total: number;
}> {
  const offset = (page - 1) * limit;
  const term = search?.trim();
  const userWhere =
    term ?
      {
        [Op.or]: [
          { name: { [Op.iLike]: `%${term}%` } },
          { phone: { [Op.iLike]: `%${term}%` } },
        ],
      }
    : undefined;

  const technicianWhere = onlineOnly ? { is_online: true } : {};

  const { rows, count } = await Technician.findAndCountAll({
    where: technicianWhere,
    include: [
      {
        association: 'user' as any,
        attributes: ['name', 'phone'],
        ...(userWhere ? { where: userWhere, required: true } : {}),
      },
      { association: 'wallet', attributes: ['total_earned'] },
    ],
    order: [['rating', 'DESC']],
    offset,
    limit,
  } as any);

  const technicians = await Promise.all(
    rows.map(async (tech: any) => {
      const totalJobs = await Job.count({ where: { technician_id: tech.id } });
      const completedJobs = await Job.count({
        where: { technician_id: tech.id },
      });
      return {
        id: tech.id,
        name: tech.user?.name ?? '',
        phone: tech.user?.phone ?? '',
        rating: Number(tech.rating) || 0,
        totalJobs,
        completedJobs,
        acceptance_rate: Number(tech.acceptance_rate) || 0,
        totalEarned: Number(tech.wallet?.total_earned) || 0,
        city: tech.city,
        verification_status: tech.verification_status,
        isOnline: Boolean(tech.is_online),
      };
    })
  );

  return { technicians, total: count };
}

export async function getCustomers(
  page = 1,
  limit = 20
): Promise<{ customers: User[]; total: number; pages: number }> {
  const offset = (page - 1) * limit;
  const { rows, count } = await User.findAndCountAll({
    where: { role: UserRole.CUSTOMER },
    attributes: ['id', 'name', 'phone', 'created_at', 'role'],
    order: [['created_at', 'DESC']],
    offset,
    limit,
  } as any);
  return {
    customers: rows,
    total: count,
    pages: Math.ceil(count / limit) || 1,
  };
}

export async function verifyTechnician(
  technicianId: string,
  status: VerificationStatus,
  adminNote?: string
): Promise<Technician> {
  const technician = await Technician.findByPk(technicianId, {
    include: [{ association: 'user' }],
  } as any);
  if (!technician) {
    throw new AppError('Technician not found', 404, 'TECHNICIAN_NOT_FOUND');
  }

  technician.verification_status = status;
  await technician.save();

  if (status === VerificationStatus.APPROVED) {
    const [wallet] = await Wallet.findOrCreate({
      where: { technician_id: technician.id },
      defaults: {
        technician_id: technician.id,
        balance: 0,
        locked_balance: 0,
        total_earned: 0,
        total_withdrawn: 0,
      } as any,
    } as any);

    if (technician.user_id) {
      await createNotification({
        userId: technician.user_id,
        type: 'JOB_ASSIGNED' as any,
        title: 'Verification approved',
        message: 'Your account has been verified. You can now receive job requests.',
      });
    }
  } else if (status === VerificationStatus.REJECTED && technician.user_id) {
    await createNotification({
      userId: technician.user_id,
      type: 'JOB_ASSIGNED' as any,
      title: 'Verification unsuccessful',
      message: 'Your verification was unsuccessful. Please resubmit your documents.',
    });
  }

  return technician;
}

export async function toggleTechnicianStatus(
  technicianId: string,
  isActive: boolean
): Promise<void> {
  const technician = await Technician.findByPk(technicianId, {
    include: [{ association: 'user' }],
  } as any);
  const user = (technician as any).user as User | undefined;
  if (!technician || !user) {
    throw new AppError('Technician not found', 404, 'TECHNICIAN_NOT_FOUND');
  }

  user.is_active = isActive;
  await user.save();

  if (!isActive && technician.user_id) {
    await createNotification({
      userId: technician.user_id,
      type: 'JOB_ASSIGNED' as any,
      title: 'Account deactivated',
      message: 'Your account has been deactivated. Contact support.',
    });
  }
}

