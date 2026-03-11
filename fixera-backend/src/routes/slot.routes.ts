import { Router } from 'express';
import { param, body, query } from 'express-validator';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import * as slotController from '../controllers/slot.controller';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);

router.get(
  '/for-booking',
  authorize(UserRole.CUSTOMER),
  [
    query('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),
    query('startTime').matches(/^\d{2}:\d{2}$/).withMessage('startTime must be HH:MM'),
  ],
  slotController.getSlotForBooking
);

router.get(
  '/:technicianId/:date',
  authorize(UserRole.CUSTOMER, UserRole.ADMIN),
  [
    param('technicianId').isUUID().withMessage('technicianId must be a valid UUID'),
    param('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('date must be in YYYY-MM-DD format'),
  ],
  slotController.getAvailableSlots
);

router.post(
  '/generate',
  authorize(UserRole.TECHNICIAN, UserRole.ADMIN),
  [
    body('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('date must be in YYYY-MM-DD format'),
  ],
  slotController.generateSlots
);

export default router;

