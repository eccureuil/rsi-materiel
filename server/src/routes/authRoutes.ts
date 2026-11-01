import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { AuditRepository } from '../repositories/AuditRepository.js';
import { UtilisateurRepository } from '../repositories/UtilisateurRepository.js';
import { AuthService } from '../services/AuthService.js';

const authService = new AuthService(new UtilisateurRepository(), new AuditRepository());
const controller = new AuthController(authService);

const router = Router();

router.post('/login', controller.login);
router.post('/logout', controller.logout);
router.get('/me', authenticate, controller.me);

export default router;