import { getIO, getCustomerNsp, getTechnicianNsp, getAdminNsp } from './socket.server';
import { BookingStatus } from '../types';
import type { Dispute, Booking } from '../models';

function timestamp() {
  return new Date();
}

export function emitBookingStatusChanged(
  bookingId: string,
  data: { status: BookingStatus | string; bookingId: string; [key: string]: any }
): void {
  const payload = { ...data, timestamp: timestamp() };
  try {
    getCustomerNsp().to(`booking:${bookingId}`).emit('booking:status-changed', payload);
    getTechnicianNsp().to(`booking:${bookingId}`).emit('booking:status-changed', payload);
    getAdminNsp().to(`booking:${bookingId}`).emit('booking:status-changed', payload);
  } catch (_) {
    // Socket server may not be initialized (e.g. tests)
  }
}

export function emitToUser(userId: string, event: string, data: object): void {
  try {
    const payload = { ...data, timestamp: timestamp() };
    getCustomerNsp().to(`user:${userId}`).emit(event, payload);
    getTechnicianNsp().to(`user:${userId}`).emit(event, payload);
    getAdminNsp().to(`user:${userId}`).emit(event, payload);
  } catch (_) {}
}

export function emitToTechnician(technicianUserId: string, event: string, data: object): void {
  try {
    getTechnicianNsp()
      .to(`user:${technicianUserId}`)
      .emit(event, { ...data, timestamp: timestamp() });
  } catch (_) {}
}

export function emitToAdmin(event: string, data: object): void {
  try {
    getAdminNsp().to('admin:room').emit(event, { ...data, timestamp: timestamp() });
  } catch (_) {}
}

export function emitToBookingRoom(bookingId: string, event: string, data: object): void {
  try {
    const payload = { ...data, timestamp: timestamp() };
    getCustomerNsp().to(`booking:${bookingId}`).emit(event, payload);
    getTechnicianNsp().to(`booking:${bookingId}`).emit(event, payload);
    getAdminNsp().to(`booking:${bookingId}`).emit(event, payload);
  } catch (_) {}
}

export function emitNewDispute(dispute: Dispute): void {
  emitToAdmin('dispute:new', {
    disputeId: dispute.id,
    bookingId: dispute.booking_id,
    reason: dispute.reason,
  });
}

export function emitNewBookingForMatching(booking: Booking): void {
  emitToAdmin('booking:new', {
    bookingId: booking.id,
    serviceId: booking.service_id,
    scheduledTime: booking.scheduled_time,
  });
}

export function emitJobAssigned(
  technicianUserId: string,
  data: {
    jobId: string;
    bookingId: string;
    service: string;
    scheduledTime: Date;
    address: string;
  }
): void {
  emitToTechnician(technicianUserId, 'job:new-assignment', data);
}
