import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authenticate';
import { UserRole } from '../types';

const router = Router();

const phoneValidator = body('phone')
  .exists()
  .withMessage('Phone is required')
  .bail()
  .isString()
  .withMessage('Phone must be a string')
  .bail()
  .matches(/^(\+91\d{10}|\d{10})$/)
  .withMessage('Phone must be +91XXXXXXXXXX or 10 digits');

router.post(
  '/send-otp',
  [phoneValidator],
  authController.sendOtp
);

router.post(
  '/register',
  [
    phoneValidator,
    body('name')
      .isString()
      .withMessage('Name must be a string')
      .bail()
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters'),
    body('role')
      .isIn([UserRole.CUSTOMER, UserRole.TECHNICIAN])
      .withMessage('Role must be CUSTOMER or TECHNICIAN'),
  ],
  authController.register
);

router.post(
  '/verify-login',
  [
    phoneValidator,
    body('code')
      .exists()
      .withMessage('OTP code is required')
      .bail()
      .matches(/^\d{6}$/)
      .withMessage('OTP code must be 6 digits'),
  ],
  authController.verifyLogin
);

router.get('/me', authenticate, authController.getMe);

export default router;

