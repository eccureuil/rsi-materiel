import { Router } from 'express';
import { InterventionController } from '../controllers/InterventionController.js';
import { StockController } from '../controllers/StockController.js';
import { auditTrail } from '../middlewares/auditTrail.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/authorize.js';
import { IncidentRepository } from '../repositories/IncidentRepository.js';
import { InterventionRepository } from '../repositories/InterventionRepository.js';
import { StockRepository } from '../repositories/StockRepository.js';
import { InterventionService } from '../services/InterventionService.js';
import { StockService } from '../services/StockService.js';

const interventionRepo = new InterventionRepository();
const controller = new InterventionController(
  new InterventionService(interventionRepo, new IncidentRepository()),
);
const stockController = new StockController(new StockService(new StockRepository(), interventionRepo));

const router = Router();
router.use(authenticate, auditTrail);

router.get('/', controller.lister);
router.get('/:num', controller.obtenir);
router.put('/:num', requireRole('CADRE_MAINTENANCE'), controller.mettreAJour);
router.post('/:num/terminer', requireRole('CADRE_MAINTENANCE'), controller.terminer);

// Pièces utilisées pendant l'intervention (UC05)
router.get('/:num/pieces', stockController.listerImputations);
router.post('/:num/pieces', requireRole('CADRE_MAINTENANCE'), stockController.imputer);
router.delete('/:num/pieces/:id', requireRole('CADRE_MAINTENANCE'), stockController.annulerImputation);

export default router;