import { Transaction as SequelizeTransaction, Op } from 'sequelize';
import sequelize from '../config/sequelize';
import {
  Job,
  Booking,
  Technician,
  Service,
  TimeSlot,
} from '../models';
import {
  BookingStatus,
  NotificationType,
  UserRole,
} from '../types';
import AppError from '../utils/AppError';
import { updateBookingStatus } from './booking.state';
import * as matchingService from './matching.service';
import { timeoutQueue } from '../queues/timeout.queue';
import { createNotification } from './notification.service';

export async function acceptJob(
  jobId: string,
  technicianId: string
): Promise<Job> {
  let job = await Job.findByPk(jobId);
  if (!job || job.technician_id !== technicianId) {
    throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
  }

  const booking = await Booking.findByPk(job.booking_id);
  if (!booking || booking.status !== BookingStatus.ASSIGNED) {
    throw new AppError('Booking not in ASSIGNED state', 400, 'INVALID_STATE');
  }

  const attempt = booking.matching_attempts;
  const timeoutJobId = `timeout-${booking.id}-${attempt}`;
  try {
    const timeoutJob = await timeoutQueue.getJob(timeoutJobId);
    if (timeoutJob) await timeoutJob.remove();
  } catch (_) {
    // Job may already be processed or not exist
  }

  const pending = await matchingService.getPendingNotification(booking.id);
  if (pending && pending.technicianId === technicianId) {
    const responseSeconds = (Date.now() - pending.notifiedAt) / 1000;
    await matchingService.recordResponseTime(technicianId, responseSeconds);
  }
  await matchingService.clearMatchingKeys(booking.id);

  await sequelize.transaction(async (t: SequelizeTransaction) => {
    job!.accepted_at = new Date();
    await job!.save({ transaction: t });

    await updateBookingStatus(booking.id, BookingStatus.ACCEPTED, t);
  });

  await createNotification({
    userId: booking.customer_id,
    type: NotificationType.JOB_ACCEPTED,
    title: 'Job accepted',
    message: 'A technician has accepted your job.',
  });

  job = (await Job.findByPk(jobId))!;
  return job;
}

export async function rejectJob(
  jobId: string,
  technicianId: string
): Promise<void> {
  const job = await Job.findByPk(jobId);
  if (!job || job.technician_id !== technicianId) {
    throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
  }

  const booking = await Booking.findByPk(job.booking_id);
  if (!booking || booking.status !== BookingStatus.ASSIGNED) {
    throw new AppError('Booking not in ASSIGNED state', 400, 'INVALID_STATE');
  }

  const attempt = booking.matching_attempts;
  const timeoutJobId = `timeout-${booking.id}-${attempt}`;
  try {
    const timeoutJob = await timeoutQueue.getJob(timeoutJobId);
    if (timeoutJob) await timeoutJob.remove();
  } catch (_) {}

  const technician = await Technician.findByPk(technicianId);
  if (technician) {
    const rate = Math.max(
      0,
      Number(technician.acceptance_rate || 1) - 0.03
    );
    technician.acceptance_rate = String(rate);
    await technician.save();
  }

  await updateBookingStatus(booking.id, BookingStatus.REASSIGNING);
  const { addMatchingJob } = await import('../queues/matching.queue');
  await addMatchingJob(booking.id);
}

export async function startTravel(
  jobId: string,
  technicianId: string
): Promise<Job> {
  let job = await Job.findByPk(jobId);
  if (!job || job.technician_id !== technicianId) {
    throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
  }

  const booking = await Booking.findByPk(job.booking_id);
  if (!booking || booking.status !== BookingStatus.ACCEPTED) {
    throw new AppError('Booking not in ACCEPTED state', 400, 'INVALID_STATE');
  }

  await sequelize.transaction(async (t: SequelizeTransaction) => {
    await updateBookingStatus(booking.id, BookingStatus.ON_THE_WAY, t);
  });

  await createNotification({
    userId: booking.customer_id,
    type: NotificationType.TECHNICIAN_EN_ROUTE,
    title: 'Technician on the way',
    message: 'Your technician is on the way.',
  });

  job = (await Job.findByPk(jobId))!;
  return job;
}

export async function startJob(
  jobId: string,
  technicianId: string
): Promise<Job> {
  let job = await Job.findByPk(jobId);
  if (!job || job.technician_id !== technicianId) {
    throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
  }

  const booking = await Booking.findByPk(job.booking_id);
  if (!booking || booking.status !== BookingStatus.ON_THE_WAY) {
    throw new AppError('Booking not in ON_THE_WAY state', 400, 'INVALID_STATE');
  }

  await sequelize.transaction(async (t: SequelizeTransaction) => {
    job!.started_at = new Date();
    await job!.save({ transaction: t });

    await updateBookingStatus(booking.id, BookingStatus.IN_PROGRESS, t);
  });

  await createNotification({
    userId: booking.customer_id,
    type: NotificationType.JOB_STARTED,
    title: 'Job started',
    message: 'Your technician has started the job.',
  });

  job = (await Job.findByPk(jobId))!;
  return job;
}

export async function completeJob(
  jobId: string,
  technicianId: string
): Promise<Job> {
  let job = await Job.findByPk(jobId);
  if (!job || job.technician_id !== technicianId) {
    throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
  }

  const booking = await Booking.findByPk(job.booking_id);
  if (!booking || booking.status !== BookingStatus.IN_PROGRESS) {
    throw new AppError('Booking not in IN_PROGRESS state', 400, 'INVALID_STATE');
  }

  if (!booking.repair_cost) {
    throw new AppError(
      'Repair estimate required before completion',
      400,
      'REPAIR_ESTIMATE_REQUIRED'
    );
  }

  await sequelize.transaction(async (t: SequelizeTransaction) => {
    job!.completed_at = new Date();
    await job!.save({ transaction: t });

    await updateBookingStatus(booking.id, BookingStatus.COMPLETED, t);
  });

  await createNotification({
    userId: booking.customer_id,
    type: NotificationType.JOB_COMPLETED,
    title: 'Job completed',
    message:
      'Your job is complete. Confirm to release payment or it auto-confirms in 48 hours.',
  });

  job = (await Job.findByPk(jobId))!;
  return job;
}

export async function getTechnicianJobs(
  technicianId: string,
  filter: 'today' | 'upcoming' | 'completed'
): Promise<Job[]> {
  const technician = await Technician.findOne({ where: { user_id: technicianId } });
  if (!technician) {
    throw new AppError('Technician not found', 404, 'TECHNICIAN_NOT_FOUND');
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  let whereBooking: any = {};

  if (filter === 'today') {
    whereBooking.scheduled_time = {
      [Op.gte]: startOfDay,
      [Op.lte]: endOfDay,
    };
  } else if (filter === 'upcoming') {
    whereBooking.scheduled_time = {
      [Op.gt]: now,
    };
    whereBooking.status = {
      [Op.notIn]: [
        BookingStatus.CLOSED,
        BookingStatus.CANCELLED,
        BookingStatus.FAILED,
      ],
    };
  } else if (filter === 'completed') {
    whereBooking.status = BookingStatus.CLOSED;
  }

  const jobs = await Job.findAll({
    where: { technician_id: technician.id },
    include: [
      {
        association: 'booking',
        where: whereBooking,
        include: [
          { association: 'service' as any },
          { association: 'customer' },
          { association: 'slot' },
        ],
      },
    ],
  });

  return jobs;
}

