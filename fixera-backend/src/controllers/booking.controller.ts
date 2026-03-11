import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as bookingService from '../services/booking.service';
import { success as successResponse, error as errorResponse } from '../utils/response';
import AppError from '../utils/AppError';
import { PaymentMethod, UserRole } from '../types';

export async function createBooking(
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

    const {
      serviceId,
      description,
      address,
      latitude,
      longitude,
      scheduledTime,
      slotId,
      paymentMethod,
    } = req.body as {
      serviceId: string;
      description: string;
      address: string;
      latitude: number;
      longitude: number;
      scheduledTime: string;
      slotId: string;
      paymentMethod: PaymentMethod;
    };

    const booking = await bookingService.createBooking({
      customerId: req.user.userId,
      serviceId,
      description,
      address,
      latitude,
      longitude,
      scheduledTime: new Date(scheduledTime),
      slotId,
      paymentMethod,
    });

    successResponse(res, booking, 'Booking created', 201);
  } catch (err) {
    next(err);
  }
}

export async function getBookingList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }
    const bookings = await bookingService.getBookingList(req.user.userId, req.user.role);
    successResponse(res, bookings, 'Bookings list');
  } catch (err) {
    next(err);
  }
}

export async function getBooking(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const booking = await bookingService.getBooking(
      String(req.params.id),
      req.user.userId,
      req.user.role
    );
    successResponse(res, booking, 'Booking details');
  } catch (err) {
    next(err);
  }
}

export async function cancelBooking(
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

    const { reason } = req.body as { reason: string };

    const booking = await bookingService.cancelBooking(
      String(req.params.id),
      req.user.userId,
      req.user.role,
      reason
    );
    successResponse(res, booking, 'Booking cancelled');
  } catch (err) {
    next(err);
  }
}

export async function confirmBooking(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const booking = await bookingService.confirmBooking(String(req.params.id), req.user.userId);
    successResponse(res, booking, 'Booking confirmed');
  } catch (err) {
    next(err);
  }
}

export async function submitRepairEstimate(
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

    const { repairTypeId, repairCost } = req.body as {
      repairTypeId: string;
      repairCost: number;
    };

    const booking = await bookingService.submitRepairEstimate(
      String(req.params.id),
      req.user.userId,
      repairTypeId,
      repairCost
    );
    successResponse(res, booking, 'Repair estimate submitted');
  } catch (err) {
    next(err);
  }
}

export async function getTechnicianLocation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }
    const bookingId = String(req.params.id);
    const location = await bookingService.getTechnicianLocation(
      bookingId,
      req.user.userId,
      req.user.role
    );
    successResponse(res, location, 'Technician location');
  } catch (err) {
    next(err);
  }
}

