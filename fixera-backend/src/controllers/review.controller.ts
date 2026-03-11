import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as reviewService from '../services/review.service';
import { success as successResponse, error as errorResponse } from '../utils/response';
import AppError from '../utils/AppError';

export async function createReview(
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

    const { bookingId, rating, comment } = req.body as {
      bookingId: string;
      rating: number;
      comment?: string;
    };

    const ipHeader = (req.headers['x-forwarded-for'] ||
      req.ip ||
      '') as string;
    const ipAddress = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader.split(',')[0].trim();

    const review = await reviewService.createReview({
      bookingId,
      customerId: req.user.userId,
      rating,
      comment,
      ipAddress,
    });

    successResponse(res, review, 'Review created', 201);
  } catch (err) {
    next(err);
  }
}

export async function getReview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const bookingId = String(req.params.bookingId);
    const review = await reviewService.getReview(bookingId);
    successResponse(res, review, 'Review');
  } catch (err) {
    next(err);
  }
}

export async function getTechnicianReviews(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const technicianId = String(req.params.technicianId);
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const data = await reviewService.getTechnicianReviews(technicianId, page, limit);
    successResponse(res, data, 'Technician reviews');
  } catch (err) {
    next(err);
  }
}

