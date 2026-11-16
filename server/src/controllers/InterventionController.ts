import type { Request, Response } from 'express';
import {
  compteRenduParamSchema,
  compteRenduSchema,
  listInterventionsQuerySchema,
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

  ajouterCompteRendu = async (req: Request, res: Response): Promise<void> => {
    const { num } = numParamSchema.parse(req.params);
    const dto = compteRenduSchema.parse(req.body);
    res.json({
      intervention: await this.service.ajouterCompteRendu(num, dto, getAuthUser(req).matricule),
    });
  };

  modifierCompteRendu = async (req: Request, res: Response): Promise<void> => {
    const { num, id } = compteRenduParamSchema.parse(req.params);
    const dto = compteRenduSchema.parse(req.body);
    res.json({
      intervention: await this.service.modifierCompteRendu(
        num,
        id,
        dto,
        getAuthUser(req).matricule,
      ),
    });
  };

  supprimerCompteRendu = async (req: Request, res: Response): Promise<void> => {
    const { num, id } = compteRenduParamSchema.parse(req.params);
    res.json({
      intervention: await this.service.supprimerCompteRendu(num, id, getAuthUser(req).matricule),
    });
  };

  terminer = async (req: Request, res: Response): Promise<void> => {
    const { num } = numParamSchema.parse(req.params);
    const dto = terminerFicheSchema.parse(req.body);
    res.json({ intervention: await this.service.terminer(num, dto, getAuthUser(req).matricule) });
  };
}