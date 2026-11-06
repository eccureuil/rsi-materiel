import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController.js';
import { auditTrail } from '../middlewares/auditTrail.js';
import { authenticate } from '../middlewares/authenticate.js';
import { DashboardRepository } from '../repositories/DashboardRepository.js';
import { DashboardService } from '../services/DashboardService.js';

const controller = new DashboardController(new DashboardService(new DashboardRepository()));

const router = Router();
router.use(authenticate, auditTrail);

router.get('/', controller.statistiques);

export default router;