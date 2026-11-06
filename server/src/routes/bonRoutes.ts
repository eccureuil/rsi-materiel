import { Router } from 'express';
import { BonController } from '../controllers/BonController.js';
import { auditExport } from '../middlewares/auditExport.js';
import { authenticate } from '../middlewares/authenticate.js';
import { AffectationRepository } from '../repositories/AffectationRepository.js';
import { BonService } from '../services/BonService.js';

const controller = new BonController(new BonService(new AffectationRepository()));

const router = Router();
router.use(authenticate, auditExport);

router.get('/:num', controller.obtenir);
router.get('/:num/pdf', controller.pdf);

export default router;