import { Transaction as SequelizeTransaction, Op } from 'sequelize';
import sequelize from '../config/sequelize';
import {
  Booking,
  Service,
  TimeSlot,
  Technician,
  Wallet,
  Transaction as WalletTransaction,
  Job,
  RepairType,
  TechnicianLocation,
} from '../models';
import redis from '../config/redis';
import {
  BookingStatus,
  PaymentMethod,
  UserRole,
  TransactionStatus,
  TransactionType,
} from '../types';
import AppError from '../utils/AppError';
import logger from '../utils/logger';
import { reserveSlot } from './slot.service';
import { updateBookingStatus } from './booking.state';
import { calculateCancellationPenalty } from '../utils/cancellation';

interface CreateBookingInput {
  customerId: string;
  serviceId: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  scheduledTime: Date;
  slotId: string;
  paymentMethod: PaymentMethod;
}

export async function createBooking(data: CreateBookingInput): Promise<Booking> {
  const service = await Service.findByPk(data.serviceId);
  if (!service || !service.is_active) {
    throw new AppError('Service not available', 400, 'SERVICE_INACTIVE');
  }

  const slot = await TimeSlot.findByPk(data.slotId);
  if (!slot || slot.status !== 'AVAILABLE') {
    throw new AppError('Slot not available', 409, 'SLOT_NOT_AVAILABLE');
  }

  let booking!: Booking;

  await sequelize.transaction(async (t: SequelizeTransaction) => {
    booking = await Booking.create(
      {
        customer_id: data.customerId,
        service_id: data.serviceId,
        description: data.description,
        address: data.address,
        latitude: String(data.latitude),
        longitude: String(data.longitude),
        status: BookingStatus.PENDING,
        scheduled_time: data.scheduledTime,
        slot_id: data.slotId,
        payment_method: data.paymentMethod,
      },
      { transaction: t }
    );

    await reserveSlot(data.slotId, (booking as Booking).id, t);

    (booking as Booking).inspection_fee = service.inspection_fee;
    await (booking as Booking).save({ transaction: t });
  });

  // After commit, move to MATCHING and enqueue for technician matching
  await updateBookingStatus((booking as Booking).id, BookingStatus.MATCHING);
  const { addMatchingJob } = await import('../queues/matching.queue');
  await addMatchingJob((booking as Booking).id);
  try {
    const emitter = require('../socket/socket.emitter');
    emitter.emitNewBookingForMatching(booking as Booking);
  } catch (_) {}
  logger.info('Booking created and moved to MATCHING', {
    bookingId: (booking as Booking).id,
  });

  return booking!;
}

export async function getBookingList(
  requesterId: string,
  role: UserRole
): Promise<Booking[]> {
  const include: any[] = [
    { association: 'service' as any },
    { association: 'customer' },
    {
      association: 'job',
      include: [{ association: 'technician', include: ['user'] }],
    },
    { association: 'slot' },
  ];
  if (role === UserRole.CUSTOMER) {
    return Booking.findAll({
      where: { customer_id: requesterId },
      include,
      order: [['scheduled_time', 'DESC']],
    });
  }
  if (role === UserRole.TECHNICIAN) {
    const technician = await Technician.findOne({ where: { user_id: requesterId } });
    if (!technician) return [];
    const jobs = await Job.findAll({ where: { technician_id: technician.id }, attributes: ['booking_id'] });
    const bookingIds = jobs.map((j) => j.booking_id);
    if (bookingIds.length === 0) return [];
    return Booking.findAll({
      where: { id: { [Op.in]: bookingIds } as any },
      include,
      order: [['scheduled_time', 'DESC']],
    });
  }
  if (role === UserRole.ADMIN) {
    return Booking.findAll({ include, order: [['scheduled_time', 'DESC']] });
  }
  return [];
}

export async function getBooking(
  bookingId: string,
  requesterId: string,
  role: UserRole
): Promise<Booking> {
  const booking = await Booking.findByPk(bookingId, {
    include: [
      { association: 'customer' },
      { association: 'slot' },
      { association: 'payment' },
      {
        association: 'job',
        include: [{ association: 'technician', include: ['user'] }],
      },
      { association: 'service' as any },
    ],
  });

  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }

  if (role === UserRole.CUSTOMER && booking.customer_id !== requesterId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  if (role === UserRole.TECHNICIAN) {
    const technician = await Technician.findOne({ where: { user_id: requesterId } });
    if (!technician) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }
    const job = await Job.findOne({
      where: { booking_id: booking.id, technician_id: technician.id },
    });
    if (!job) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }
  }

  return booking;
}

