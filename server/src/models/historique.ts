import { z } from 'zod';
import type { Materiel } from './materiel.js';

export const TYPES_EVENEMENT = [
  'ACQUISITION',
  'MOUVEMENT',
  'INCIDENT',
  'INTERVENTION_DEBUT',
  'PIECE_UTILISEE',
  'INTERVENTION_FIN',
] as const;
export type TypeEvenement = (typeof TYPES_EVENEMENT)[number];

export type Evenement = {
  code_materiel: string;
  marque: string | null;
  modele: string | null;
  type_evenement: TypeEvenement;
  date_evenement: string;
  reference: string | null;
  details: Record<string, string | number | null>;
};

export type SyntheseMateriel = {
  nb_mouvements: number;
  nb_incidents: number;
  nb_incidents_ouverts: number;
  nb_interventions: number;
  nb_pieces_utilisees: number;
  duree_moyenne_reparation_heures: number | null;
  indisponibilite_totale_heures: number | null;
  incident_ouvert: string | null;
  dernier_mouvement: string | null;
};

export type HistoriqueMateriel = {
  materiel: Materiel;
  synthese: SyntheseMateriel;
  total: number;
  tronque: boolean;
  evenements: Evenement[];
};

export type FiltresHistorique = {
  code_materiel?: string;
  types?: TypeEvenement[];
  du?: string;
  au?: string;
  ordre: 'asc' | 'desc';
  page: number;
  limit: number;
};

// ?types=MOUVEMENT,INCIDENT
const typesSchema = z
  .string()
  .trim()
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  )
  .pipe(z.array(z.enum(TYPES_EVENEMENT)).min(1, 'Indiquez au moins un type.'))
  .optional();

const filtresCommuns = {
  types: typesSchema,
  du: z.iso.date('Date invalide (format AAAA-MM-JJ).').optional(),
  au: z.iso.date('Date invalide (format AAAA-MM-JJ).').optional(),
  ordre: z.enum(['asc', 'desc']).default('desc'),
};

export const listHistoriqueQuerySchema = z.object({
  code_materiel: z.string().trim().max(30).optional(),
  ...filtresCommuns,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type ListHistoriqueQuery = z.infer<typeof listHistoriqueQuerySchema>;

export const historiqueMaterielQuerySchema = z.object({ ...filtresCommuns });
export type HistoriqueMaterielQuery = z.infer<typeof historiqueMaterielQuerySchema>;