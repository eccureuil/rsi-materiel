import { z } from 'zod';
import { texteOptionnel } from './common.js';

export const DEGRES_URGENCE = ['FAIBLE', 'MOYEN', 'URGENT', 'CRITIQUE'] as const;
export const STATUTS_INCIDENT = [
  'DECLARE',
  'PRISE_EN_CHARGE',
  'EN_COURS',
  'RESOLU',
  'CLOTURE',
  'REJETE',
] as const;
export const TYPES_MAINTENANCE = ['CORRECTIVE', 'PREVENTIVE'] as const;
export const STATUTS_FINAUX = ['SERVICE', 'PANNE', 'REFORME'] as const;

export type DegreUrgence = (typeof DEGRES_URGENCE)[number];
export type StatutIncident = (typeof STATUTS_INCIDENT)[number];
export type TypeMaintenance = (typeof TYPES_MAINTENANCE)[number];
export type StatutFinal = (typeof STATUTS_FINAUX)[number];

// Statuts pour lesquels un incident est "ouvert" (intervention possible)
export const STATUTS_INCIDENT_OUVERTS: readonly StatutIncident[] = [
  'DECLARE',
  'PRISE_EN_CHARGE',
  'EN_COURS',
];

export type Incident = {
  num_incident: string;
  code_materiel: string;
  marque: string | null;
  modele: string | null;
  type_categorie: string;
  nom_service: string;
  matricule_declarant: string;
  declarant_nom: string;
  declarant_prenom: string;
  date_declaration: string;
  symptomes: string;
  degre_urgence: DegreUrgence;
  statut_incident: StatutIncident;
  num_intervention: string | null;
  nb_intervenants: number;
};

export type Intervenant = {
  matricule_cadre: string;
  nom: string;
  prenom: string;
  specialite: string;
  date_affectation: string;
};

export type FicheRow = {
  num_intervention: string;
  num_incident: string;
  code_materiel: string;
  statut_incident: StatutIncident;
  type_maintenance: TypeMaintenance;
  date_debut: string;
  date_fin: string | null;
  diagnostic: string | null;
  travaux_realises: string | null;
  statut_final_materiel: StatutFinal | null;
};

export type Fiche = FicheRow & { intervenants: Intervenant[] };
export type FicheListItem = FicheRow & { nb_intervenants: number };
export type IncidentDetail = Incident & { fiche: Fiche | null };

export const numParamSchema = z.object({ num: z.string().trim().min(1).max(30) });

export const declarerIncidentSchema = z.object({
  code_materiel: z.string().trim().min(1, 'Le code matériel est requis.').max(30),
  symptomes: z.string().trim().min(5, 'Décrivez les symptômes (5 caractères minimum).').max(5000),
  degre_urgence: z.enum(DEGRES_URGENCE).default('MOYEN'),
});
export type DeclarerIncidentDto = z.infer<typeof declarerIncidentSchema>;

export const intervenirSchema = z.object({
  type_maintenance: z.enum(TYPES_MAINTENANCE).default('CORRECTIVE'),
});
export type IntervenirDto = z.infer<typeof intervenirSchema>;

export const rejeterSchema = z.object({
  motif: z.string().trim().min(3, 'Le motif du rejet est requis.').max(500),
});

export const majFicheSchema = z.object({
  diagnostic: texteOptionnel(5000),
  travaux_realises: texteOptionnel(5000),
});
export type MajFicheDto = z.infer<typeof majFicheSchema>;

export const terminerFicheSchema = z.object({
  diagnostic: z.string().trim().max(5000).optional(),
  travaux_realises: z.string().trim().min(1, 'Les travaux réalisés sont requis.').max(5000),
  statut_final_materiel: z.enum(STATUTS_FINAUX),
});
export type TerminerFicheDto = z.infer<typeof terminerFicheSchema>;

export const listIncidentsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  statut_incident: z.enum(STATUTS_INCIDENT).optional(),
  degre_urgence: z.enum(DEGRES_URGENCE).optional(),
  code_materiel: z.string().trim().max(30).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListIncidentsQuery = z.infer<typeof listIncidentsQuerySchema>;

const boolStr = z.enum(['true', 'false']).transform((v) => v === 'true');

export const listInterventionsQuerySchema = z.object({
  type_maintenance: z.enum(TYPES_MAINTENANCE).optional(),
  terminee: boolStr.optional(),
  mes_interventions: boolStr.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListInterventionsQuery = z.infer<typeof listInterventionsQuerySchema>;