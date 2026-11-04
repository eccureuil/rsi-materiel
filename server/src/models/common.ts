import { z } from 'zod';

// Texte optionnel : vide ou absent => null (colonnes NULLABLE)
export const texteOptionnel = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v == null || v === '' ? null : v));

// RG_MATERIEL_02 : vide ou absent => 'INCONNU'
export const valeurOuInconnu = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v == null || v === '' ? 'INCONNU' : v));

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
export const codeParamSchema = z.object({ code: z.string().trim().min(1).max(30) });