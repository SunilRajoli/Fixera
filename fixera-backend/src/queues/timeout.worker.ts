import { Worker } from 'bullmq';
import redis from '../config/redis';
import { Booking, Technician } from '../models';
import { BookingStatus } from '../types';
import { updateBookingStatus } from '../services/booking.state';
import { addMatchingJob } from './matching.queue';
import logger from '../utils/logger';

export function startTimeoutWorker(): Worker {
  const worker = new Worker(
    'matching-timeout',
    async (job) => {
      const { bookingId, technicianId, attempt } = job.data as {
        bookingId: string;
        technicianId: string;
        attempt: number;
      };

      const booking = await Booking.findByPk(bookingId);
      if (!booking) {
        logger.warn('Timeout job: booking not found', { bookingId });
        return;
      }
      if (booking.status !== BookingStatus.ASSIGNED) {
        logger.info('Timeout job: technician already responded, skip', {
          bookingId,
          status: booking.status,
        });
        return;
      }
      if (booking.matching_attempts !== attempt) {
        logger.info('Timeout job: stale attempt, skip', {
          bookingId,
          attempt,
          current: booking.matching_attempts,
        });
        return;
      }

      const technician = await Technician.findByPk(technicianId);
      if (technician) {
        const rate = Math.max(
          0,
          Number(technician.acceptance_rate || 1) - 0.02
        );
        technician.acceptance_rate = String(rate);
        await technician.save();
      }

      await updateBookingStatus(bookingId, BookingStatus.REASSIGNING);
      await addMatchingJob(bookingId);

      logger.info('Timeout job: technician did not respond, reassigning', {
        bookingId,
        technicianId,
      });
    },
    { connection: redis as any }
  );

  worker.on('failed', (job, err) => {
    logger.error('Timeout worker job failed', {
      jobId: job?.id,
      error: err?.message,
    });
  });

  return worker;
}
