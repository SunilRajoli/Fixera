import { Op } from 'sequelize';
import {
  Booking,
  Technician,
  Service,
  Job,
  TechnicianLocation,
} from '../models';
import { VerificationStatus, NotificationType } from '../types';
import { calculateDistanceKm } from '../utils/haversine';
import redis from '../config/redis';
import logger from '../utils/logger';
import { createNotification } from './notification.service';

const PENDING_KEY = (bookingId: string) => `matching:pending:${bookingId}`;
const ATTEMPTED_KEY = (bookingId: string) => `matching:attempted:${bookingId}`;
const RESPONSE_TIME_KEY = (technicianId: string) =>
  `technician:response_time:${technicianId}`;

const PENDING_TTL = 35;
const ATTEMPTED_TTL = 600;

export async function findCandidates(booking: Booking): Promise<Technician[]> {
  const scheduled = new Date(booking.scheduled_time);
  const dayStart = new Date(scheduled);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(scheduled);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const activeJobBookingIds = await Booking.findAll({
    where: {
      status: {
        [Op.notIn]: [
          'CANCELLED',
          'FAILED',
          'CLOSED',
          'COMPLETED',
        ],
      },
      scheduled_time: { [Op.gte]: dayStart, [Op.lte]: dayEnd },
      id: { [Op.ne]: booking.id },
    },
    attributes: ['id'],
  }).then((b) => b.map((x) => x.id));

  const busyTechnicianIds =
    activeJobBookingIds.length > 0
      ? await Job.findAll({
          where: { booking_id: { [Op.in]: activeJobBookingIds } },
          attributes: ['technician_id'],
        }).then((j) => [...new Set(j.map((x) => x.technician_id))])
      : [];

  const technicians = await Technician.findAll({
    where: {
      verification_status: VerificationStatus.APPROVED,
      is_online: true,
      ...(busyTechnicianIds.length > 0
        ? { id: { [Op.notIn]: busyTechnicianIds } }
        : {}),
    },
    include: [
      {
        model: Service,
        as: 'services',
        through: { attributes: [] },
        where: { id: booking.service_id },
        required: true,
      },
    ],
  });

  return technicians;
}

export async function scoreAndRank(
  candidates: Technician[],
  booking: Booking,
  scheduledTime: Date
): Promise<Array<{ technician: Technician; score: number }>> {
  const isPeak =
    scheduledTime.getHours() >= 18 && scheduledTime.getHours() < 22;
  const weights = isPeak
    ? { distance: 0.35, rating: 0.25, acceptance: 0.2, response: 0.2 }
    : { distance: 0.4, rating: 0.3, acceptance: 0.2, response: 0.1 };

  const bookingLat = Number(booking.latitude);
  const bookingLon = Number(booking.longitude);

  const results: Array<{ technician: Technician; score: number }> = [];

  for (const tech of candidates) {
    const radiusKm = tech.service_radius_km ?? 10;
    let distanceKm = radiusKm + 1;
    const loc = await TechnicianLocation.findOne({
      where: { technician_id: tech.id },
    });
    if (loc) {
      distanceKm = calculateDistanceKm(
        bookingLat,
        bookingLon,
        Number(loc.latitude),
        Number(loc.longitude)
      );
    }
    const distanceScore =
      distanceKm <= radiusKm
        ? Math.max(0, 1 - distanceKm / radiusKm)
        : 0;
    if (distanceScore === 0) continue;

    const ratingScore = Math.min(1, Number(tech.rating || 0) / 5);
    const acceptanceScore = Math.min(1, Math.max(0, Number(tech.acceptance_rate ?? 1)));

    let responseTimeScore = 0.5;
    const raw = await redis.get(RESPONSE_TIME_KEY(tech.id));
    if (raw) {
      const avgSeconds = parseFloat(raw);
      responseTimeScore = Math.max(0, 1 - avgSeconds / 300);
    }

    const score =
      weights.distance * distanceScore +
      weights.rating * ratingScore +
      weights.acceptance * acceptanceScore +
      weights.response * responseTimeScore;

    results.push({ technician: tech, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

export async function notifyTechnician(
  technicianId: string,
  bookingId: string,
  attempt: number
): Promise<void> {
  const payload = {
    technicianId,
    notifiedAt: Date.now(),
    attempt,
  };
  await redis.setex(
    PENDING_KEY(bookingId),
    PENDING_TTL,
    JSON.stringify(payload)
  );

  const technician = await Technician.findByPk(technicianId);
  if (technician) {
    await createNotification({
      userId: technician.user_id,
      type: NotificationType.JOB_ASSIGNED,
      title: 'New job available',
      message: 'New job available. You have 30 seconds to respond.',
    });
    try {
      const booking = await Booking.findByPk(bookingId, {
        include: [{ association: 'service' as any }],
      });
      const job = await Job.findOne({
        where: { booking_id: bookingId, technician_id: technicianId },
      });
      if (booking && job) {
        const emitter = require('../socket/socket.emitter');
        emitter.emitJobAssigned(technician.user_id, {
          jobId: job.id,
          bookingId,
          service: (booking as any).service?.name ?? '',
          scheduledTime: booking.scheduled_time,
          address: booking.address,
        });
      }
    } catch (_) {}
  }
  logger.info('Notified technician', { technicianId, bookingId, attempt });
}

export async function recordResponseTime(
  technicianId: string,
  responseSeconds: number
): Promise<void> {
  const key = RESPONSE_TIME_KEY(technicianId);
  const raw = await redis.get(key);
  const existing = raw ? parseFloat(raw) : 60;
  const newAvg = existing * 0.7 + responseSeconds * 0.3;
  await redis.set(key, String(newAvg));
  logger.info('Recorded response time', { technicianId, responseSeconds, newAvg });
}

export async function getPendingNotification(
  bookingId: string
): Promise<{ technicianId: string; notifiedAt: number; attempt: number } | null> {
  const raw = await redis.get(PENDING_KEY(bookingId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { technicianId: string; notifiedAt: number; attempt: number };
  } catch {
    return null;
  }
}

export async function addAttemptedTechnician(
  bookingId: string,
  technicianId: string
): Promise<void> {
  await redis.sadd(ATTEMPTED_KEY(bookingId), technicianId);
  await redis.expire(ATTEMPTED_KEY(bookingId), ATTEMPTED_TTL);
}

export async function getAttemptedTechnicianIds(
  bookingId: string
): Promise<string[]> {
  const ids = await redis.smembers(ATTEMPTED_KEY(bookingId));
  return ids;
}

export async function clearMatchingKeys(bookingId: string): Promise<void> {
  await redis.del(PENDING_KEY(bookingId));
  await redis.del(ATTEMPTED_KEY(bookingId));
}
