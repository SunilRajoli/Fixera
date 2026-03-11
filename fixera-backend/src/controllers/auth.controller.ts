import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as authService from '../services/auth.service';
import { error as errorResponse, success as successResponse } from '../utils/response';
import AppError from '../utils/AppError';
import { UserRole } from '../types';

export async function sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return void errorResponse(res, 'Validation error', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { phone } = req.body as { phone: string };
    await authService.login(phone);
    successResponse(res, null, 'OTP sent');
  } catch (err) {
    next(err);
  }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return void errorResponse(res, 'Validation error', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { phone, name, role } = req.body as {
      phone: string;
      name: string;
      role: UserRole;
    };

    const result = await authService.register(phone, name, role);
    successResponse(res, result, 'Registered successfully', 201);
  } catch (err) {
    next(err);
  }
}

export async function verifyLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return void errorResponse(res, 'Validation error', 400, 'VALIDATION_ERROR', errors.array());
    }

    const { phone, code } = req.body as { phone: string; code: string };
    const result = await authService.verifyLogin(phone, code);
    successResponse(res, result, 'Login verified');
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const user = await authService.getMe(req.user.userId);
    successResponse(res, user, 'Current user');
  } catch (err) {
    next(err);
  }
}

