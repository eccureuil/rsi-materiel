import type { Request, Response } from 'express';
import { listAuditQuerySchema } from '../models/audit.js';
import type { AuditService } from '../services/AuditService.js';

export class AuditController {
  constructor(private readonly service: AuditService) {}

  lister = async (req: Request, res: Response): Promise<void> => {
    const filters = listAuditQuerySchema.parse(req.query);
    res.json(await this.service.lister(filters));
  };
}