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

export enum PaymentMethod {
  UPI = 'UPI',
  CARD = 'CARD',
  WALLET = 'WALLET',
  CASH = 'CASH',
}

export interface User {
  id: string
  name: string
  phone: string
  role: string
  email?: string
}

export interface Booking {
  id: string
  status: BookingStatus
  description: string
  address: string
  latitude?: string | number
  longitude?: string | number
  scheduledTime: string
  inspectionFee?: number
  repairCost?: number
  autoConfirmAt?: string
  disputeWindowEnd?: string
  service: { id: string; name: string; inspectionFee: number }
  customer?: { id: string; name: string; phone: string }
  job?: Job
  slot?: TimeSlot
  payment?: Payment
  invoice?: Invoice
}

export interface Job {
  id: string
  bookingId: string
  technicianId: string
  assignedAt: string
  acceptedAt?: string
  startedAt?: string
  completedAt?: string
  technician?: {
    id: string
    rating: number
    user: { name: string; phone: string }
  }
}

export interface TimeSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
}

export interface Service {
  id: string
  name: string
  description?: string
  inspectionFee: number
}

export interface RepairType {
  id: string
  serviceId: string
  name: string
  minPrice: number
  maxPrice: number
}

export interface Payment {
  id: string
  amount: number
  status: string
  paymentMethod: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  serviceCharge: number
  gstAmount: number
  totalAmount: number
  platformCommission: number
  technicianPayout: number
  issuedAt: string
}

export interface Technician {
  id: string
  rating: number
  city: string
  isOnline: boolean
  verificationStatus: string
  acceptanceRate: number
  totalReviews: number
  workingHoursStart: string
  workingHoursEnd: string
  user: { name: string; phone: string }
  wallet?: {
    balance: number
    lockedBalance: number
    totalEarned: number
  }
}

export interface Review {
  id: string
  rating: number
  comment?: string
  createdAt: string
  customer?: { name: string }
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  readStatus: boolean
  createdAt: string
}

export interface Dispute {
  id: string
  reason: string
  status: DisputeStatus
  resolution?: string
  adminNote?: string
  createdAt: string
  booking?: Partial<Booking>
}

export interface Transaction {
  id: string
  type: string
  amount: number
  status: string
  note?: string
  withdrawableAt?: string
  createdAt: string
}

export interface Payout {
  id: string
  amount: number
  status: string
  retryCount: number
  bankRef?: string
  failedReason?: string
  processedAt?: string
  createdAt: string
  technician?: { user: { name: string; phone: string } }
}
