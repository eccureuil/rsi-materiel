import type { Request, Response } from 'express';
import { numBonParamSchema, pdfQuerySchema } from '../models/affectation.js';
import type { BonService } from '../services/BonService.js';

export class BonController {
  constructor(private readonly service: BonService) {}

  obtenir = async (req: Request, res: Response): Promise<void> => {
    const { num } = numBonParamSchema.parse(req.params);
    res.json({ bon: await this.service.obtenir(num) });
  };

  pdf = async (req: Request, res: Response): Promise<void> => {
    const { num } = numBonParamSchema.parse(req.params);
    const { telecharger } = pdfQuerySchema.parse(req.query);
    const contenu = await this.service.fichierPdf(num);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${telecharger ? 'attachment' : 'inline'}; filename="${num}.pdf"`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(contenu);
  };
}