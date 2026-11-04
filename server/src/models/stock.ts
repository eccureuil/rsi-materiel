import { z } from 'zod';

export type Piece = {
  ref_piece: string;
  designation: string;
  quantite_en_stock: number;
  seuil_minimum: number;
  en_alerte: boolean;
};

export type PieceVerrou = {
  ref_piece: string;
  designation: string;
  quantite_en_stock: number;
  seuil_minimum: number;
};

export type Imputation = {
  id_imputation: number;
  num_intervention: string;
  ref_piece: string;
  designation: string;
  quantite_utilisee: number;
  date_imputation: string;
};

const QUANTITE_MAX = 1_000_000;

export const refParamSchema = z.object({ ref: z.string().trim().min(1).max(30) });
export const imputationParamSchema = z.object({
  num: z.string().trim().min(1).max(30),
  id: z.coerce.number().int().positive(),
});

export const createPieceSchema = z.object({
  ref_piece: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._-]{1,30}$/, 'Référence invalide : 1 à 30 caractères (lettres, chiffres, . _ -).'),
  designation: z.string().trim().min(1, 'La désignation est requise.').max(100),
  // RG_STOCK_01 : jamais de quantité négative
  quantite_en_stock: z.number().int().min(0, 'La quantité en stock ne peut pas être négative.').max(QUANTITE_MAX).default(0),
  seuil_minimum: z.number().int().min(0).max(QUANTITE_MAX).default(1),
});
export type CreatePieceDto = z.infer<typeof createPieceSchema>;

export const updatePieceSchema = z.object({
  designation: z.string().trim().min(1, 'La désignation est requise.').max(100),
  seuil_minimum: z.number().int().min(0).max(QUANTITE_MAX),
});
export type UpdatePieceDto = z.infer<typeof updatePieceSchema>;

export const approvisionnerSchema = z.object({
  quantite: z.number().int().positive('La quantité doit être supérieure à 0.').max(QUANTITE_MAX),
});

export const ajusterSchema = z.object({
  quantite_en_stock: z.number().int().min(0, 'La quantité en stock ne peut pas être négative.').max(QUANTITE_MAX),
  motif: z.string().trim().min(3, "Le motif de l'ajustement est requis.").max(500),
});

export const imputerSchema = z.object({
  ref_piece: z.string().trim().min(1, 'La référence de la pièce est requise.').max(30),
  quantite_utilisee: z.number().int().positive('La quantité utilisée doit être supérieure à 0.').max(QUANTITE_MAX),
});
export type ImputerDto = z.infer<typeof imputerSchema>;

const boolStr = z.enum(['true', 'false']).transform((v) => v === 'true');

export const listPiecesQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  sous_seuil: boolStr.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListPiecesQuery = z.infer<typeof listPiecesQuerySchema>;