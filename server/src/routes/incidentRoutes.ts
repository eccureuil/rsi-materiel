import { Router } from 'express';
import { IncidentController } from '../controllers/IncidentController.js';
import { auditTrail } from '../middlewares/auditTrail.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/authorize.js';
import { IncidentRepository } from '../repositories/IncidentRepository.js';
import { InterventionRepository } from '../repositories/InterventionRepository.js';
import { IncidentService } from '../services/IncidentService.js';

const controller = new IncidentController(
  new IncidentService(new IncidentRepository(), new InterventionRepository()),
);

const router = Router();
router.use(authenticate, auditTrail);

router.get('/', controller.lister);
router.get('/:num', controller.obtenir);
router.post('/', controller.declarer);
// Seuls les cadres de maintenance peuvent intervenir (clé étrangère vers cadres_maintenance)
router.post('/:num/intervenir', requireRole('CADRE_MAINTENANCE'), controller.intervenir);
router.post('/:num/rejeter', controller.rejeter);
router.post('/:num/cloturer', controller.cloturer);

export default router;