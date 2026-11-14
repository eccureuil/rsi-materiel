import type { Request, Response } from 'express';
import { codeParamSchema } from '../models/common.js';
import { historiqueMaterielQuerySchema, listHistoriqueQuerySchema } from '../models/historique.js';
import type { HistoriqueService } from '../services/HistoriqueService.js';

export class HistoriqueController {
  constructor(private readonly service: HistoriqueService) {}

  lister = async (req: Request, res: Response): Promise<void> => {
    const filters = listHistoriqueQuerySchema.parse(req.query);
    res.json(await this.service.lister(filters));
  };

  parMateriel = async (req: Request, res: Response): Promise<void> => {
    const { code } = codeParamSchema.parse(req.params);
    const filters = historiqueMaterielQuerySchema.parse(req.query);
    res.json(await this.service.parMateriel(code, filters));
  };
}