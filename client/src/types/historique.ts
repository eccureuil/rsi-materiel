// Types miroirs de /api/materiels/:code/historique et /api/historique

import type { Materiel } from '@/types/api';

export type TypeEvenement =
  | 'ACQUISITION'
  | 'MOUVEMENT'
  | 'INCIDENT'
  | 'INTERVENTION_DEBUT'
  | 'COMPTE_RENDU_INTERVENTION'
  | 'PIECE_UTILISEE'
  | 'INTERVENTION_FIN';

export const TYPES_EVENEMENT: TypeEvenement[] = [
  'ACQUISITION',
  'MOUVEMENT',
  'INCIDENT',
  'INTERVENTION_DEBUT',
  'COMPTE_RENDU_INTERVENTION',
  'PIECE_UTILISEE',
  'INTERVENTION_FIN',
];

export interface Evenement {
  code_materiel: string;
  marque: string | null;
  modele: string | null;
  type_evenement: TypeEvenement;
  date_evenement: string;
  reference: string | null;
  details: Record<string, string | number | null>;
}

export interface SyntheseMateriel {
  nb_mouvements: number;
  nb_incidents: number;
  nb_incidents_ouverts: number;
  nb_interventions: number;
  nb_pieces_utilisees: number;
  duree_moyenne_reparation_heures: number | null;
  indisponibilite_totale_heures: number | null;
  incident_ouvert: string | null;
  dernier_mouvement: string | null;
}

export interface HistoriqueMateriel {
  materiel: Materiel;
  synthese: SyntheseMateriel;
  total: number;
  tronque: boolean;
  evenements: Evenement[];
}

export interface FiltresHistoriqueMateriel {
  types?: TypeEvenement[];
  du?: string;
  au?: string;
  ordre?: 'asc' | 'desc';
}

export interface FiltresHistoriqueGlobal {
  code_materiel?: string;
  types?: TypeEvenement[];
  du?: string;
  au?: string;
  ordre?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PageEvenements {
  items: Evenement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}