import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import * as jobController from '../controllers/job.controller';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.TECHNICIAN));

router.get('/', jobController.getTechnicianJobs);
router.post('/:id/accept', jobController.acceptJob);
router.post('/:id/reject', jobController.rejectJob);
router.post('/:id/start-travel', jobController.startTravel);
router.post('/:id/start-job', jobController.startJob);
router.post('/:id/complete', jobController.completeJob);

export default router;

