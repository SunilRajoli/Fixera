import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import * as adminController from '../controllers/admin.controller';
import { UserRole, PayoutStatus, VerificationStatus } from '../types';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

router.post(
  '/bookings/:id/assign',
  [body('technicianId').isUUID().withMessage('technicianId must be a valid UUID')],
  adminController.manualAssign
);

router.post(
  '/bookings/:id/refund',
  [
    body('amount').isFloat({ gt: 0 }).withMessage('amount must be positive'),
    body('reason')
      .isString()
      .isLength({ min: 5 })
      .withMessage('reason must be at least 5 characters'),
  ],
  adminController.processRefund
);

router.get(
  '/payouts',
  [],
  adminController.getPayouts
);

router.get('/customers', adminController.getCustomers);
router.get('/dashboard', adminController.getDashboardStats);

router.get(
  '/technicians',
  [
    query('page').optional().isInt({ gt: 0 }),
    query('limit').optional().isInt({ gt: 0, lt: 101 }),
    query('search').optional().isString(),
    query('onlineOnly').optional().isIn(['true', 'false']),
  ],
  adminController.getTechnicianPerformance
);

router.patch(
  '/technicians/:id/verify',
  [
    body('status')
      .isIn(Object.values(VerificationStatus))
      .withMessage('Invalid verification status'),
    body('note').optional().isString(),
  ],
  adminController.verifyTechnician
);

router.patch(
  '/technicians/:id/toggle-status',
  [body('isActive').isBoolean().withMessage('isActive must be boolean')],
  adminController.toggleTechnicianStatus
);

export default router;
