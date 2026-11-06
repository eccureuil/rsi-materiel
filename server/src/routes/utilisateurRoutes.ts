import { Router } from 'express';
import { UtilisateurController } from '../controllers/UtilisateurController.js';
import { auditTrail } from '../middlewares/auditTrail.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/authorize.js';
import { UtilisateurRepository } from '../repositories/UtilisateurRepository.js';
import { UtilisateurService } from '../services/UtilisateurService.js';

const controller = new UtilisateurController(new UtilisateurService(new UtilisateurRepository()));

const router = Router();
// Administrateur uniquement ; auditTrail placé avant requireRole pour tracer aussi les refus (403)
router.use(authenticate, auditTrail, requireRole('ADMINISTRATEUR'));

router.get('/', controller.lister);
router.get('/:matricule', controller.obtenir);
router.post('/', controller.creer);
router.put('/:matricule', controller.modifier);
router.patch('/:matricule/statut', controller.changerStatut);
router.post('/:matricule/reinitialiser-mot-de-passe', controller.reinitialiserMotDePasse);

export default router;