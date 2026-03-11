import { Transaction as SequelizeTransaction, Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/sequelize';
import {
  Booking,
  Service,
  Payment,
  Transaction,
  Wallet,
  Invoice,
  Job,
  Technician,
} from '../models';
import {
  BookingStatus,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  TransactionStatus,
  TransactionType,
  UserRole,
} from '../types';
import AppError from '../utils/AppError';
import logger from '../utils/logger';
import { releaseLockedFunds } from './wallet.service';
import { createNotification } from './notification.service';

const PLATFORM_COMMISSION_RATE = Number(
  process.env.PLATFORM_COMMISSION_RATE || '0.15'
);

function toAmount(value: number): number {
  return parseFloat(value.toFixed(2));
}

export async function initiateInspectionPayment(
  bookingId: string,
  customerId: string,
  paymentMethod: PaymentMethod
): Promise<Payment> {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }
  if (booking.customer_id !== customerId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }
  if (
    booking.status !== BookingStatus.ACCEPTED &&
    booking.status !== BookingStatus.ON_THE_WAY
  ) {
    throw new AppError(
      'Inspection payment allowed only when booking is ACCEPTED or ON_THE_WAY',
      400,
      'INVALID_STATE'
    );
  }

  const existing = await Payment.findOne({
    where: { booking_id: bookingId, status: PaymentStatus.CAPTURED },
  });
  if (existing) {
    throw new AppError('Payment already captured for this booking', 400, 'PAYMENT_EXISTS');
  }

  const service = await Service.findByPk(booking.service_id);
  if (!service) {
    throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
  }

  const amount = toAmount(Number(service.inspection_fee));

  const payment = await Payment.create({
    booking_id: bookingId,
    customer_id: customerId,
    amount: String(amount),
    payment_method: paymentMethod,
    status: PaymentStatus.CAPTURED,
    gateway_ref: `SIM-${uuidv4()}`,
  });

  booking.inspection_fee = String(amount);
  await booking.save();

  logger.info('Inspection payment captured (simulated)', {
    bookingId,
    amount,
  });

  return payment;
}

export async function initiateRepairPayment(
  bookingId: string,
  customerId: string,
  paymentMethod: PaymentMethod
): Promise<Payment> {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }
  if (booking.customer_id !== customerId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }
  if (booking.status !== BookingStatus.PAYMENT_HELD) {
    throw new AppError(
      'Repair payment allowed only when booking status is PAYMENT_HELD',
      400,
      'INVALID_STATE'
    );
  }
  if (!booking.repair_cost) {
    throw new AppError('Repair cost not set', 400, 'MISSING_REPAIR_COST');
  }

  const repairCost = Number(booking.repair_cost);

  const existingRepairPayment = await Payment.findOne({
    where: {
      booking_id: bookingId,
      amount: {
        [Op.gte]: repairCost,
      },
      status: PaymentStatus.CAPTURED,
    },
  });
  if (existingRepairPayment) {
    throw new AppError('Repair payment already captured', 400, 'PAYMENT_EXISTS');
  }

  const gstAmount = toAmount(repairCost * 0.18);
  const totalAmount = toAmount(repairCost + gstAmount);

  const payment = await Payment.create({
    booking_id: bookingId,
    customer_id: customerId,
    amount: String(totalAmount),
    payment_method: paymentMethod,
    status: PaymentStatus.CAPTURED,
    gateway_ref: `SIM-${uuidv4()}`,
  });

  await generateInvoice(bookingId, customerId, repairCost);

  logger.info('Repair payment captured (simulated)', {
    bookingId,
    amount: totalAmount,
  });

  return payment;
}

