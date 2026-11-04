import type { Request, Response } from 'express';
import { codeParamSchema } from '../models/common.js';
import {
  createMaterielSchema,
  listMaterielsQuerySchema,
  updateMaterielSchema,
} from '../models/materiel.js';
import type { MaterielService } from '../services/MaterielService.js';

export class MaterielController {
  constructor(private readonly service: MaterielService) {}

  lister = async (req: Request, res: Response): Promise<void> => {
    const filters = listMaterielsQuerySchema.parse(req.query);
    res.json(await this.service.lister(filters));
  };

  obtenir = async (req: Request, res: Response): Promise<void> => {
    const { code } = codeParamSchema.parse(req.params);
    res.json({ materiel: await this.service.obtenir(code) });
  };

  creer = async (req: Request, res: Response): Promise<void> => {
    const dto = createMaterielSchema.parse(req.body);
    res.status(201).json({ materiel: await this.service.creer(dto) });
  };

  modifier = async (req: Request, res: Response): Promise<void> => {
    const { code } = codeParamSchema.parse(req.params);
    const dto = updateMaterielSchema.parse(req.body);
    res.json({ materiel: await this.service.modifier(code, dto) });
  };

  supprimer = async (req: Request, res: Response): Promise<void> => {
    const { code } = codeParamSchema.parse(req.params);
    await this.service.supprimer(code);
    res.status(204).send();
  };
}