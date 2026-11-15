import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { AuditRepository } from '../repositories/AuditRepository.js';
import { decrireOperation, type ReferencesAudit } from '../utils/auditDescription.js';
import { referencesDepuisBody } from '../utils/auditReferences.js';

const audit = new AuditRepository();

const VERBES: Record<string, string> = {
  GET: 'CONSULTATION',
  HEAD: 'CONSULTATION',
  POST: 'CREATION',
  PUT: 'MODIFICATION',
  PATCH: 'MODIFICATION',
  DELETE: 'SUPPRESSION',
};

// À placer après `authenticate` : journalise chaque action de l'utilisateur connecté.
export function auditTrail(req: Request, res: Response, next: NextFunction): void {
  const lecture = req.method === 'GET' || req.method === 'HEAD';
  if (lecture && !env.AUDIT_LOG_READS) {
    next();
    return;
  }

  const baseUrl = req.baseUrl;
  const url = req.originalUrl;
  const methode = req.method;
  const body = req.body as unknown;

  res.on('finish', () => {
    void (async () => {
      const user = req.user;
      if (!user) return;

      const ressource =
        baseUrl.split('/').filter(Boolean).slice(1).join('_').toUpperCase() || 'API';
      const action = `${VERBES[methode] ?? methode}_${ressource}`;
      const corps = lecture ? undefined : body;

      let references: ReferencesAudit | undefined;
      try {
        references = await referencesDepuisBody(corps);
      } catch (err) {
        console.error("Impossible de résoudre la localisation d'origine :", err);
      }

      const details = decrireOperation(methode, url, res.statusCode, corps, references);
      await audit.log(user.matricule, action, details);
    })().catch((err: unknown) => {
      console.error("Échec d'écriture dans le journal d'audit :", err);
    });
  });

  next();
}