import { Router } from 'express';
import { UtilisateurController } from '../controllers/UtilisateurController.js';
import { auditTrail } from '../middlewares/auditTrail.js';
import { authenticate } from '../middlewares/authenticate.js';
import { UtilisateurRepository } from '../repositories/UtilisateurRepository.js';
import { UtilisateurService } from '../services/UtilisateurService.js';

const controller = new UtilisateurController(new UtilisateurService(new UtilisateurRepository()));

const router = Router();
router.use(authenticate, auditTrail);

router.put('/mot-de-passe', controller.changerSonMotDePasse);

export default router;