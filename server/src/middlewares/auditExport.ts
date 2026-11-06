import type { NextFunction, Request, Response } from 'express';
import { AuditRepository } from '../repositories/AuditRepository.js';

const audit = new AuditRepository();

// Journalise TOUS les téléchargements (y compris les GET), à placer après `authenticate`.
export function auditExport(req: Request, res: Response, next: NextFunction): void {
  const baseUrl = req.baseUrl;
  const url = req.originalUrl;
  const methode = req.method;

  res.on('finish', () => {
    const user = req.user;
    if (!user) return;
    const ressource = baseUrl.split('/').filter(Boolean).slice(1).join('_').toUpperCase() || 'API';
    audit
      .log(user.matricule, `TELECHARGEMENT_${ressource}`, `${methode} ${url} -> ${res.statusCode}`)
      .catch((err: unknown) => {
        console.error("Échec d'écriture dans le journal d'audit :", err);
      });
  });

  next();
}