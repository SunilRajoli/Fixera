import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import * as paymentController from '../controllers/payment.controller';
import { PaymentMethod, UserRole } from '../types';

const router = Router();

router.use(authenticate);

router.post(
  '/inspection',
  authorize(UserRole.CUSTOMER),
  [
    body('bookingId').isUUID().withMessage('bookingId must be a valid UUID'),
    body('paymentMethod')
      .isIn(Object.values(PaymentMethod))
      .withMessage('Invalid payment method'),
  ],
  paymentController.initiateInspectionPayment
);

router.post(
  '/repair',
  authorize(UserRole.CUSTOMER),
  [
    body('bookingId').isUUID().withMessage('bookingId must be a valid UUID'),
    body('paymentMethod')
      .isIn(Object.values(PaymentMethod))
      .withMessage('Invalid payment method'),
  ],
  paymentController.initiateRepairPayment
);

router.get(
  '/invoice/:bookingId',
  authorize(UserRole.CUSTOMER, UserRole.TECHNICIAN, UserRole.ADMIN),
  [param('bookingId').isUUID().withMessage('bookingId must be a valid UUID')],
  paymentController.getInvoice
);

export default router;

