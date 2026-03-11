import { Worker } from 'bullmq';
import redis from '../config/redis';
import { Payout, Wallet, Transaction, Technician, User } from '../models';
import { NotificationType, PayoutStatus, TransactionStatus, TransactionType } from '../types';
import sequelize from '../config/sequelize';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { createNotification } from '../services/notification.service';

export function startPayoutWorker(): Worker {
  const worker = new Worker(
    'payouts',
    async (job) => {
      const { payoutId } = job.data as { payoutId: string };

      const payout = await Payout.findByPk(payoutId, {
        include: [{ association: 'technician' }, { association: 'wallet' }],
      });
      if (!payout) {
        logger.warn('Payout job: payout not found', { payoutId });
        return;
      }

      if (payout.status !== PayoutStatus.PENDING) {
        logger.info('Payout job: payout not pending, skip', {
          payoutId,
          status: payout.status,
        });
        return;
      }

      const success = Math.random() > 0.05;

      if (success) {
        await sequelize.transaction(async (t) => {
          payout.status = PayoutStatus.PROCESSED;
          payout.processed_at = new Date();
          payout.bank_ref = `BANK-${uuidv4()}`;

          const debitTrx = await Transaction.findOne({
            where: {
              wallet_id: payout.wallet_id,
              type: TransactionType.DEBIT,
              status: TransactionStatus.PENDING,
            },
            transaction: t,
          } as any);

          if (debitTrx) {
            debitTrx.status = TransactionStatus.COMPLETED;
            await debitTrx.save({ transaction: t });
          }

          await payout.save({ transaction: t });
        });

        const tech = payout.get('technician') as Technician | undefined;
        if (tech?.user_id) {
          await createNotification({
            userId: tech.user_id,
            type: NotificationType.PAYOUT_SENT,
            title: 'Payout processed',
            message: `₹${payout.amount} has been transferred to your bank account.`,
          });
        }

        logger.info('Payout processed successfully', { payoutId });
      } else {
        await sequelize.transaction(async (t) => {
          payout.status = PayoutStatus.FAILED;
          payout.failed_reason = 'Bank transfer failed';
          payout.retry_count = (payout.retry_count || 0) + 1;

          const wallet = await Wallet.findByPk(payout.wallet_id, { transaction: t });
          if (wallet) {
            const balance = Number(wallet.balance) || 0;
            const withdrawn = Number(wallet.total_withdrawn) || 0;
            wallet.balance = String(balance + Number(payout.amount));
            wallet.total_withdrawn = String(withdrawn - Number(payout.amount));
            await wallet.save({ transaction: t });
          }

          const debitTrx = await Transaction.findOne({
            where: {
              wallet_id: payout.wallet_id,
              type: TransactionType.DEBIT,
              status: TransactionStatus.PENDING,
            },
            transaction: t,
          } as any);

          if (debitTrx) {
            debitTrx.status = TransactionStatus.REVERSED;
            await debitTrx.save({ transaction: t });
          }

          await payout.save({ transaction: t });
        });

        const techFail = payout.get('technician') as Technician | undefined;
        if (techFail?.user_id) {
          await createNotification({
            userId: techFail.user_id,
            type: NotificationType.PAYOUT_SENT,
            title: 'Payout failed',
            message:
              'Payout failed. Your balance has been restored. Please retry withdrawal.',
          });
        }

        const admins = await User.findAll({ where: { role: 'ADMIN' } });
        for (const admin of admins as any[]) {
          await createNotification({
            userId: admin.id,
            type: NotificationType.PAYOUT_SENT,
            title: 'Payout failed',
            message: `Payout ${payoutId} failed for technician ${payout.technician_id}. Manual resolution required.`,
          });
        }

        logger.error('Payout failed after all retries', { payoutId });
      }
    },
    { connection: redis as any, concurrency: 3 }
  );

  worker.on('failed', (job, err) => {
    logger.error('Payout worker job failed', {
      jobId: job?.id,
      error: err?.message,
    });
  });

  return worker;
}

