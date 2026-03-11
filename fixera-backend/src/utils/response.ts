import { Response } from 'express';

interface ErrorBody {
  code?: string;
  details?: unknown;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  error: ErrorBody | null;
}

export function success<T>(
  res: Response,
  data: T,
  message = 'OK',
  statusCode = 200
): Response<ApiResponse<T>> {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    error: null,
  });
}

export function error(
  res: Response,
  message: string,
  statusCode = 400,
  errorCode?: string,
  details?: unknown
): Response<ApiResponse<null>> {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    error: {
      code: errorCode,
      details,
    },
  });
}

