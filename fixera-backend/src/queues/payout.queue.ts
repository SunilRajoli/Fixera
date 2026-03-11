import { Queue, JobsOptions } from 'bullmq';
import redis from '../config/redis';

const queueName = 'payouts';

export const payoutQueue = new Queue(queueName, {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 300000 },
    removeOnComplete: true,
    removeOnFail: false,
  } as JobsOptions,
});

export async function addPayoutJob(payoutId: string): Promise<void> {
  await payoutQueue.add(
    'payout',
    { payoutId },
    { jobId: `payout-${payoutId}` }
  );
}

