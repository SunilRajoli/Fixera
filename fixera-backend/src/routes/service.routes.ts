import { Router } from 'express';
import * as serviceController from '../controllers/service.controller';

const router = Router();
router.get('/', serviceController.getServices);
router.get('/repair-types', serviceController.getRepairTypes);
export default router;
