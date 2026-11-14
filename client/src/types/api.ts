// Types miroirs des reponses de l'API /api - aucun `any`.

export type Role = 'ADMINISTRATEUR' | 'CADRE_MAINTENANCE';
export type StatutUtilisateur = 'ACTIF' | 'INACTIF';

export interface Utilisateur {
  matricule: string;
  nom: string;
  prenom: string;
  role: Role;
}

export interface UtilisateurComplet extends Utilisateur {
  statut_compte: StatutUtilisateur;
  specialite: string | null;
  niveau_privilege: string | null;
}

export interface UtilisateurCreateInput {
  matricule: string;
  nom: string;
  prenom: string;
  mot_de_passe: string;
  role: Role;
  specialite?: string;
  niveau_privilege?: string;
}

export interface UtilisateurUpdateInput {
  nom: string;
  prenom: string;
  specialite?: string;
  niveau_privilege?: string;
}

export interface ChangementMotDePasseInput {
  ancien_mot_de_passe: string;
  nouveau_mot_de_passe: string;
}

export interface ReinitialisationMotDePasseInput {
  nouveau_mot_de_passe: string;
}

export interface Localisation {
  id_localisation: number;
  nom_service: string;
  code_bureau: string | null;
  ville: string;
  nb_materiels?: number;
}

export interface LocalisationInput {
  nom_service: string;
  code_bureau?: string;
  ville?: string;
}

export type StatutMateriel = 'STOCK' | 'SERVICE' | 'PANNE' | 'MAINTENANCE' | 'REFORME';
export type TypeCategorie = 'BUREAUTIQUE' | 'OPERATIONNEL';

export interface Materiel {
  code_materiel: string;
  num_serie: string | null;
  marque: string;
  modele: string;
  date_acquisition: string;
  statut_materiel: StatutMateriel;
  caracteristiques: string | null;
  type_categorie: TypeCategorie;
  type_equipement: string | null;
  systeme_aviation: string | null;
  id_localisation: number;
  nom_service?: string;
  code_bureau?: string | null;
  ville?: string;
}

export interface MaterielInput {
  code_materiel: string;
  num_serie?: string;
  marque?: string;
  modele?: string;
  date_acquisition: string;
  statut_materiel?: StatutMateriel;
  caracteristiques?: string;
  type_categorie: TypeCategorie;
  type_equipement?: string;
  systeme_aviation?: string;
  id_localisation: number;
}

export type MaterielUpdateInput = Omit<MaterielInput, 'code_materiel'>;

export type StatutIncident = 'DECLARE' | 'PRISE_EN_CHARGE' | 'EN_COURS' | 'RESOLU' | 'CLOTURE' | 'REJETE';
export type DegreUrgence = 'FAIBLE' | 'MOYEN' | 'URGENT' | 'CRITIQUE';
export type TypeMaintenance = 'CORRECTIVE' | 'PREVENTIVE';

export interface Intervenant {
  matricule_cadre: string;
  nom: string;
  prenom: string;
  specialite: string;
}

export interface FicheIntervention {
  num_intervention: string;
  num_incident: string;
  type_maintenance: TypeMaintenance;
  diagnostic: string | null;
  travaux_realises: string | null;
  date_debut: string;
  date_fin: string | null;
  intervenants?: Intervenant[];
}

export interface Incident {
  num_incident: string;
  code_materiel: string;
  date_declaration: string;
  symptomes: string;
  degre_urgence: DegreUrgence;
  statut_incident: StatutIncident;
  motif_rejet: string | null;
  marque?: string | null;
  modele?: string | null;
  type_categorie?: string;
  nom_service?: string;
  matricule_declarant?: string;
  declarant_nom?: string;
  declarant_prenom?: string;
  num_intervention?: string | null;
  nb_intervenants?: number;
  intervenants?: string[];
  fiche?: FicheIntervention | null;
}
export interface IncidentInput {
  code_materiel: string;
  symptomes: string;
  degre_urgence?: DegreUrgence;
}

export interface Intervention {
  num_intervention: string;
  num_incident: string;
  code_materiel?: string;
  type_maintenance: TypeMaintenance;
  diagnostic: string | null;
  travaux_realises: string | null;
  date_debut: string;
  date_fin: string | null;
  intervenants?: Intervenant[];
}

export interface Piece {
  ref_piece: string;
  designation: string;
  quantite_en_stock: number;
  seuil_minimum: number;
  en_alerte: boolean;
}

export interface PieceInput {
  ref_piece: string;
  designation: string;
  quantite_en_stock?: number;
  seuil_minimum?: number;
}

export interface PieceUpdateInput {
  designation: string;
  seuil_minimum: number;
}

export interface Imputation {
  id_imputation: number;
  num_intervention: string;
  ref_piece: string;
  quantite_utilisee: number;
  date_imputation: string;
  designation?: string;
}

export interface AuditLog {
  id_log: number;
  matricule_operateur: string;
  nom: string;
  prenom: string;
  date_heure: string;
  action_effectuee: string;
  details_operation: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  details?: unknown;
}

export interface LoginResponse { user: Utilisateur; }
export interface MeResponse { user: Utilisateur; }

// ---------- Dashboard ----------
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

// ---------- Affectations / Bons de decharge ----------
export type TypeMouvement = 'AFFECTATION' | 'MUTATION' | 'RESTITUTION';

export const TYPES_MOUVEMENT: TypeMouvement[] = ['AFFECTATION', 'MUTATION', 'RESTITUTION'];

export interface LocalisationRef {
  id_localisation: number;
  nom_service: string;
  code_bureau: string | null;
  ville: string;
}

export interface Affectation {
  id_affectation: number;
  code_materiel: string;
  marque: string | null;
  modele: string | null;
  id_localisation: number;
  nom_service: string;
  code_bureau: string | null;
  ville: string;
  id_localisation_origine: number | null;
  origine_nom_service: string | null;
  origine_code_bureau: string | null;
  origine_ville: string | null;
  date_mouvement: string;
  type_mouvement: TypeMouvement;
  agent_beneficiaire: string;
  motif_mouvement: string | null;
  num_bon: string | null;
}

export interface BonDecharge {
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
}

export interface AffectationCreateInput {
  code_materiel: string;
  type_mouvement: TypeMouvement;
  id_localisation: number;
  agent_beneficiaire: string;
  motif_mouvement?: string;
  generer_bon?: boolean;
}

export interface CreationAffectationResponse {
  affectation: Affectation;
  bon: BonDecharge | null;
}