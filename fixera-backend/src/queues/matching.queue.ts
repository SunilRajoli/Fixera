import { Queue, JobsOptions } from 'bullmq';
import redis from '../config/redis';

const queueName = 'matching';

export const matchingQueue = new Queue(queueName, {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 30000 },
    removeOnComplete: true,
    removeOnFail: false,
  } as JobsOptions,
});

export async function addMatchingJob(bookingId: string): Promise<void> {
  await matchingQueue.add(
    'matching',
    { bookingId },
    { jobId: `matching-${bookingId}` }
  );
}

export async function addMatchingJobDelayed(
  bookingId: string,
  delayMs: number
): Promise<void> {
  await matchingQueue.add(
    'matching',
    { bookingId },
    { jobId: `matching-${bookingId}`, delay: delayMs }
  );
}
