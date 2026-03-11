import { Namespace, Socket } from 'socket.io';
import * as bookingService from '../../services/booking.service';
import { SocketData } from '../socket.server';
import { UserRole } from '../../types';
import logger from '../../utils/logger';

export function registerAdminHandlers(nsp: Namespace, socket: Socket): void {
  const data = socket.data as SocketData;
  const userId = data.userId;

  socket.join(`user:${userId}`);
  socket.join('admin:room');
  logger.info('Admin connected', { userId });

  socket.on('admin:join-booking', async (payload: { bookingId: string }) => {
    try {
      const { bookingId } = payload || {};
      if (!bookingId) {
        socket.emit('error', { message: 'bookingId required', code: 'VALIDATION_ERROR' });
        return;
      }
      await bookingService.getBooking(bookingId, userId, UserRole.ADMIN);
      socket.join(`booking:${bookingId}`);
      socket.emit('booking:joined', { bookingId, timestamp: new Date() });
    } catch (err: any) {
      socket.emit('error', {
        message: err?.message || 'Failed to join booking',
        code: err?.code || 'ERROR',
      });
    }
  });

  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    logger.info('Admin disconnected', { userId });
  });
}
