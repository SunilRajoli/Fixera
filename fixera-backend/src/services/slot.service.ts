import { Transaction as SequelizeTransaction, Op } from 'sequelize';
import { TimeSlot, Technician } from '../models';
import AppError from '../utils/AppError';

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export async function generateSlots(
  technicianId: string,
  date: string
): Promise<TimeSlot[]> {
  const technician = await Technician.findByPk(technicianId);
  if (!technician) {
    throw new AppError('Technician not found', 404, 'TECHNICIAN_NOT_FOUND');
  }

  const startMinutes = toMinutes(technician.working_hours_start);
  const endMinutes = toMinutes(technician.working_hours_end);
  const duration = technician.slot_duration_mins;

  const existing = await TimeSlot.findAll({
    where: { technician_id: technicianId, date },
  });

  const existingKey = new Set(
    existing.map((s) => `${s.start_time}-${s.end_time}`)
  );

  const toCreate: Partial<TimeSlot>[] = [];
  for (let t = startMinutes; t + duration <= endMinutes; t += duration) {
    const start = fromMinutes(t);
    const end = fromMinutes(t + duration);
    const key = `${start}-${end}`;
    if (existingKey.has(key)) continue;
    toCreate.push({
      technician_id: technicianId,
      date,
      start_time: start,
      end_time: end,
      status: 'AVAILABLE' as any,
    });
  }

  if (!toCreate.length) {
    return existing;
  }

  const created = await TimeSlot.bulkCreate(toCreate as any[]);
  return existing.concat(created);
}

export async function getAvailableSlots(
  technicianId: string,
  date: string
): Promise<TimeSlot[]> {
  return TimeSlot.findAll({
    where: {
      technician_id: technicianId,
      date,
      status: 'AVAILABLE',
    },
    order: [['start_time', 'ASC']],
  });
}

/** Find one available slot for any technician on the given date and start time (e.g. "09:00"). Used by customers when creating a booking. */
export async function findSlotForBooking(
  date: string,
  startTime: string
): Promise<TimeSlot | null> {
  const slot = await TimeSlot.findOne({
    where: {
      date,
      start_time: startTime,
      status: 'AVAILABLE',
    },
    order: [['created_at', 'ASC']],
  });
  return slot;
}

export async function reserveSlot(
  slotId: string,
  bookingId: string,
  t: SequelizeTransaction
): Promise<void> {
  const slot = await TimeSlot.findByPk(slotId, {
    transaction: t,
    lock: t.LOCK.UPDATE,
  });

  if (!slot) {
    throw new AppError('Slot not found', 404, 'SLOT_NOT_FOUND');
  }

  if (slot.status !== 'AVAILABLE') {
    throw new AppError('Slot not available', 409, 'SLOT_NOT_AVAILABLE');
  }

  slot.status = 'BOOKED' as any;
  slot.booking_id = bookingId;
  await slot.save({ transaction: t });
}

export async function releaseSlot(
  slotId: string,
  t: SequelizeTransaction
): Promise<void> {
  const slot = await TimeSlot.findByPk(slotId, {
    transaction: t,
    lock: t.LOCK.UPDATE,
  });

  if (!slot) {
    throw new AppError('Slot not found', 404, 'SLOT_NOT_FOUND');
  }

  slot.status = 'RELEASED' as any;
  slot.booking_id = null;
  await slot.save({ transaction: t });
}

export async function rescheduleSlot(
  bookingId: string,
  newSlotId: string,
  t: SequelizeTransaction
): Promise<void> {
  const currentSlot = await TimeSlot.findOne({
    where: { booking_id: bookingId },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });

  if (!currentSlot) {
    throw new AppError('Current slot not found', 404, 'SLOT_NOT_FOUND');
  }

  const newSlot = await TimeSlot.findByPk(newSlotId, {
    transaction: t,
    lock: t.LOCK.UPDATE,
  });

  if (!newSlot) {
    throw new AppError('New slot not found', 404, 'SLOT_NOT_FOUND');
  }

  if (newSlot.status !== 'AVAILABLE') {
    throw new AppError('Slot not available', 409, 'SLOT_NOT_AVAILABLE');
  }

  currentSlot.status = 'RELEASED' as any;
  currentSlot.booking_id = null;
  await currentSlot.save({ transaction: t });

  newSlot.status = 'BOOKED' as any;
  newSlot.booking_id = bookingId;
  await newSlot.save({ transaction: t });
}

