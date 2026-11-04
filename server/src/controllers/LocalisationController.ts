import type { Request, Response } from 'express';
import { idParamSchema } from '../models/common.js';
import { localisationSchema } from '../models/localisation.js';
import type { LocalisationService } from '../services/LocalisationService.js';

export class LocalisationController {
  constructor(private readonly service: LocalisationService) {}

  lister = async (_req: Request, res: Response): Promise<void> => {
    res.json({ items: await this.service.lister() });
  };

  obtenir = async (req: Request, res: Response): Promise<void> => {
    const { id } = idParamSchema.parse(req.params);
    res.json({ localisation: await this.service.obtenir(id) });
  };

  creer = async (req: Request, res: Response): Promise<void> => {
    const dto = localisationSchema.parse(req.body);
    res.status(201).json({ localisation: await this.service.creer(dto) });
  };

  modifier = async (req: Request, res: Response): Promise<void> => {
    const { id } = idParamSchema.parse(req.params);
    const dto = localisationSchema.parse(req.body);
    res.json({ localisation: await this.service.modifier(id, dto) });
  };

  supprimer = async (req: Request, res: Response): Promise<void> => {
    const { id } = idParamSchema.parse(req.params);
    await this.service.supprimer(id);
    res.status(204).send();
  };
}