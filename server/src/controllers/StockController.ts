import type { Request, Response } from 'express';
import { numParamSchema } from '../models/incident.js';
import {
  ajusterSchema,
  approvisionnerSchema,
  createPieceSchema,
  imputationParamSchema,
  imputerSchema,
  listPiecesQuerySchema,
  refParamSchema,
  updatePieceSchema,
} from '../models/stock.js';
import type { StockService } from '../services/StockService.js';
import { getAuthUser } from '../utils/requestUser.js';

export class StockController {
  constructor(private readonly service: StockService) {}

  // --- Pièces ---

  lister = async (req: Request, res: Response): Promise<void> => {
    const filters = listPiecesQuerySchema.parse(req.query);
    res.json(await this.service.lister(filters));
  };

  obtenir = async (req: Request, res: Response): Promise<void> => {
    const { ref } = refParamSchema.parse(req.params);
    res.json({ piece: await this.service.obtenir(ref) });
  };

  creer = async (req: Request, res: Response): Promise<void> => {
    const dto = createPieceSchema.parse(req.body);
    res.status(201).json({ piece: await this.service.creer(dto) });
  };

  modifier = async (req: Request, res: Response): Promise<void> => {
    const { ref } = refParamSchema.parse(req.params);
    const dto = updatePieceSchema.parse(req.body);
    res.json({ piece: await this.service.modifier(ref, dto) });
  };

  supprimer = async (req: Request, res: Response): Promise<void> => {
    const { ref } = refParamSchema.parse(req.params);
    await this.service.supprimer(ref);
    res.status(204).send();
  };

  approvisionner = async (req: Request, res: Response): Promise<void> => {
    const { ref } = refParamSchema.parse(req.params);
    const { quantite } = approvisionnerSchema.parse(req.body);
    res.json({ piece: await this.service.approvisionner(ref, quantite) });
  };

  ajuster = async (req: Request, res: Response): Promise<void> => {
    const { ref } = refParamSchema.parse(req.params);
    const { quantite_en_stock } = ajusterSchema.parse(req.body);
    res.json({ piece: await this.service.ajuster(ref, quantite_en_stock) });
  };

  // --- Imputations (routées sous /api/interventions/:num/pieces) ---

  listerImputations = async (req: Request, res: Response): Promise<void> => {
    const { num } = numParamSchema.parse(req.params);
    res.json({ items: await this.service.listerImputations(num) });
  };

  imputer = async (req: Request, res: Response): Promise<void> => {
    const { num } = numParamSchema.parse(req.params);
    const dto = imputerSchema.parse(req.body);
    const result = await this.service.imputer(num, dto, getAuthUser(req).matricule);
    res.status(201).json(result);
  };

  annulerImputation = async (req: Request, res: Response): Promise<void> => {
    const { num, id } = imputationParamSchema.parse(req.params);
    await this.service.annulerImputation(num, id, getAuthUser(req).matricule);
    res.status(204).send();
  };
}