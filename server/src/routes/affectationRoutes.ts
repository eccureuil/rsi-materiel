import { Router } from 'express';
import { AffectationController } from '../controllers/AffectationController.js';
import { auditTrail } from '../middlewares/auditTrail.js';
import { authenticate } from '../middlewares/authenticate.js';
import { AffectationRepository } from '../repositories/AffectationRepository.js';
import { AffectationService } from '../services/AffectationService.js';
import { BonService } from '../services/BonService.js';

const repo = new AffectationRepository();
const controller = new AffectationController(new AffectationService(repo, new BonService(repo)));

const router = Router();
// Accessible à tout utilisateur connecté ; chaque mouvement est journalisé
router.use(authenticate, auditTrail);

router.get('/', controller.lister);
router.get('/:id', controller.obtenir);
router.post('/', controller.creer);
router.post('/:id/bon', controller.genererBon);

export default router;