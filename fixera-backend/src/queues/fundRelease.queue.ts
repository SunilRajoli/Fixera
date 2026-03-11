import { Queue, JobsOptions } from 'bullmq';
import redis from '../config/redis';

const queueName = 'fund-release';

export const fundReleaseQueue = new Queue(queueName, {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 60000 },
    removeOnComplete: true,
    removeOnFail: false,
  } as JobsOptions,
});

export async function addFundReleaseJob(
  bookingId: string,
  releaseAt: Date
): Promise<void> {
  const delay = Math.max(0, releaseAt.getTime() - Date.now());
  await fundReleaseQueue.add(
    'fund-release',
    { bookingId },
    {
      delay,
      jobId: `fund-release-${bookingId}`,
    }
  );
}

