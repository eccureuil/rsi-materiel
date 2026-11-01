import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/errorHandler.js';
import { jwtClaimsSchema } from '../models/auth.js';
import type { Role, TokenClaims } from '../models/auth.js';

export function signToken(matricule: string, role: Role): string {
  return jwt.sign({ role }, env.JWT_SECRET, {
    subject: matricule,
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): TokenClaims {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw new AppError(401, 'Session invalide ou expirée.');
  }
  const parsed = jwtClaimsSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new AppError(401, 'Session invalide.');
  }
  return parsed.data;
}