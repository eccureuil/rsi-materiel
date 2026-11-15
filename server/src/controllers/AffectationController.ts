import type { Request, Response } from 'express';
import { createAffectationSchema, listAffectationsQuerySchema } from '../models/affectation.js';
import { idParamSchema } from '../models/common.js';
import type { AffectationService } from '../services/AffectationService.js';

export class AffectationController {
  constructor(private readonly service: AffectationService) {}

  lister = async (req: Request, res: Response): Promise<void> => {
    const filters = listAffectationsQuerySchema.parse(req.query);
    res.json(await this.service.lister(filters));
  };

  obtenir = async (req: Request, res: Response): Promise<void> => {
    const { id } = idParamSchema.parse(req.params);
    res.json({ affectation: await this.service.obtenir(id) });
  };

  creer = async (req: Request, res: Response): Promise<void> => {
    const dto = createAffectationSchema.parse(req.body);
    res.status(201).json(await this.service.creer(dto));
  };

  genererBon = async (req: Request, res: Response): Promise<void> => {
    const { id } = idParamSchema.parse(req.params);
    res.status(201).json({ bon: await this.service.genererBon(id) });
  };
}