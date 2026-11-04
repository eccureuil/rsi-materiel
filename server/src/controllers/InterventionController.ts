import type { Request, Response } from 'express';
import {
  listInterventionsQuerySchema,
  majFicheSchema,
  numParamSchema,
  terminerFicheSchema,
} from '../models/incident.js';
import type { InterventionService } from '../services/InterventionService.js';
import { getAuthUser } from '../utils/requestUser.js';

export class InterventionController {
  constructor(private readonly service: InterventionService) {}

  lister = async (req: Request, res: Response): Promise<void> => {
    const filters = listInterventionsQuerySchema.parse(req.query);
    res.json(await this.service.lister(filters, getAuthUser(req).matricule));
  };

  obtenir = async (req: Request, res: Response): Promise<void> => {
    const { num } = numParamSchema.parse(req.params);
    res.json({ intervention: await this.service.obtenir(num) });
  };

  mettreAJour = async (req: Request, res: Response): Promise<void> => {
    const { num } = numParamSchema.parse(req.params);
    const dto = majFicheSchema.parse(req.body);
    res.json({ intervention: await this.service.mettreAJour(num, dto, getAuthUser(req).matricule) });
  };

  terminer = async (req: Request, res: Response): Promise<void> => {
    const { num } = numParamSchema.parse(req.params);
    const dto = terminerFicheSchema.parse(req.body);
    res.json({ intervention: await this.service.terminer(num, dto, getAuthUser(req).matricule) });
  };
}