export async function cancelBooking(
  bookingId: string,
  cancelledBy: string,
  role: UserRole,
  reason: string
): Promise<Booking> {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }

  const cancellableByCustomer = [
    BookingStatus.PENDING,
    BookingStatus.MATCHING,
    BookingStatus.ASSIGNED,
    BookingStatus.ACCEPTED,
    BookingStatus.ON_THE_WAY,
  ];
  const cancellableByTechnician = [
    BookingStatus.ACCEPTED,
    BookingStatus.ON_THE_WAY,
  ];

  const currentStatus = booking.status as BookingStatus;

  if (role === UserRole.CUSTOMER && !cancellableByCustomer.includes(currentStatus)) {
    throw new AppError('Cannot cancel booking in this state', 400, 'CANNOT_CANCEL');
  }
  if (role === UserRole.TECHNICIAN && !cancellableByTechnician.includes(currentStatus)) {
    throw new AppError('Cannot cancel booking in this state', 400, 'CANNOT_CANCEL');
  }

  await sequelize.transaction(async (t: SequelizeTransaction) => {
    const penalty = calculateCancellationPenalty(
      booking,
      role === UserRole.CUSTOMER ? 'customer' : 'technician',
      currentStatus
    );

    if (penalty.penaltyAmount > 0 && booking.slot_id) {
      const job = await Job.findOne({
        where: { booking_id: booking.id },
        transaction: t,
      });
      if (job) {
        const technician = await Technician.findByPk(job.technician_id, {
          transaction: t,
        });
        if (technician) {
          const wallet = await Wallet.findOne({
            where: { technician_id: technician.id },
            transaction: t,
          });
          if (wallet) {
            const locked = Number(wallet.locked_balance) || 0;
            wallet.locked_balance = String(locked + penalty.technicianCompensation);
            await wallet.save({ transaction: t });

            await WalletTransaction.create(
              {
                wallet_id: wallet.id,
                booking_id: booking.id,
                type: TransactionType.CREDIT,
                amount: String(penalty.technicianCompensation),
                status: TransactionStatus.PENDING,
                note: `Cancellation compensation for booking ${booking.id}`,
              },
              { transaction: t }
            );
          }
        }
      }
    }

    if (role === UserRole.TECHNICIAN) {
      const technician = await Technician.findOne({
        where: { user_id: cancelledBy },
        transaction: t,
      });
      if (technician) {
        let penaltyRate = 0;
        if (
          currentStatus === BookingStatus.ASSIGNED ||
          currentStatus === BookingStatus.ACCEPTED
        ) {
          penaltyRate = 0.05;
        } else if (currentStatus === BookingStatus.ON_THE_WAY) {
          penaltyRate = 0.1;
        }
        if (penaltyRate > 0) {
          const current = Number(technician.acceptance_rate) || 0;
          const updated = Math.max(0, current - penaltyRate);
          technician.acceptance_rate = String(updated);
          await technician.save({ transaction: t });
        }
      }
    }

    booking.cancelled_by = cancelledBy;
    booking.cancel_reason = reason;
    await booking.save({ transaction: t });

    await updateBookingStatus(booking.id, BookingStatus.CANCELLED, t);
  });

  return Booking.findByPk(bookingId) as Promise<Booking>;
}

export async function confirmBooking(
  bookingId: string,
  customerId: string
): Promise<Booking> {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }

  if (booking.customer_id !== customerId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  if (booking.status !== BookingStatus.PAYMENT_HELD) {
    throw new AppError('Booking not in confirmable state', 400, 'INVALID_STATE');
  }

  return updateBookingStatus(bookingId, BookingStatus.CONFIRMED);
}

export async function submitRepairEstimate(
  bookingId: string,
  technicianUserId: string,
  repairTypeId: string,
  repairCost: number
): Promise<Booking> {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }

  const technician = await Technician.findOne({ where: { user_id: technicianUserId } });
  if (!technician) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  const job = await Job.findOne({
    where: { booking_id: bookingId, technician_id: technician.id },
  });
  if (!job) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  if (booking.status !== BookingStatus.IN_PROGRESS) {
    throw new AppError('Booking not in progress', 400, 'INVALID_STATE');
  }

  const repairType = await RepairType.findByPk(repairTypeId);
  if (!repairType || repairType.service_id !== booking.service_id) {
    throw new AppError('Invalid repair type', 400, 'INVALID_REPAIR_TYPE');
  }

  const min = Number(repairType.min_price);
  const max = Number(repairType.max_price);
  if (repairCost < min || repairCost > max) {
    throw new AppError('Repair cost out of range', 400, 'INVALID_REPAIR_COST');
  }

  booking.repair_type_id = repairTypeId;
  booking.repair_cost = repairCost as any;
  await booking.save();

  return booking;
}

const LOCATION_KEY = (technicianId: string) => `location:${technicianId}`;

export async function getTechnicianLocation(
  bookingId: string,
  requesterId: string,
  role: UserRole
): Promise<{
  latitude: number;
  longitude: number;
  updatedAt: string;
  tracking_active: boolean;
} | null> {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  if (role === UserRole.CUSTOMER && booking.customer_id !== requesterId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }
  if (role !== UserRole.ADMIN && role !== UserRole.CUSTOMER) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  const job = await Job.findOne({ where: { booking_id: bookingId } });
  if (!job) return null;

  const cached = await redis.get(LOCATION_KEY(job.technician_id));
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { latitude: number; longitude: number; updatedAt: number };
      return {
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        updatedAt: new Date(parsed.updatedAt).toISOString(),
        tracking_active: true,
      };
    } catch (_) {
      // fall through to DB
    }
  }

  const loc = await TechnicianLocation.findOne({
    where: { technician_id: job.technician_id },
  });
  if (!loc || !loc.tracking_active) return null;

  return {
    latitude: Number(loc.latitude),
    longitude: Number(loc.longitude),
    updatedAt: (loc as any).updated_at?.toISOString?.() ?? new Date().toISOString(),
    tracking_active: loc.tracking_active,
  };
}

