import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as paymentService from '../services/payment.service';
import { success as successResponse, error as errorResponse } from '../utils/response';
import AppError from '../utils/AppError';
import { PaymentMethod, UserRole } from '../types';

export async function initiateInspectionPayment(
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

    const { bookingId, paymentMethod } = req.body as {
      bookingId: string;
      paymentMethod: PaymentMethod;
    };

    const payment = await paymentService.initiateInspectionPayment(
      bookingId,
      req.user.userId,
      paymentMethod
    );
    successResponse(res, payment, 'Inspection payment captured', 201);
  } catch (err) {
    next(err);
  }
}

export async function initiateRepairPayment(
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

    const { bookingId, paymentMethod } = req.body as {
      bookingId: string;
      paymentMethod: PaymentMethod;
    };

    const payment = await paymentService.initiateRepairPayment(
      bookingId,
      req.user.userId,
      paymentMethod
    );
    successResponse(res, payment, 'Repair payment captured', 201);
  } catch (err) {
    next(err);
  }
}

export async function getInvoice(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const invoice = await paymentService.getInvoice(
      String(req.params.bookingId),
      req.user.userId,
      req.user.role
    );
    successResponse(res, invoice, 'Invoice');
  } catch (err) {
    next(err);
  }
}

