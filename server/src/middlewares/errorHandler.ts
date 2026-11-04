import type { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

type PgErrorLike = { code: string; constraint?: string };

function isPgError(err: unknown): err is PgErrorLike {
  return typeof err === 'object' && err !== null && 'code' in err && typeof err.code === 'string';
}

const MESSAGES_UNICITE: Record<string, string> = {
  materiels_pkey: 'Ce code matériel existe déjà.',
  materiels_num_serie_key: 'Ce numéro de série est déjà enregistré.',
  pieces_detachees_pkey: 'Cette référence de pièce existe déjà.',
};

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: 'Ressource introuvable.' });
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Données invalides.',
      details: z.flattenError(err).fieldErrors,
    });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }
  if ('type' in err && err.type === 'entity.parse.failed') {
    res.status(400).json({ message: 'Corps de requête JSON invalide.' });
    return;
  }
  if (isPgError(err)) {
    if (err.code === '23505') {
      const msg = err.constraint !== undefined ? MESSAGES_UNICITE[err.constraint] : undefined;
      res.status(409).json({ message: msg ?? 'Cette valeur existe déjà.' });
      return;
    }
    if (err.code === '23503') {
      res.status(409).json({
        message: "Opération impossible : cet élément est référencé par d'autres données.",
      });
      return;
    }
    if (err.code === '23514') {
      res.status(400).json({ message: 'Valeur refusée par une règle de gestion.' });
      return;
    }
  }
  console.error(err);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
}