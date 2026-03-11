import { Transaction as SequelizeTransaction, Op } from 'sequelize';
import sequelize from '../config/sequelize';
import { Wallet, Transaction, Payout, Technician } from '../models';
import { TransactionStatus, TransactionType, PayoutStatus } from '../types';
import AppError from '../utils/AppError';
import logger from '../utils/logger';
import { addPayoutJob } from '../queues/payout.queue';

function toAmount(value: number): number {
  return parseFloat(value.toFixed(2));
}

export async function getWalletBalance(technicianId: string): Promise<{
  balance: number;
  locked_balance: number;
  total_earned: number;
  total_withdrawn: number;
  pending_withdrawal: boolean;
}> {
  const wallet = await Wallet.findOne({ where: { technician_id: technicianId } });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');
  }

  const pendingPayout = await Payout.findOne({
    where: { technician_id: technicianId, status: PayoutStatus.PENDING },
  });

  return {
    balance: Number(wallet.balance) || 0,
    locked_balance: Number(wallet.locked_balance) || 0,
    total_earned: Number(wallet.total_earned) || 0,
    total_withdrawn: Number(wallet.total_withdrawn) || 0,
    pending_withdrawal: !!pendingPayout,
  };
}

export async function getTransactionHistory(
  technicianId: string,
  page = 1,
  limit = 20
): Promise<{ transactions: Transaction[]; total: number; pages: number }> {
  const wallet = await Wallet.findOne({ where: { technician_id: technicianId } });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await Transaction.findAndCountAll({
    where: { wallet_id: wallet.id },
    order: [['created_at', 'DESC']],
    offset,
    limit,
  });

  const pages = Math.ceil(count / limit) || 1;
  return { transactions: rows, total: count, pages };
}

export async function releaseLockedFunds(bookingId: string): Promise<void> {
  const trx = await Transaction.findOne({
    where: {
      booking_id: bookingId,
      type: TransactionType.CREDIT,
      status: TransactionStatus.PENDING,
    },
  });

  if (!trx) {
    logger.warn('releaseLockedFunds: no pending CREDIT transaction found', { bookingId });
    return;
  }

  await sequelize.transaction(async (t: SequelizeTransaction) => {
    const wallet = await Wallet.findByPk(trx.wallet_id, { transaction: t });
    if (!wallet) {
      logger.error('releaseLockedFunds: wallet not found', { walletId: trx.wallet_id });
      return;
    }

    const amount = Number(trx.amount);
    const currentBalance = Number(wallet.balance) || 0;
    const currentLocked = Number(wallet.locked_balance) || 0;

    trx.status = TransactionStatus.COMPLETED;
    await trx.save({ transaction: t });

    wallet.balance = String(toAmount(currentBalance + amount));
    const newLocked = toAmount(currentLocked - amount);
    wallet.locked_balance = String(Math.max(0, newLocked));
    await wallet.save({ transaction: t });
  });

  logger.info('Funds released for booking', { bookingId });
}

export async function requestWithdrawal(technicianId: string): Promise<Payout> {
  const wallet = await Wallet.findOne({ where: { technician_id: technicianId } });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');
  }

  const balance = Number(wallet.balance) || 0;
  if (balance <= 0) {
    throw new AppError('Insufficient balance', 400, 'INSUFFICIENT_BALANCE');
  }

  const pendingPayout = await Payout.findOne({
    where: { technician_id: technicianId, status: PayoutStatus.PENDING },
  });
  if (pendingPayout) {
    throw new AppError(
      'Withdrawal already pending',
      400,
      'WITHDRAWAL_ALREADY_PENDING'
    );
  }

  const now = new Date();
  const pendingInDispute = await Transaction.findOne({
    where: {
      wallet_id: wallet.id,
      status: TransactionStatus.PENDING,
      withdrawable_at: { [Op.gt]: now },
    },
  });

  if (pendingInDispute) {
    throw new AppError(
      'Some funds are still within the 72-hour dispute window',
      400,
      'FUNDS_IN_DISPUTE_WINDOW'
    );
  }

  let payout!: Payout;

  await sequelize.transaction(async (t: SequelizeTransaction) => {
    const amount = toAmount(balance);

    payout = await Payout.create(
      {
        technician_id: technicianId,
        wallet_id: wallet.id,
        amount: String(amount),
        status: PayoutStatus.PENDING,
      },
      { transaction: t }
    );

    await Transaction.create(
      {
        wallet_id: wallet.id,
        booking_id: null,
        type: TransactionType.DEBIT,
        amount: String(amount),
        status: TransactionStatus.PENDING,
        note: 'Withdrawal request',
      },
      { transaction: t }
    );

    const currentBalance = Number(wallet.balance) || 0;
    const currentWithdrawn = Number(wallet.total_withdrawn) || 0;
    wallet.balance = String(toAmount(currentBalance - amount));
    wallet.total_withdrawn = String(toAmount(currentWithdrawn + amount));
    await wallet.save({ transaction: t });
  });

  // enqueue payout job
  await addPayoutJob(payout.id);

  return payout;
}

