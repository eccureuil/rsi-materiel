import type { Request } from 'express';
import { AppError } from '../middlewares/errorHandler.js';
import type { AuthUser } from '../models/auth.js';

export function getAuthUser(req: Request): AuthUser {
  if (!req.user) {
    throw new AppError(401, 'Authentification requise.');
  }
  return req.user;
}