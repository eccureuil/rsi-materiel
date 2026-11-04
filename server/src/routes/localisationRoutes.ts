import { Router } from 'express';
import { LocalisationController } from '../controllers/LocalisationController.js';
import { auditTrail } from '../middlewares/auditTrail.js';
import { authenticate } from '../middlewares/authenticate.js';
import { LocalisationRepository } from '../repositories/LocalisationRepository.js';
import { LocalisationService } from '../services/LocalisationService.js';

const controller = new LocalisationController(new LocalisationService(new LocalisationRepository()));

const router = Router();
// Accessible à tout utilisateur connecté ; chaque action est journalisée
router.use(authenticate, auditTrail);

router.get('/', controller.lister);
router.get('/:id', controller.obtenir);
router.post('/', controller.creer);
router.put('/:id', controller.modifier);
router.delete('/:id', controller.supprimer);

export default router;