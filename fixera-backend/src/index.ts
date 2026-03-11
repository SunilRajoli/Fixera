import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import app from './app';
import { sequelize } from './models';
import redis from './config/redis';
import logger from './utils/logger';
import { initSocketServer } from './socket/socket.server';
import { startMatchingWorker } from './queues/matching.worker';
import { startTimeoutWorker } from './queues/timeout.worker';
import { startAutoConfirmWorker } from './queues/autoConfirm.queue';
import { startPayoutWorker } from './queues/payout.worker';
import { startFundReleaseWorker } from './queues/fundRelease.worker';

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');

    await redis.ping();
    logger.info('Redis connected');

    startMatchingWorker();
    startTimeoutWorker();
    startAutoConfirmWorker();
    startPayoutWorker();
    startFundReleaseWorker();
    logger.info('Workers started');

    const httpServer = createServer(app);
    initSocketServer(httpServer);
    httpServer.listen(PORT, () => {
      logger.info(`ServiceFlow API running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

void start();
