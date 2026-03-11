import { NextFunction, Request, Response } from 'express';
import * as slotService from '../services/slot.service';
import { success as successResponse, error as errorResponse } from '../utils/response';
import AppError from '../utils/AppError';

export async function getAvailableSlots(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const technicianId = String(req.params.technicianId);
    const date = String(req.params.date);
    const slots = await slotService.getAvailableSlots(technicianId, date);
    successResponse(res, slots, 'Available slots');
  } catch (err) {
    next(err);
  }
}

export async function generateSlots(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const { date } = req.body as { date: string };

    const technicianId =
      (req as any).technicianId || req.user.userId;

    const slots = await slotService.generateSlots(technicianId, date);
    successResponse(res, slots, 'Slots generated');
  } catch (err) {
    next(err);
  }
}

