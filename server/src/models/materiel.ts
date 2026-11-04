import { z } from 'zod';
import { texteOptionnel, valeurOuInconnu } from './common.js';

export const TYPES_CATEGORIE = ['BUREAUTIQUE', 'OPERATIONNEL'] as const;
export const STATUTS_MATERIEL = ['STOCK', 'SERVICE', 'PANNE', 'MAINTENANCE', 'REFORME'] as const;

export type TypeCategorie = (typeof TYPES_CATEGORIE)[number];
export type StatutMateriel = (typeof STATUTS_MATERIEL)[number];

export type Materiel = {
  code_materiel: string;
  num_serie: string | null;
  marque: string | null;
  modele: string | null;
  date_acquisition: string;
  statut_materiel: StatutMateriel;
  caracteristiques: string | null;
  type_categorie: TypeCategorie;
  type_equipement: string | null;
  systeme_aviation: string | null;
  id_localisation: number;
  nom_service: string;
  code_bureau: string | null;
  ville: string;
};

const materielBase = z.object({
  num_serie: texteOptionnel(50),
  marque: valeurOuInconnu(50),
  modele: valeurOuInconnu(50),
  date_acquisition: z.iso.date('Date invalide (format AAAA-MM-JJ).'),
  statut_materiel: z.enum(STATUTS_MATERIEL).default('STOCK'),
  caracteristiques: texteOptionnel(5000),
  type_categorie: z.enum(TYPES_CATEGORIE),
  type_equipement: texteOptionnel(50),
  systeme_aviation: texteOptionnel(50),
  id_localisation: z.number().int().positive(),
});

export const updateMaterielSchema = materielBase;
export type MaterielDto = z.infer<typeof materielBase>;

export const createMaterielSchema = materielBase.extend({
  code_materiel: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._-]{1,30}$/, 'Code invalide : 1 à 30 caractères (lettres, chiffres, . _ -).'),
});
export type CreateMaterielDto = z.infer<typeof createMaterielSchema>;

export const listMaterielsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  type_categorie: z.enum(TYPES_CATEGORIE).optional(),
  statut_materiel: z.enum(STATUTS_MATERIEL).optional(),
  id_localisation: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListMaterielsQuery = z.infer<typeof listMaterielsQuerySchema>;