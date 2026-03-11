import { NextFunction, Request, Response } from 'express';
import * as notificationService from '../services/notification.service';
import { success as successResponse } from '../utils/response';
import AppError from '../utils/AppError';

export async function getNotifications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const data = await notificationService.getNotifications(req.user.userId, page, limit);
    successResponse(res, data, 'Notifications');
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const id = String(req.params.id);
    await notificationService.markAsRead(id, req.user.userId);
    successResponse(res, null, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    await notificationService.markAllAsRead(req.user.userId);
    successResponse(res, null, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
}

