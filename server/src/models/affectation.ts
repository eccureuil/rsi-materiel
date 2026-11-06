import { z } from 'zod';
import { texteOptionnel } from './common.js';

export const TYPES_MOUVEMENT = ['AFFECTATION', 'MUTATION', 'RESTITUTION'] as const;
export type TypeMouvement = (typeof TYPES_MOUVEMENT)[number];

export type LocalisationRef = {
  id_localisation: number;
  nom_service: string;
  code_bureau: string | null;
  ville: string;
};

export type Affectation = {
  id_affectation: number;
  code_materiel: string;
  marque: string | null;
  modele: string | null;
  id_localisation: number;
  nom_service: string;
  code_bureau: string | null;
  ville: string;
  date_mouvement: string;
  type_mouvement: TypeMouvement;
  agent_beneficiaire: string;
  motif_mouvement: string | null;
  num_bon: string | null;
};

export type BonDecharge = {
  num_bon: string;
  id_affectation: number;
  date_emission: string;
  chemin_fichier_pdf: string | null;
  type_mouvement: TypeMouvement;
  date_mouvement: string;
  agent_beneficiaire: string;
  motif_mouvement: string | null;
  code_materiel: string;
  marque: string | null;
  modele: string | null;
  num_serie: string | null;
  type_categorie: string;
  type_equipement: string | null;
  systeme_aviation: string | null;
  caracteristiques: string | null;
  destination: LocalisationRef;
  origine: LocalisationRef | null;
};

export const createAffectationSchema = z.object({
  code_materiel: z.string().trim().min(1, 'Le code matériel est requis.').max(30),
  type_mouvement: z.enum(TYPES_MOUVEMENT),
  id_localisation: z.number().int().positive(),
  agent_beneficiaire: z.string().trim().min(1, "Le nom de l'agent est requis.").max(100),
  motif_mouvement: texteOptionnel(1000),
  generer_bon: z.boolean().optional(),
});
export type CreateAffectationDto = z.infer<typeof createAffectationSchema>;

export const listAffectationsQuerySchema = z.object({
  code_materiel: z.string().trim().max(30).optional(),
  type_mouvement: z.enum(TYPES_MOUVEMENT).optional(),
  id_localisation: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListAffectationsQuery = z.infer<typeof listAffectationsQuerySchema>;

export const numBonParamSchema = z.object({
  num: z.string().trim().regex(/^BD-\d{4}-\d{5}$/, 'Numéro de bon invalide.'),
});

const boolStr = z.enum(['true', 'false']).transform((v) => v === 'true');
export const pdfQuerySchema = z.object({ telecharger: boolStr.optional() });