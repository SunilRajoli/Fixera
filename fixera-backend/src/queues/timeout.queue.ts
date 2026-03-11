import { Queue, JobsOptions } from 'bullmq';
import redis from '../config/redis';

const queueName = 'matching-timeout';

export const timeoutQueue = new Queue(queueName, {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  } as JobsOptions,
});

export async function addTimeoutJob(
  bookingId: string,
  technicianId: string,
  attempt: number,
  delayMs: number = 30000
): Promise<void> {
  const jobId = `timeout-${bookingId}-${attempt}`;
  await timeoutQueue.add(
    'timeout',
    { bookingId, technicianId, attempt },
    { jobId, delay: delayMs }
  );
}
