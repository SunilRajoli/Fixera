import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import * as disputeController from '../controllers/dispute.controller';
import { DisputeResolution, DisputeStatus, UserRole } from '../types';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  [
    authorize(UserRole.CUSTOMER),
    body('bookingId').isUUID().withMessage('bookingId must be a valid UUID'),
    body('reason')
      .isString()
      .isLength({ min: 10 })
      .withMessage('reason must be at least 10 characters'),
  ],
  disputeController.raiseDispute
);

router.get(
  '/:id',
  authorize(UserRole.CUSTOMER, UserRole.TECHNICIAN, UserRole.ADMIN),
  disputeController.getDispute
);

router.patch(
  '/:id/status',
  [
    authorize(UserRole.ADMIN),
    body('status')
      .isIn(Object.values(DisputeStatus))
      .withMessage('Invalid dispute status'),
    body('note').optional().isString(),
  ],
  disputeController.updateDisputeStatus
);

router.post(
  '/:id/resolve',
  [
    authorize(UserRole.ADMIN),
    body('resolution')
      .isIn(Object.values(DisputeResolution))
      .withMessage('Invalid dispute resolution'),
    body('note')
      .isString()
      .isLength({ min: 5 })
      .withMessage('note must be at least 5 characters'),
    body('customerRefundAmount').optional().isFloat({ gt: 0 }),
    body('technicianAmount').optional().isFloat({ gt: 0 }),
  ],
  disputeController.resolveDispute
);

router.get(
  '/',
  [
    authorize(UserRole.ADMIN),
    query('status').optional().isIn(Object.values(DisputeStatus)),
    query('page').optional().isInt({ gt: 0 }),
    query('limit').optional().isInt({ gt: 0, lt: 101 }),
  ],
  disputeController.getDisputeList
);

export default router;

