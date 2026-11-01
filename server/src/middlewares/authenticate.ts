import type { NextFunction, Request, Response } from 'express';
import { COOKIE_NAME } from '../config/cookie.js';
import type { AuthUser } from '../models/auth.js';
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

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const raw: unknown = req.cookies?.[COOKIE_NAME];
  if (typeof raw !== 'string' || raw.length === 0) {
    next(new AppError(401, 'Authentification requise.'));
    return;
  }
  const claims = verifyToken(raw);
  req.user = { matricule: claims.sub, role: claims.role };
  next();
}