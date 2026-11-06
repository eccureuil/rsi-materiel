import type { DegreUrgence, StatutIncident } from './incident.js';
import type { StatutMateriel, TypeCategorie } from './materiel.js';

export type IncidentResume = {
  num_incident: string;
  code_materiel: string;
  marque: string | null;
  modele: string | null;
  nom_service: string;
  degre_urgence: DegreUrgence;
  statut_incident: StatutIncident;
  date_declaration: string;
};

export type PieceAlerte = {
  ref_piece: string;
  designation: string;
  quantite_en_stock: number;
  seuil_minimum: number;
};

export type DashboardStats = {
  genere_le: string;
  materiels: {
    total: number;
    par_statut: Record<StatutMateriel, number>;
    par_categorie: Record<TypeCategorie, number>;
  };
  incidents: {
    ouverts: number;
    par_statut: Record<StatutIncident, number>;
    ouverts_par_urgence: Record<DegreUrgence, number>;
    par_mois: { mois: string; total: number }[];
    recents_prioritaires: IncidentResume[];
  };
  interventions: {
    en_cours: number;
    terminees_30_jours: number;
    mes_en_cours: number;
    duree_moyenne_heures: number | null;
  };
  stock: {
    total_references: number;
    en_alerte: number;
    en_rupture: number;
    pieces_en_alerte: PieceAlerte[];
  };
};