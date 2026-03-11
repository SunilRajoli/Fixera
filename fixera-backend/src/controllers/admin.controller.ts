import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as adminService from '../services/admin.service';
import * as paymentService from '../services/payment.service';
import { success as successResponse, error as errorResponse } from '../utils/response';
import AppError from '../utils/AppError';
import { PayoutStatus } from '../types';

export async function manualAssign(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return void errorResponse(res, 'Validation error', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { technicianId } = req.body as { technicianId: string };
    const bookingId = String(req.params.id);

    const booking = await adminService.manualAssign(bookingId, technicianId);
    successResponse(res, booking, 'Technician assigned');
  } catch (err) {
    next(err);
  }
}

export async function processRefund(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return void errorResponse(res, 'Validation error', 400, 'VALIDATION_ERROR', errors.array());
    }

    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const bookingId = String(req.params.id);
    const { amount, reason } = req.body as { amount: number; reason: string };

    const payment = await paymentService.processRefund(
      bookingId,
      req.user.userId,
      amount,
      reason
    );
    successResponse(res, payment, 'Refund processed');
  } catch (err) {
    next(err);
  }
}

export async function getPayouts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const statusParam = req.query.status as string | undefined;
    const status = statusParam as PayoutStatus | undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const data = await adminService.getPayouts(status, page, limit);
    successResponse(res, data, 'Payouts');
  } catch (err) {
    next(err);
  }
}

export async function getDashboardStats(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await adminService.getDashboardStats();
    successResponse(res, data, 'Dashboard stats');
  } catch (err) {
    next(err);
  }
}

export async function getTechnicianPerformance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const data = await adminService.getTechnicianPerformance(page, limit);
    successResponse(res, data, 'Technician performance');
  } catch (err) {
    next(err);
  }
}

export async function verifyTechnician(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return void errorResponse(res, 'Validation error', 400, 'VALIDATION_ERROR', errors.array());
    }

    const technicianId = String(req.params.id);
    const { status, note } = req.body as { status: any; note?: string };

    const technician = await adminService.verifyTechnician(technicianId, status, note);
    successResponse(res, technician, 'Technician verification updated');
  } catch (err) {
    next(err);
  }
}

export async function toggleTechnicianStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return void errorResponse(res, 'Validation error', 400, 'VALIDATION_ERROR', errors.array());
    }

    const technicianId = String(req.params.id);
    const { isActive } = req.body as { isActive: boolean };

    await adminService.toggleTechnicianStatus(technicianId, isActive);
    successResponse(res, null, 'Technician status updated');
  } catch (err) {
    next(err);
  }
}

