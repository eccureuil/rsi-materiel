import type { Request, Response } from 'express';
import { listIncidentsQuerySchema, numParamSchema } from '../models/incident.js';
import { listMaterielsQuerySchema } from '../models/materiel.js';
import { listPiecesQuerySchema } from '../models/stock.js';
import type { ExportService } from '../services/ExportService.js';

const filtresMateriels = listMaterielsQuerySchema.omit({ page: true, limit: true });
const filtresIncidents = listIncidentsQuerySchema.omit({ page: true, limit: true });
const filtresPieces = listPiecesQuerySchema.omit({ page: true, limit: true });

function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}

function envoyerCsv(res: Response, nomFichier: string, contenu: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(contenu);
}

function envoyerPdf(res: Response, nomFichier: string, contenu: Buffer, telecharger: boolean): void {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${telecharger ? 'attachment' : 'inline'}; filename="${nomFichier}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(contenu);
}

export class ExportController {
  constructor(private readonly service: ExportService) {}

  csvMateriels = async (req: Request, res: Response): Promise<void> => {
    const filtres = filtresMateriels.parse(req.query);
    envoyerCsv(res, `inventaire-materiels-${aujourdhui()}.csv`, await this.service.csvMateriels(filtres));
  };

  pdfMateriels = async (req: Request, res: Response): Promise<void> => {
    const filtres = filtresMateriels.parse(req.query);
    envoyerPdf(res, `inventaire-materiels-${aujourdhui()}.pdf`, await this.service.pdfMateriels(filtres), false);
  };

  csvIncidents = async (req: Request, res: Response): Promise<void> => {
    const filtres = filtresIncidents.parse(req.query);
    envoyerCsv(res, `incidents-${aujourdhui()}.csv`, await this.service.csvIncidents(filtres));
  };

  csvPieces = async (req: Request, res: Response): Promise<void> => {
    const filtres = filtresPieces.parse(req.query);
    envoyerCsv(res, `stock-pieces-${aujourdhui()}.csv`, await this.service.csvPieces(filtres));
  };

  pdfFicheIntervention = async (req: Request, res: Response): Promise<void> => {
    const { num } = numParamSchema.parse(req.params);
    envoyerPdf(res, `fiche-${num}.pdf`, await this.service.pdfFicheIntervention(num), false);
  };
}