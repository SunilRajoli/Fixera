import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError';
import { JwtPayload } from '../types';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }

  const token = authHeader.substring('Bearer '.length);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return next(new AppError('JWT secret not configured', 500, 'CONFIG_ERROR'));
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    return next();
  } catch {
    return next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
}