export async function generateInvoice(
  bookingId: string,
  customerId: string,
  repairCost: number
): Promise<Invoice> {
  const booking = await Booking.findByPk(bookingId, {
    include: [{ association: 'job', include: ['technician'] }],
  });
  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }

  const job = await Job.findOne({ where: { booking_id: bookingId } });
  if (!job) {
    throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
  }

  const gstAmount = toAmount(repairCost * 0.18);
  const totalAmount = toAmount(repairCost + gstAmount);
  const platformCommission = toAmount(repairCost * PLATFORM_COMMISSION_RATE);
  const technicianPayout = toAmount(repairCost - platformCommission);

  const date = new Date();
  const y = date.getFullYear().toString();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  const invoiceNumber = `INV-${y}${m}${d}-${randomDigits}`;

  const existing = await Invoice.findOne({ where: { booking_id: bookingId } });
  if (existing) {
    return existing;
  }

  const invoice = await Invoice.create({
    booking_id: bookingId,
    customer_id: customerId,
    technician_id: job.technician_id,
    service_charge: String(repairCost),
    gst_rate: 18.0 as any,
    gst_amount: String(gstAmount),
    total_amount: String(totalAmount),
    platform_commission: String(platformCommission),
    technician_payout: String(technicianPayout),
    invoice_number: invoiceNumber,
    status: 'ISSUED',
  });

  return invoice;
}

export async function processRefund(
  bookingId: string,
  requestedBy: string,
  amount: number,
  reason: string
): Promise<Payment> {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  }

  const payment = await Payment.findOne({
    where: { booking_id: bookingId, status: PaymentStatus.CAPTURED },
  });
  if (!payment) {
    throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
  }

  const maxAmount = Number(payment.amount);
  if (amount > maxAmount) {
    throw new AppError('Refund amount exceeds payment amount', 400, 'INVALID_AMOUNT');
  }

  await sequelize.transaction(async (t: SequelizeTransaction) => {
    payment.status = PaymentStatus.REFUNDED;
    payment.refund_status = 'PROCESSED';
    payment.refund_initiated_at = new Date();
    const completedAt = new Date();
    completedAt.setDate(completedAt.getDate() + 5);
    payment.refund_completed_at = completedAt;
    await payment.save({ transaction: t });

    const job = await Job.findOne({
      where: { booking_id: bookingId },
      transaction: t,
    });
    if (job) {
      const technician = await Technician.findByPk(job.technician_id, {
        transaction: t,
      } as any);
      if (technician) {
        const wallet = await Wallet.findOne({
          where: { technician_id: technician.id },
          transaction: t,
        } as any);
        if (wallet) {
          const creditTrx = await Transaction.findOne({
            where: {
              wallet_id: wallet.id,
              booking_id: bookingId,
              type: TransactionType.CREDIT,
            },
            transaction: t,
          } as any);

          if (creditTrx) {
            const locked = Number(wallet.locked_balance) || 0;
            const refundAmt = Math.min(Number(creditTrx.amount), amount);
            wallet.locked_balance = String(
              toAmount(Math.max(0, locked - refundAmt))
            );
            await wallet.save({ transaction: t });

            await Transaction.create(
              {
                wallet_id: wallet.id,
                booking_id: bookingId,
                type: TransactionType.REFUND,
                amount: String(refundAmt),
                status: TransactionStatus.COMPLETED,
                note: `Refund for booking ${bookingId}`,
              },
              { transaction: t }
            );
          }
        }
      }
    }
  });

  const customerNotificationAmount = toAmount(amount);
  await createNotification({
    userId: booking.customer_id,
    type: NotificationType.PAYMENT_RECEIVED,
    title: 'Refund initiated',
    message: `Refund of ₹${customerNotificationAmount} initiated. Expected in 5–7 business days.`,
  });

  return payment;
}

export async function getInvoice(
  bookingId: string,
  requesterId: string,
  role: UserRole
): Promise<Invoice> {
  const invoice = await Invoice.findOne({ where: { booking_id: bookingId } });
  if (!invoice) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  if (role === UserRole.ADMIN) {
    return invoice;
  }

  if (role === UserRole.CUSTOMER && invoice.customer_id === requesterId) {
    return invoice;
  }

  if (role === UserRole.TECHNICIAN) {
    const technician = await Technician.findOne({ where: { user_id: requesterId } });
    if (technician && technician.id === invoice.technician_id) {
      return invoice;
    }
  }

  throw new AppError('Forbidden', 403, 'FORBIDDEN');
}

