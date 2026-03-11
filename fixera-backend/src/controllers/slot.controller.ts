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

/** GET /api/slots/for-booking?date=YYYY-MM-DD&startTime=09:00 — returns one available slot id for customer booking. */
export async function getSlotForBooking(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const date = String(req.query.date ?? '');
    const startTime = String(req.query.startTime ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime)) {
      errorResponse(res, 'Invalid date or startTime. Use date=YYYY-MM-DD and startTime=HH:MM', 400);
      return;
    }
    const slot = await slotService.findSlotForBooking(date, startTime);
    if (!slot) {
      errorResponse(res, 'No slot available for this date and time', 404);
      return;
    }
    successResponse(res, { slotId: slot.id }, 'Slot available');
  } catch (err) {
    next(err);
  }
}

