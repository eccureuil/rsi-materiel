import { Router } from 'express';
import { AuditController } from '../controllers/AuditController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/authorize.js';
import { AuditRepository } from '../repositories/AuditRepository.js';
import { AuditService } from '../services/AuditService.js';

const controller = new AuditController(new AuditService(new AuditRepository()));

const router = Router();
router.use(authenticate, requireRole('ADMINISTRATEUR'));

router.get('/', controller.lister);

export default router;