import type { NextFunction, Request, Response } from 'express';
import { COOKIE_NAME } from '../config/cookie.js';
import type { AuthUser } from '../models/auth.js';
import { UtilisateurRepository } from '../repositories/UtilisateurRepository.js';
import { verifyToken } from '../services/TokenService.js';
import { AppError } from './errorHandler.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const utilisateurs = new UtilisateurRepository();

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const raw: unknown = req.cookies?.[COOKIE_NAME];
  if (typeof raw !== 'string' || raw.length === 0) {
    next(new AppError(401, 'Authentification requise.'));
    return;
  }
  const claims = verifyToken(raw);

  // RG_COMPTE_01 : un compte désactivé est refusé immédiatement (une lecture par clé primaire)
  const statut = await utilisateurs.findStatut(claims.sub);
  if (statut !== 'ACTIF') {
    throw new AppError(401, 'Compte inactif ou inexistant.');
  }

  req.user = { matricule: claims.sub, role: claims.role };
  next();
}