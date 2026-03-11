import { Router } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import * as notificationController from '../controllers/notification.controller';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.CUSTOMER, UserRole.TECHNICIAN, UserRole.ADMIN));

router.get(
  '/',
  [
    query('page').optional().isInt({ gt: 0 }),
    query('limit').optional().isInt({ gt: 0, lt: 101 }),
  ],
  notificationController.getNotifications
);

router.patch('/:id/read', notificationController.markAsRead);

router.patch('/read-all', notificationController.markAllAsRead);

export default router;

