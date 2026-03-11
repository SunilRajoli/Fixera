import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import * as bookingController from '../controllers/booking.controller';
import { PaymentMethod, UserRole } from '../types';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize(UserRole.CUSTOMER),
  [
    body('serviceId').isUUID().withMessage('serviceId must be a valid UUID'),
    body('description')
      .isString()
      .isLength({ min: 10 })
      .withMessage('Description must be at least 10 characters'),
    body('address')
      .isString()
      .isLength({ min: 5 })
      .withMessage('Address must be at least 5 characters'),
    body('latitude').isFloat().withMessage('Latitude must be a number'),
    body('longitude').isFloat().withMessage('Longitude must be a number'),
    body('scheduledTime')
      .isISO8601()
      .withMessage('scheduledTime must be a valid ISO date')
      .bail()
      .custom((value) => {
        const date = new Date(value);
        if (date <= new Date()) {
          throw new Error('scheduledTime must be in the future');
        }
        return true;
      }),
    body('slotId').isUUID().withMessage('slotId must be a valid UUID'),
    body('paymentMethod')
      .isIn(Object.values(PaymentMethod))
      .withMessage('Invalid payment method'),
  ],
  bookingController.createBooking
);

router.get(
  '/:id',
  authorize(UserRole.CUSTOMER, UserRole.TECHNICIAN, UserRole.ADMIN),
  bookingController.getBooking
);

router.get(
  '/:id/technician-location',
  authorize(UserRole.CUSTOMER, UserRole.ADMIN),
  bookingController.getTechnicianLocation
);

router.post(
  '/:id/cancel',
  authorize(UserRole.CUSTOMER, UserRole.TECHNICIAN, UserRole.ADMIN),
  [body('reason').isString().isLength({ min: 5 }).withMessage('Reason required')],
  bookingController.cancelBooking
);

router.post(
  '/:id/confirm',
  authorize(UserRole.CUSTOMER),
  bookingController.confirmBooking
);

router.post(
  '/:id/estimate',
  authorize(UserRole.TECHNICIAN),
  [
    body('repairTypeId').isUUID().withMessage('repairTypeId must be a valid UUID'),
    body('repairCost')
      .isFloat({ gt: 0 })
      .withMessage('repairCost must be a positive number'),
  ],
  bookingController.submitRepairEstimate
);

export default router;

