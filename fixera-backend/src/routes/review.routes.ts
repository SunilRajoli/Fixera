import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import * as reviewController from '../controllers/review.controller';
import { UserRole } from '../types';

const router = Router();

router.post(
  '/',
  [
    authenticate,
    authorize(UserRole.CUSTOMER),
    body('bookingId').isUUID().withMessage('bookingId must be a valid UUID'),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('rating must be an integer between 1 and 5'),
    body('comment').optional().isString().isLength({ max: 500 }),
  ],
  reviewController.createReview
);

router.get(
  '/booking/:bookingId',
  [
    authenticate,
    authorize(UserRole.CUSTOMER, UserRole.TECHNICIAN, UserRole.ADMIN),
    param('bookingId').isUUID().withMessage('bookingId must be a valid UUID'),
  ],
  reviewController.getReview
);

router.get(
  '/technician/:technicianId',
  [
    param('technicianId').isUUID().withMessage('technicianId must be a valid UUID'),
    query('page').optional().isInt({ gt: 0 }),
    query('limit').optional().isInt({ gt: 0, lt: 101 }),
  ],
  reviewController.getTechnicianReviews
);

export default router;

