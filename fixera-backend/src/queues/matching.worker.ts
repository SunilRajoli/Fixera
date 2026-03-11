import { Worker } from 'bullmq';
import { Transaction as SequelizeTransaction } from 'sequelize';
import redis from '../config/redis';
import { Booking, Job, User } from '../models';
import { BookingStatus, NotificationType } from '../types';
import { updateBookingStatus } from '../services/booking.state';
import * as matchingService from '../services/matching.service';
import { addMatchingJob, addMatchingJobDelayed } from './matching.queue';
import { addTimeoutJob, timeoutQueue } from './timeout.queue';
import sequelize from '../config/sequelize';
import logger from '../utils/logger';
import { createNotification } from '../services/notification.service';

const MAX_ATTEMPTS = Number(process.env.MAX_MATCHING_ATTEMPTS) || 3;

async function notifyAdminBookingFailed(bookingId: string): Promise<void> {
  const admins = await User.findAll({
    where: { role: 'ADMIN' },
    attributes: ['id'],
  });
  for (const admin of admins) {
    await createNotification({
      userId: admin.id as any,
      type: NotificationType.JOB_ASSIGNED,
      title: 'Booking failed matching',
      message: `Booking ${bookingId} failed matching — manual assignment required`,
    });
  }
}

export function startMatchingWorker(): Worker {
  const worker = new Worker(
    'matching',
    async (job) => {
      const { bookingId } = job.data as { bookingId: string };

      const booking = await Booking.findByPk(bookingId, {
        include: [
          { association: 'service' as any },
          { association: 'customer' },
        ],
      });

      if (!booking) {
        logger.warn('Matching job: booking not found', { bookingId });
        return;
      }

      if (booking.status !== BookingStatus.MATCHING) {
        logger.info('Matching job: booking no longer in MATCHING, skip', {
          bookingId,
          status: booking.status,
        });
        return;
      }

      if (booking.matching_attempts >= MAX_ATTEMPTS) {
        await updateBookingStatus(bookingId, BookingStatus.FAILED);
        await notifyAdminBookingFailed(bookingId);
        logger.info('Matching job: max attempts reached, marked FAILED', {
          bookingId,
        });
        return;
      }

      const candidates = await matchingService.findCandidates(booking);
      if (candidates.length === 0) {
        await booking.increment('matching_attempts');
        const nextAttempts = booking.matching_attempts + 1;
        if (nextAttempts >= MAX_ATTEMPTS) {
          await updateBookingStatus(bookingId, BookingStatus.FAILED);
          await notifyAdminBookingFailed(bookingId);
          logger.info('Matching job: no candidates, max attempts, FAILED', {
            bookingId,
          });
        } else {
          await addMatchingJobDelayed(bookingId, 60000);
          logger.info('Matching job: no candidates, requeue in 60s', {
            bookingId,
          });
        }
        return;
      }

      const ranked = await matchingService.scoreAndRank(
        candidates,
        booking,
        new Date(booking.scheduled_time)
      );
      const attempted = await matchingService.getAttemptedTechnicianIds(
        bookingId
      );
      const available = ranked.filter(
        (r) => !attempted.includes(r.technician.id)
      );

      if (available.length === 0) {
        await booking.increment('matching_attempts');
        const nextAttempts = booking.matching_attempts + 1;
        if (nextAttempts >= MAX_ATTEMPTS) {
          await updateBookingStatus(bookingId, BookingStatus.FAILED);
          await notifyAdminBookingFailed(bookingId);
        } else {
          await addMatchingJobDelayed(bookingId, 60000);
        }
        return;
      }

      const top = available[0];
      const technicianId = top.technician.id;

      await sequelize.transaction(async (t: SequelizeTransaction) => {
        await Job.create(
          {
            booking_id: bookingId,
            technician_id: technicianId,
          },
          { transaction: t }
        );
        await updateBookingStatus(bookingId, BookingStatus.ASSIGNED, t);
        const b = await Booking.findByPk(bookingId, {
          transaction: t,
        });
        if (b) {
          b.matching_attempts = (b.matching_attempts || 0) + 1;
          await b.save({ transaction: t });
        }
      });

      const updated = await Booking.findByPk(bookingId);
      const attempt = updated?.matching_attempts ?? booking.matching_attempts + 1;

      await matchingService.addAttemptedTechnician(bookingId, technicianId);
      await matchingService.notifyTechnician(technicianId, bookingId, attempt);
      await addTimeoutJob(bookingId, technicianId, attempt, 30000);

      logger.info('Matching job: assigned technician', {
        bookingId,
        technicianId,
        attempt,
      });
    },
    {
      connection: redis as any,
      concurrency: 5,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error('Matching worker job failed', {
      jobId: job?.id,
      bookingId: job?.data?.bookingId,
      error: err?.message,
    });
  });

  return worker;
}
