import { Worker } from 'bullmq';
import redis from '../config/redis';
import { releaseLockedFunds } from '../services/wallet.service';
import logger from '../utils/logger';

export function startFundReleaseWorker(): Worker {
  const worker = new Worker(
    'fund-release',
    async (job) => {
      const { bookingId } = job.data as { bookingId: string };
      try {
        await releaseLockedFunds(bookingId);
        logger.info('Funds released by worker', { bookingId });
      } catch (err) {
        logger.error('FundRelease worker error', {
          bookingId,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    },
    { connection: redis as any }
  );

  worker.on('failed', (job, err) => {
    logger.error('FundRelease worker job failed', {
      jobId: job?.id,
      error: err?.message,
    });
  });

  return worker;
}

