import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { JwtPayload } from '../types';

export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): void {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    return next(new Error('AUTH_REQUIRED'));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new Error('AUTH_INVALID'));
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    socket.data.userId = payload.userId;
    socket.data.role = payload.role;
    socket.data.phone = payload.phone;
    next();
  } catch {
    next(new Error('AUTH_INVALID'));
  }
}
