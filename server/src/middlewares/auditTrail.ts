import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { AuditRepository } from '../repositories/AuditRepository.js';

const audit = new AuditRepository();

const VERBES: Record<string, string> = {
  GET: 'CONSULTATION',
  HEAD: 'CONSULTATION',
  POST: 'CREATION',
  PUT: 'MODIFICATION',
  PATCH: 'MODIFICATION',
  DELETE: 'SUPPRESSION',
};

const CLES_SENSIBLES = /mot_de_passe|password|token|secret/i;

function corpsRedige(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const entries = Object.entries(body).map(([cle, valeur]) => [
    cle,
    CLES_SENSIBLES.test(cle) ? '***' : valeur,
  ]);
  if (entries.length === 0) return null;
  const json = JSON.stringify(Object.fromEntries(entries));
  return json.length > 1500 ? `${json.slice(0, 1500)}…` : json;
}

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

  res.on('finish', () => {
    const user = req.user;
    if (!user) return;

    const ressource =
      baseUrl.split('/').filter(Boolean).slice(1).join('_').toUpperCase() || 'API';
    const action = `${VERBES[methode] ?? methode}_${ressource}`;

    const parties = [`${methode} ${url} -> ${res.statusCode}`];
    const corps = lecture ? null : corpsRedige(req.body);
    if (corps) parties.push(`corps=${corps}`);

    audit.log(user.matricule, action, parties.join(' | ')).catch((err: unknown) => {
      console.error("Échec d'écriture dans le journal d'audit :", err);
    });
  });

  next();
}