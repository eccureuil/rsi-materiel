import { Router } from 'express';
import { StockController } from '../controllers/StockController.js';
import { auditTrail } from '../middlewares/auditTrail.js';
import { authenticate } from '../middlewares/authenticate.js';
import { InterventionRepository } from '../repositories/InterventionRepository.js';
import { StockRepository } from '../repositories/StockRepository.js';
import { StockService } from '../services/StockService.js';

const controller = new StockController(
  new StockService(new StockRepository(), new InterventionRepository()),
);

const router = Router();
// Accessible à tout utilisateur connecté ; chaque action est journalisée
router.use(authenticate, auditTrail);

router.get('/', controller.lister);
router.get('/:ref', controller.obtenir);
router.post('/', controller.creer);
router.put('/:ref', controller.modifier);
router.delete('/:ref', controller.supprimer);
router.post('/:ref/approvisionner', controller.approvisionner);
router.post('/:ref/ajuster', controller.ajuster);

export default router;