import { Namespace, Socket } from 'socket.io';
import * as bookingService from '../../services/booking.service';
import { SocketData } from '../socket.server';
import { UserRole } from '../../types';
import logger from '../../utils/logger';

export function registerCustomerHandlers(nsp: Namespace, socket: Socket): void {
  const data = socket.data as SocketData;
  const userId = data.userId;

  socket.join(`user:${userId}`);
  logger.info('Customer connected', { userId });

  socket.on('booking:join', async (payload: { bookingId: string }) => {
    try {
      const { bookingId } = payload || {};
      if (!bookingId) {
        socket.emit('error', { message: 'bookingId required', code: 'VALIDATION_ERROR' });
        return;
      }
      await bookingService.getBooking(bookingId, userId, UserRole.CUSTOMER);
      socket.join(`booking:${bookingId}`);
      socket.emit('booking:joined', { bookingId, timestamp: new Date() });
    } catch (err: any) {
      socket.emit('error', {
        message: err?.message || 'Failed to join booking',
        code: err?.code || 'ERROR',
      });
    }
  });

  socket.on('booking:leave', (payload: { bookingId: string }) => {
    const { bookingId } = payload || {};
    if (bookingId) socket.leave(`booking:${bookingId}`);
  });

  socket.on('booking:confirm', async (payload: { bookingId: string }) => {
    try {
      const { bookingId } = payload || {};
      if (!bookingId) {
        socket.emit('error', { message: 'bookingId required', code: 'VALIDATION_ERROR' });
        return;
      }
      await bookingService.confirmBooking(bookingId, userId);
      const emitter = require('../socket.emitter');
      emitter.emitBookingStatusChanged(bookingId, { status: 'CONFIRMED', bookingId });
      const full = await bookingService.getBooking(bookingId, userId, UserRole.CUSTOMER);
      const job = (full as any).job;
      const tech = job?.technician;
      if (tech?.user_id) {
        const walletService = require('../../services/wallet.service');
        const wallet = await walletService.getWalletBalance(tech.id);
        emitter.emitToUser(tech.user_id, 'wallet:updated', {
          balance: wallet.balance,
          locked_balance: wallet.locked_balance,
        });
      }
    } catch (err: any) {
      socket.emit('error', {
        message: err?.message || 'Confirm failed',
        code: err?.code || 'ERROR',
      });
    }
  });

  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    logger.info('Customer disconnected', { userId });
  });
}
