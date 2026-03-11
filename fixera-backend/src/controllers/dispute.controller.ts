import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as disputeService from '../services/dispute.service';
import { success as successResponse, error as errorResponse } from '../utils/response';
import AppError from '../utils/AppError';
import { DisputeResolution, DisputeStatus, UserRole } from '../types';

export async function raiseDispute(
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

    const { bookingId, reason } = req.body as { bookingId: string; reason: string };

    const dispute = await disputeService.raiseDispute(bookingId, req.user.userId, reason);
    successResponse(res, dispute, 'Dispute raised', 201);
  } catch (err) {
    next(err);
  }
}

export async function getDispute(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const id = String(req.params.id);
    const dispute = await disputeService.getDispute(id, req.user.userId, req.user.role);
    successResponse(res, dispute, 'Dispute');
  } catch (err) {
    next(err);
  }
}

export async function updateDisputeStatus(
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

    const id = String(req.params.id);
    const { status, note } = req.body as { status: DisputeStatus; note?: string };

    const updated = await disputeService.updateDisputeStatus(id, req.user.userId, status, note);
    successResponse(res, updated, 'Dispute status updated');
  } catch (err) {
    next(err);
  }
}

export async function resolveDispute(
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

    const id = String(req.params.id);
    const { resolution, customerRefundAmount, technicianAmount, note } = req.body as {
      resolution: DisputeResolution;
      customerRefundAmount?: number;
      technicianAmount?: number;
      note: string;
    };

    const dispute = await disputeService.resolveDispute(id, req.user.userId, resolution, {
      customerRefundAmount,
      technicianAmount,
      note,
    });
    successResponse(res, dispute, 'Dispute resolved');
  } catch (err) {
    next(err);
  }
}

export async function getDisputeList(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const statusParam = req.query.status as string | undefined;
    const status = statusParam as DisputeStatus | undefined;

    const data = await disputeService.getDisputeList({ status, page, limit });
    successResponse(res, data, 'Disputes');
  } catch (err) {
    next(err);
  }
}

