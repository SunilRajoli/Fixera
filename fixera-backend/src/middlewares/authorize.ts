import { NextFunction, Request, Response } from 'express';
import AppError from '../utils/AppError';
import { UserRole } from '../types';

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
    }

    return next();
  };
}

