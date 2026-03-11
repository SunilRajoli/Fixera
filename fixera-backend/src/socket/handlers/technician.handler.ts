import { Namespace, Socket } from 'socket.io';
import { Technician, TechnicianLocation, Job, Booking } from '../../models';
import * as jobService from '../../services/job.service';
import * as bookingService from '../../services/booking.service';
import { SocketData } from '../socket.server';
import { UserRole } from '../../types';
import redis from '../../config/redis';
import logger from '../../utils/logger';

const LOCATION_KEY = (technicianId: string) => `location:${technicianId}`;
const LOCATION_DB_SYNC_KEY = (technicianId: string) => `location:db-sync:${technicianId}`;
const LOCATION_TTL = 60;
const DB_SYNC_TTL = 15;

async function getTechnicianId(userId: string): Promise<string | null> {
  const tech = await Technician.findOne({ where: { user_id: userId } });
  return tech?.id ?? null;
}

export function registerTechnicianHandlers(nsp: Namespace, socket: Socket): void {
  const data = socket.data as SocketData;
  const userId = data.userId;

  socket.join(`user:${userId}`);

  let technicianId: string | null = null;
  (async () => {
    technicianId = await getTechnicianId(userId);
    if (technicianId) {
      socket.join(`technician:${technicianId}`);
      await Technician.update(
        { is_online: true },
        { where: { id: technicianId } }
      );
    }
  })();

  logger.info('Technician connected', { userId });

  socket.on('booking:join', async (payload: { bookingId: string }) => {
    try {
      const { bookingId } = payload || {};
      if (!bookingId) {
        socket.emit('error', { message: 'bookingId required', code: 'VALIDATION_ERROR' });
        return;
      }
      await bookingService.getBooking(bookingId, userId, UserRole.TECHNICIAN);
      socket.join(`booking:${bookingId}`);
      socket.emit('booking:joined', { bookingId, timestamp: new Date() });
    } catch (err: any) {
      socket.emit('error', {
        message: err?.message || 'Failed to join booking',
        code: err?.code || 'ERROR',
      });
    }
  });

  const withTechId = async (
    payload: { jobId: string },
    fn: (jobId: string, techId: string) => Promise<any>
  ) => {
    const tid = technicianId ?? (await getTechnicianId(userId));
    if (!tid) {
      socket.emit('error', { message: 'Technician profile not found', code: 'FORBIDDEN' });
      return;
    }
    try {
      const result = await fn(payload.jobId, tid);
      return result;
    } catch (err: any) {
      socket.emit('error', {
        message: err?.message || 'Operation failed',
        code: err?.code || 'ERROR',
      });
    }
  };

  socket.on('job:accept', async (payload: { jobId: string }) => {
    const tid = technicianId ?? (await getTechnicianId(userId));
    if (!tid) {
      socket.emit('error', { message: 'Technician profile not found', code: 'FORBIDDEN' });
      return;
    }
    try {
      const job = await jobService.acceptJob(payload?.jobId || '', tid);
      const booking = await Booking.findByPk(job.booking_id, {
        include: [{ association: 'job', include: [{ association: 'technician', include: ['user'] }] }],
      });
      const b = booking as any;
      const emitter = require('../socket.emitter');
      emitter.emitBookingStatusChanged(job.booking_id, {
        status: 'ACCEPTED',
        bookingId: job.booking_id,
        technician: b?.job?.technician?.user
          ? { name: b.job.technician.user.name, phone: b.job.technician.user.phone }
          : undefined,
      });
    } catch (err: any) {
      socket.emit('error', { message: err?.message || 'Accept failed', code: err?.code || 'ERROR' });
    }
  });

  socket.on('job:reject', async (payload: { jobId: string }) => {
    const tid = technicianId ?? (await getTechnicianId(userId));
    if (!tid) {
      socket.emit('error', { message: 'Technician profile not found', code: 'FORBIDDEN' });
      return;
    }
    try {
      await jobService.rejectJob(payload?.jobId || '', tid);
      const emitter = require('../socket.emitter');
      emitter.emitToTechnician(userId, 'job:reassigned', { jobId: payload?.jobId, timestamp: new Date() });
    } catch (err: any) {
      socket.emit('error', { message: err?.message || 'Reject failed', code: err?.code || 'ERROR' });
    }
  });

  socket.on('job:start-travel', async (payload: { jobId: string }) => {
    const tid = technicianId ?? (await getTechnicianId(userId));
    if (!tid) {
      socket.emit('error', { message: 'Technician profile not found', code: 'FORBIDDEN' });
      return;
    }
    try {
      await jobService.startTravel(payload?.jobId || '', tid);
      const emitter = require('../socket.emitter');
      emitter.emitBookingStatusChanged(
        (await Job.findByPk(payload?.jobId))?.booking_id || '',
        { status: 'ON_THE_WAY', bookingId: (await Job.findByPk(payload?.jobId))?.booking_id }
      );
    } catch (err: any) {
      socket.emit('error', { message: err?.message || 'Start travel failed', code: err?.code || 'ERROR' });
    }
  });

  socket.on('job:start-job', async (payload: { jobId: string }) => {
    const tid = technicianId ?? (await getTechnicianId(userId));
    if (!tid) {
      socket.emit('error', { message: 'Technician profile not found', code: 'FORBIDDEN' });
      return;
    }
    try {
      await jobService.startJob(payload?.jobId || '', tid);
      const j = await Job.findByPk(payload?.jobId);
      const emitter = require('../socket.emitter');
      if (j) emitter.emitBookingStatusChanged(j.booking_id, { status: 'IN_PROGRESS', bookingId: j.booking_id });
    } catch (err: any) {
      socket.emit('error', { message: err?.message || 'Start job failed', code: err?.code || 'ERROR' });
    }
  });

  socket.on('job:complete', async (payload: { jobId: string }) => {
    const tid = technicianId ?? (await getTechnicianId(userId));
    if (!tid) {
      socket.emit('error', { message: 'Technician profile not found', code: 'FORBIDDEN' });
      return;
    }
    try {
      const job = await jobService.completeJob(payload?.jobId || '', tid);
      const booking = await Booking.findByPk(job.booking_id);
      const emitter = require('../socket.emitter');
      emitter.emitBookingStatusChanged(job.booking_id, {
        status: 'COMPLETED',
        bookingId: job.booking_id,
        autoConfirmAt: booking?.auto_confirm_at,
      });
    } catch (err: any) {
      socket.emit('error', { message: err?.message || 'Complete failed', code: err?.code || 'ERROR' });
    }
  });

  socket.on(
    'location:update',
    async (payload: { latitude: number; longitude: number; bookingId: string }) => {
      const tid = technicianId ?? (await getTechnicianId(userId));
      if (!tid) return;
      const { latitude, longitude, bookingId } = payload || {};
      if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number' ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        socket.emit('error', { message: 'Invalid coordinates', code: 'VALIDATION_ERROR' });
        return;
      }
      const loc = await TechnicianLocation.findOne({ where: { technician_id: tid } });
      if (!loc || !loc.tracking_active) return;

      const now = Date.now();
      const cachePayload = JSON.stringify({ latitude, longitude, updatedAt: now });
      await redis.setex(LOCATION_KEY(tid), LOCATION_TTL, cachePayload);

      const syncKey = LOCATION_DB_SYNC_KEY(tid);
      const exists = await redis.get(syncKey);
      if (!exists) {
        const [loc] = await TechnicianLocation.findOrCreate({
          where: { technician_id: tid },
          defaults: {
            technician_id: tid,
            booking_id: bookingId || null,
            latitude: String(latitude),
            longitude: String(longitude),
            tracking_active: true,
          } as any,
        });
        loc.booking_id = bookingId || null;
        loc.latitude = String(latitude);
        loc.longitude = String(longitude);
        loc.tracking_active = true;
        await loc.save();
        await redis.setex(syncKey, DB_SYNC_TTL, '1');
      }

      const emitter = require('../socket.emitter');
      emitter.emitToBookingRoom(bookingId, 'technician:location', {
        technicianId: tid,
        latitude,
        longitude,
        timestamp: now,
      });
    }
  );

  socket.on('technician:go-online', async () => {
    const tid = technicianId ?? (await getTechnicianId(userId));
    if (tid) {
      await Technician.update({ is_online: true }, { where: { id: tid } });
    }
    socket.emit('technician:status', { isOnline: true, timestamp: new Date() });
  });

  socket.on('technician:go-offline', async () => {
    const tid = technicianId ?? (await getTechnicianId(userId));
    if (tid) {
      await Technician.update({ is_online: false }, { where: { id: tid } });
    }
    socket.emit('technician:status', { isOnline: false, timestamp: new Date() });
  });

  socket.on('disconnect', async () => {
    const tid = technicianId ?? (await getTechnicianId(userId));
    if (tid) {
      await Technician.update({ is_online: false }, { where: { id: tid } });
    }
    logger.info('Technician disconnected', { userId });
  });
}
