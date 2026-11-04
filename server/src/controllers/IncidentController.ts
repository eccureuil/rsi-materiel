import type { Request, Response } from 'express';
import {
  declarerIncidentSchema,
  intervenirSchema,
  listIncidentsQuerySchema,
  numParamSchema,
  rejeterSchema,
} from '../models/incident.js';
import type { IncidentService } from '../services/IncidentService.js';
import { getAuthUser } from '../utils/requestUser.js';

export class IncidentController {
  constructor(private readonly service: IncidentService) {}

  lister = async (req: Request, res: Response): Promise<void> => {
    const filters = listIncidentsQuerySchema.parse(req.query);
    res.json(await this.service.lister(filters));
  };

  obtenir = async (req: Request, res: Response): Promise<void> => {
    const { num } = numParamSchema.parse(req.params);
    res.json({ incident: await this.service.obtenir(num) });
  };

  declarer = async (req: Request, res: Response): Promise<void> => {
    const dto = declarerIncidentSchema.parse(req.body);
    const incident = await this.service.declarer(dto, getAuthUser(req).matricule);
    res.status(201).json({ incident });
  };

  intervenir = async (req: Request, res: Response): Promise<void> => {
    const { num } = numParamSchema.parse(req.params);
    const dto = intervenirSchema.parse(req.body ?? {});
    res.json({ incident: await this.service.intervenir(num, dto, getAuthUser(req).matricule) });
  };

  rejeter = async (req: Request, res: Response): Promise<void> => {
    const { num } = numParamSchema.parse(req.params);
    rejeterSchema.parse(req.body);
    res.json({ incident: await this.service.rejeter(num) });
  };

  cloturer = async (req: Request, res: Response): Promise<void> => {
    const { num } = numParamSchema.parse(req.params);
    res.json({ incident: await this.service.cloturer(num) });
  };
}