import { NextFunction, Request, Response } from 'express';
import logger from '../utils/logger';
import AppError from '../utils/AppError';
import { error as errorResponse } from '../utils/response';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): Response | void {
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message}`, { statusCode: err.statusCode, errorCode: err.errorCode });
    return errorResponse(res, err.message, err.statusCode, err.errorCode);
  }

  logger.error('Unexpected error', {
    error: err instanceof Error ? err.message : String(err),
  });

  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err instanceof Error
      ? err.message
      : 'Internal server error';

  return errorResponse(res, message, 500, 'INTERNAL_SERVER_ERROR');
}

