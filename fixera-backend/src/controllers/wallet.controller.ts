import { NextFunction, Request, Response } from 'express';
import * as walletService from '../services/wallet.service';
import { success as successResponse } from '../utils/response';
import AppError from '../utils/AppError';
import { Technician } from '../models';

async function getTechnicianId(userId: string): Promise<string> {
  const technician = await Technician.findOne({ where: { user_id: userId } });
  if (!technician) {
    throw new AppError('Technician profile not found', 403, 'FORBIDDEN');
  }
  return technician.id;
}

export async function getWalletBalance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }
    const technicianId = await getTechnicianId(req.user.userId);
    const balance = await walletService.getWalletBalance(technicianId);
    successResponse(res, balance, 'Wallet balance');
  } catch (err) {
    next(err);
  }
}

export async function getTransactionHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }
    const technicianId = await getTechnicianId(req.user.userId);
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const data = await walletService.getTransactionHistory(
      technicianId,
      page,
      limit
    );
    successResponse(res, data, 'Transaction history');
  } catch (err) {
    next(err);
  }
}

export async function requestWithdrawal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }
    const technicianId = await getTechnicianId(req.user.userId);
    const payout = await walletService.requestWithdrawal(technicianId);
    successResponse(res, payout, 'Withdrawal requested');
  } catch (err) {
    next(err);
  }
}

