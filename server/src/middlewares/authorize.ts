import type { RequestHandler } from 'express';
import type { Role } from '../models/auth.js';
import { AppError } from './errorHandler.js';

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError(401, 'Authentification requise.'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'Accès refusé : droits insuffisants.'));
      return;
    }
    next();
  };
}