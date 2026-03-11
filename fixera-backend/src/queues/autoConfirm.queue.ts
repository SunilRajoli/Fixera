import { Queue, Worker, JobsOptions } from 'bullmq';
import { BookingStatus } from '../types';
import { Booking } from '../models';
import { updateBookingStatus } from '../services/booking.state';
import logger from '../utils/logger';
import redis from '../config/redis';

const queueName = 'auto-confirm-queue';

export const autoConfirmQueue = new Queue(queueName, {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 60000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  } as JobsOptions,
});

export async function scheduleAutoConfirm(
  bookingId: string,
  confirmAt: Date
): Promise<void> {
  const delay = Math.max(0, confirmAt.getTime() - Date.now());

  await autoConfirmQueue.add(
    'auto-confirm',
    { bookingId },
    {
      delay,
      jobId: `auto-confirm-${bookingId}`,
    }
  );
}

export function startAutoConfirmWorker(): Worker {
  const worker = new Worker(
    queueName,
    async (job) => {
      const { bookingId } = job.data as { bookingId: string };
      const booking = await Booking.findByPk(bookingId);
      if (!booking) {
        logger.warn('Auto-confirm booking not found', { bookingId });
        return;
      }

      if (booking.status === BookingStatus.PAYMENT_HELD) {
        await updateBookingStatus(bookingId, BookingStatus.CONFIRMED);
        logger.info('Auto-confirmed booking', { bookingId });
      }
    },
    { connection: redis as any }
  );

  worker.on('failed', (job, err) => {
    logger.error('Auto-confirm job failed', {
      jobId: job?.id,
      error: err?.message,
    });
  });

  return worker;
}
