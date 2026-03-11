import { Op, Transaction as SequelizeTransaction } from 'sequelize';
import sequelize from '../config/sequelize';
import { Booking, Job, Review, Technician } from '../models';
import { BookingStatus, UserRole } from '../types';
import AppError from '../utils/AppError';

function toAmount(value: number): number {
  return parseFloat(value.toFixed(2));
}

export async function createReview(data: {
  bookingId: string;
  customerId: string;
  rating: number;
  comment?: string;
  ipAddress: string;
}): Promise<Review> {
  const booking = await Booking.findByPk(data.bookingId, {
    include: [{ association: 'job' }],
  });
  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }

  if (booking.customer_id !== data.customerId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  if (booking.status !== BookingStatus.CLOSED) {
    throw new AppError(
      'Reviews can only be submitted after job is closed',
      400,
      'BOOKING_NOT_CLOSED'
    );
  }

  const existing = await Review.findOne({
    where: { booking_id: data.bookingId },
  });
  if (existing) {
    throw new AppError('Review already exists for this booking', 409, 'REVIEW_ALREADY_EXISTS');
  }

  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentCount = await Review.count({
    where: {
      ip_address: data.ipAddress,
      createdAt: { [Op.gte]: since } as any,
    } as any,
  });
  if (recentCount >= 3) {
    throw new AppError(
      'Too many reviews from this IP. Please try later.',
      429,
      'REVIEW_RATE_LIMIT'
    );
  }

  if (!(booking as any).job) {
    const job = await Job.findOne({ where: { booking_id: data.bookingId } });
    if (!job) {
      throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
    }
    (booking as any).job = job;
  }

  const technicianId = (booking as any).job.technician_id as string;

  let review: Review;

  await sequelize.transaction(async (t: SequelizeTransaction) => {
    review = await Review.create(
      {
        booking_id: data.bookingId,
        customer_id: data.customerId,
        technician_id: technicianId,
        rating: data.rating,
        comment: data.comment ?? null,
        ip_address: data.ipAddress,
      },
      { transaction: t }
    );

    const recentReviews = await Review.findAll({
      where: { technician_id: technicianId },
      order: [['createdAt', 'DESC']],
      limit: 50,
      transaction: t,
    } as any);

    const count = recentReviews.length;
    const avg =
      count === 0
        ? 0
        : recentReviews.reduce((sum, r) => sum + Number(r.rating), 0) / count;

    const technician = await Technician.findByPk(technicianId, { transaction: t });
    if (technician) {
      const totalReviews = Number(technician.total_reviews) || 0;
      technician.rating = String(toAmount(avg));
      technician.total_reviews = totalReviews + 1;
      await technician.save({ transaction: t });
    }
  });

  return review!;
}

export async function getReview(bookingId: string): Promise<Review | null> {
  const review = await Review.findOne({
    where: { booking_id: bookingId },
    include: [
      {
        association: 'booking',
        include: [
          { association: 'customer', attributes: ['name'] },
          { association: 'job', include: [{ association: 'technician', include: ['user'] }] },
        ],
      },
    ],
  } as any);

  return review;
}

export async function getTechnicianReviews(
  technicianId: string,
  page = 1,
  limit = 10
): Promise<{ reviews: Review[]; total: number; averageRating: number }> {
  const offset = (page - 1) * limit;

  const { rows, count } = await Review.findAndCountAll({
    where: { technician_id: technicianId },
    order: [['createdAt', 'DESC']],
    offset,
    limit,
  } as any);

  const avg =
    rows.length === 0
      ? 0
      : rows.reduce((sum, r) => sum + Number(r.rating), 0) / rows.length;

  return {
    reviews: rows,
    total: count,
    averageRating: toAmount(avg),
  };
}

