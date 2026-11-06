import { Router } from 'express';
import { ExportController } from '../controllers/ExportController.js';
import { auditExport } from '../middlewares/auditExport.js';
import { authenticate } from '../middlewares/authenticate.js';
import { IncidentRepository } from '../repositories/IncidentRepository.js';
import { InterventionRepository } from '../repositories/InterventionRepository.js';
import { MaterielRepository } from '../repositories/MaterielRepository.js';
import { StockRepository } from '../repositories/StockRepository.js';
import { ExportService } from '../services/ExportService.js';

const controller = new ExportController(
  new ExportService(
    new MaterielRepository(),
    new IncidentRepository(),
    new StockRepository(),
    new InterventionRepository(),
  ),
);

const router = Router();
router.use(authenticate, auditExport);

router.get('/materiels/csv', controller.csvMateriels);
router.get('/materiels/pdf', controller.pdfMateriels);
router.get('/incidents/csv', controller.csvIncidents);
router.get('/pieces/csv', controller.csvPieces);
router.get('/interventions/:num/pdf', controller.pdfFicheIntervention);

export default router;