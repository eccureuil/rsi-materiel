import { Router } from 'express';
import { MaterielController } from '../controllers/MaterielController.js';
import { auditTrail } from '../middlewares/auditTrail.js';
import { authenticate } from '../middlewares/authenticate.js';
import { LocalisationRepository } from '../repositories/LocalisationRepository.js';
import { MaterielRepository } from '../repositories/MaterielRepository.js';
import { MaterielService } from '../services/MaterielService.js';

const controller = new MaterielController(
  new MaterielService(new MaterielRepository(), new LocalisationRepository()),
);

const router = Router();
// Accessible à tout utilisateur connecté ; chaque action est journalisée
router.use(authenticate, auditTrail);

router.get('/', controller.lister);
router.get('/:code', controller.obtenir);
router.post('/', controller.creer);
router.put('/:code', controller.modifier);
router.delete('/:code', controller.supprimer);

export default router;