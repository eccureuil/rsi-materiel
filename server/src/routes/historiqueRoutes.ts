import { Router } from 'express';
import { HistoriqueController } from '../controllers/HistoriqueController.js';
import { auditTrail } from '../middlewares/auditTrail.js';
import { authenticate } from '../middlewares/authenticate.js';
import { HistoriqueRepository } from '../repositories/HistoriqueRepository.js';
import { MaterielRepository } from '../repositories/MaterielRepository.js';
import { HistoriqueService } from '../services/HistoriqueService.js';

const controller = new HistoriqueController(
  new HistoriqueService(new HistoriqueRepository(), new MaterielRepository()),
);

// GET /api/historique : fil d'activité de tous les matériels
export const historiqueGlobalRouter = Router();
historiqueGlobalRouter.use(authenticate, auditTrail);
historiqueGlobalRouter.get('/', controller.lister);

// GET /api/materiels/:code/historique : fiche de vie d'un matériel.
// Middlewares posés sur la route (et non sur le routeur) pour ne pas intercepter les autres routes /api/materiels.
export const historiqueMaterielRouter = Router();
historiqueMaterielRouter.get('/:code/historique', authenticate, auditTrail, controller.parMateriel);