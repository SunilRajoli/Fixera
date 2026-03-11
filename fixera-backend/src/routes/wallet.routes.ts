import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import * as walletController from '../controllers/wallet.controller';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.TECHNICIAN));

router.get('/balance', walletController.getWalletBalance);
router.get('/transactions', walletController.getTransactionHistory);
router.post('/withdraw', walletController.requestWithdrawal);

export default router;

