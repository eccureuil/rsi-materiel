import type { Request, Response } from 'express';
import type { DashboardService } from '../services/DashboardService.js';
import { getAuthUser } from '../utils/requestUser.js';

export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  statistiques = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.statistiques(getAuthUser(req).matricule));
  };
}