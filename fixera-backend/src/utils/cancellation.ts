import { Booking } from '../models';
import { BookingStatus } from '../types';

export function calculateCancellationPenalty(
  booking: Booking,
  cancelledBy: 'customer' | 'technician',
  currentStatus: BookingStatus
): { inspectionFeeCharged: boolean; penaltyAmount: number; technicianCompensation: number } {
  let inspectionFeeCharged = false;
  let penaltyAmount = 0;
  let technicianCompensation = 0;

  const inspectionFee = booking.inspection_fee ? Number(booking.inspection_fee) : 0;

  if (cancelledBy === 'customer') {
    if (
      currentStatus === BookingStatus.PENDING ||
      currentStatus === BookingStatus.MATCHING
    ) {
      inspectionFeeCharged = false;
      penaltyAmount = 0;
      technicianCompensation = 0;
    } else if (
      currentStatus === BookingStatus.ASSIGNED ||
      currentStatus === BookingStatus.ACCEPTED
    ) {
      inspectionFeeCharged = true;
      penaltyAmount = inspectionFee;
      technicianCompensation = inspectionFee * 0.8;
    } else if (currentStatus === BookingStatus.ON_THE_WAY) {
      inspectionFeeCharged = true;
      penaltyAmount = 100;
      technicianCompensation = 80;
    }
  } else if (cancelledBy === 'technician') {
    inspectionFeeCharged = false;
    penaltyAmount = 0;
    technicianCompensation = 0;
  }

  return { inspectionFeeCharged, penaltyAmount, technicianCompensation };
}

