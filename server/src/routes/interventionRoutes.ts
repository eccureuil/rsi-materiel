import { Router } from 'express';
import { InterventionController } from '../controllers/InterventionController.js';
import { auditTrail } from '../middlewares/auditTrail.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/authorize.js';
import { IncidentRepository } from '../repositories/IncidentRepository.js';
import { InterventionRepository } from '../repositories/InterventionRepository.js';
import { InterventionService } from '../services/InterventionService.js';

const controller = new InterventionController(
  new InterventionService(new InterventionRepository(), new IncidentRepository()),
);

const router = Router();
router.use(authenticate, auditTrail);

router.get('/', controller.lister);
router.get('/:num', controller.obtenir);
router.put('/:num', requireRole('CADRE_MAINTENANCE'), controller.mettreAJour);
router.post('/:num/terminer', requireRole('CADRE_MAINTENANCE'), controller.terminer);

export default router;