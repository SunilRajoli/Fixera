export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  TECHNICIAN = 'TECHNICIAN',
  ADMIN = 'ADMIN',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  MATCHING = 'MATCHING',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  ON_THE_WAY = 'ON_THE_WAY',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PAYMENT_HELD = 'PAYMENT_HELD',
  CONFIRMED = 'CONFIRMED',
  CLOSED = 'CLOSED',
  REASSIGNING = 'REASSIGNING',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
  DISPUTED = 'DISPUTED',
}

export const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.PENDING]: [BookingStatus.MATCHING],
  [BookingStatus.MATCHING]: [BookingStatus.ASSIGNED, BookingStatus.FAILED],
  [BookingStatus.ASSIGNED]: [BookingStatus.ACCEPTED, BookingStatus.REASSIGNING],
  [BookingStatus.REASSIGNING]: [BookingStatus.ASSIGNED, BookingStatus.FAILED],
  [BookingStatus.ACCEPTED]: [BookingStatus.ON_THE_WAY, BookingStatus.CANCELLED],
  [BookingStatus.ON_THE_WAY]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
  [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED, BookingStatus.DISPUTED],
  [BookingStatus.COMPLETED]: [BookingStatus.PAYMENT_HELD],
  [BookingStatus.PAYMENT_HELD]: [BookingStatus.CONFIRMED, BookingStatus.DISPUTED],
  [BookingStatus.CONFIRMED]: [BookingStatus.CLOSED],
  [BookingStatus.DISPUTED]: [BookingStatus.CLOSED],
  [BookingStatus.CLOSED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.FAILED]: [],
};

export enum SlotStatus {
  AVAILABLE = 'AVAILABLE',
  HELD = 'HELD',
  BOOKED = 'BOOKED',
  RELEASED = 'RELEASED',
}

export enum PaymentMethod {
  UPI = 'UPI',
  CARD = 'CARD',
  WALLET = 'WALLET',
  CASH = 'CASH',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  CAPTURED = 'CAPTURED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
  DISPUTED = 'DISPUTED',
}

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  HOLD = 'HOLD',
  RELEASE = 'RELEASE',
  REFUND = 'REFUND',
  COMMISSION = 'COMMISSION',
  PAYOUT = 'PAYOUT',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  AWAITING_RESPONSE = 'AWAITING_RESPONSE',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
}

export enum DisputeResolution {
  REFUND_CUSTOMER = 'REFUND_CUSTOMER',
  PAY_TECHNICIAN = 'PAY_TECHNICIAN',
  PARTIAL_SPLIT = 'PARTIAL_SPLIT',
}

export enum NotificationType {
  BOOKING_CREATED = 'BOOKING_CREATED',
  JOB_ASSIGNED = 'JOB_ASSIGNED',
  JOB_ACCEPTED = 'JOB_ACCEPTED',
  TECHNICIAN_EN_ROUTE = 'TECHNICIAN_EN_ROUTE',
  JOB_STARTED = 'JOB_STARTED',
  JOB_COMPLETED = 'JOB_COMPLETED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYOUT_SENT = 'PAYOUT_SENT',
  DISPUTE_OPENED = 'DISPUTE_OPENED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',
  REVIEW_REQUEST = 'REVIEW_REQUEST',
  OTP_SENT = 'OTP_SENT',
}

export interface JwtPayload {
  userId: string;
  role: UserRole;
  phone: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

