import { api } from '@/api/client';
import type {
  Affectation, AffectationCreateInput, AuditLog, BonDecharge, ChangementMotDePasseInput,
  CreationAffectationResponse, DashboardStats, Imputation, Incident, IncidentInput,
  Intervention, Localisation, LocalisationInput, Materiel, MaterielInput,
  MaterielUpdateInput, Paginated, Piece, PieceInput, PieceUpdateInput,
  ReinitialisationMotDePasseInput, TypeMouvement, UtilisateurComplet, UtilisateurCreateInput, UtilisateurUpdateInput,
} from '@/types/api';

function normaliserIntervention(i: Intervention): Intervention {
  return { ...i, intervenants: i.intervenants ?? [] };
}

// ---------- Localisations ----------
export async function listerLocalisations(): Promise<Localisation[]> {
  const { data } = await api.get<{ items: Localisation[] }>('/localisations');
  return data.items;
}
export async function creerLocalisation(input: LocalisationInput): Promise<Localisation> {
  const { data } = await api.post<{ localisation: Localisation }>('/localisations', input);
  return data.localisation;
}
export async function modifierLocalisation(id: number, input: LocalisationInput): Promise<Localisation> {
  const { data } = await api.put<{ localisation: Localisation }>(`/localisations/${id}`, input);
  return data.localisation;
}
export async function supprimerLocalisation(id: number): Promise<void> {
  await api.delete(`/localisations/${id}`);
}

// ---------- Materiels ----------
export interface FiltresMateriels {
  q?: string;
  type_categorie?: string;
  statut_materiel?: string;
  id_localisation?: number;
  page?: number;
  limit?: number;
}
export async function listerMateriels(filtres: FiltresMateriels = {}): Promise<Paginated<Materiel>> {
  const { data } = await api.get<Paginated<Materiel>>('/materiels', { params: filtres });
  return data;
}
export async function obtenirMateriel(code: string): Promise<Materiel> {
  const { data } = await api.get<{ materiel: Materiel }>(`/materiels/${code}`);
  return data.materiel;
}
export async function creerMateriel(input: MaterielInput): Promise<Materiel> {
  const { data } = await api.post<{ materiel: Materiel }>('/materiels', input);
  return data.materiel;
}
export async function modifierMateriel(code: string, input: MaterielUpdateInput): Promise<Materiel> {
  const { data } = await api.put<{ materiel: Materiel }>(`/materiels/${code}`, input);
  return data.materiel;
}
export async function supprimerMateriel(code: string): Promise<void> {
  await api.delete(`/materiels/${code}`);
}

// ---------- Incidents ----------
export interface FiltresIncidents {
  q?: string;
  statut_incident?: string;
  degre_urgence?: string;
  code_materiel?: string;
  page?: number;
  limit?: number;
}
export async function listerIncidents(filtres: FiltresIncidents = {}): Promise<Paginated<Incident>> {
  const { data } = await api.get<Paginated<Incident>>('/incidents', { params: filtres });
  return data;
}
export async function obtenirIncident(num: string): Promise<Incident> {
  const { data } = await api.get<{ incident: Incident }>(`/incidents/${num}`);
  return data.incident;
}
export async function declarerIncident(input: IncidentInput): Promise<Incident> {
  const { data } = await api.post<{ incident: Incident }>('/incidents', input);
  return data.incident;
}
export async function intervenirIncident(num: string, type_maintenance?: string): Promise<void> {
  await api.post(`/incidents/${num}/intervenir`, { type_maintenance });
}
export async function rejeterIncident(num: string, motif: string): Promise<void> {
  await api.post(`/incidents/${num}/rejeter`, { motif });
}
export async function cloturerIncident(num: string): Promise<void> {
  await api.post(`/incidents/${num}/cloturer`);
}

// ---------- Interventions ----------
export interface FiltresInterventions {
  type_maintenance?: string;
  terminee?: boolean;
  mes_interventions?: boolean;
  page?: number;
  limit?: number;
}
export async function listerInterventions(filtres: FiltresInterventions = {}): Promise<Paginated<Intervention>> {
  const { data } = await api.get<Paginated<Intervention>>('/interventions', { params: filtres });
  return { ...data, items: data.items.map(normaliserIntervention) };
}
export async function obtenirIntervention(num: string): Promise<Intervention> {
  const { data } = await api.get<{ intervention: Intervention }>(`/interventions/${num}`);
  return normaliserIntervention(data.intervention);
}
export async function modifierIntervention(
  num: string,
  input: { diagnostic?: string; travaux_realises?: string },
): Promise<void> {
  await api.put(`/interventions/${num}`, input);
}
export async function terminerIntervention(
  num: string,
  input: { travaux_realises: string; statut_final_materiel: string; diagnostic?: string },
): Promise<void> {
  await api.post(`/interventions/${num}/terminer`, input);
}
export async function listerImputations(num: string): Promise<Imputation[]> {
  const { data } = await api.get<{ items: Imputation[] }>(`/interventions/${num}/pieces`);
  return data.items ?? [];
}
export async function imputerPiece(
  num: string,
  ref_piece: string,
  quantite_utilisee: number,
): Promise<{ imputation: Imputation; piece: Piece }> {
  const { data } = await api.post<{ imputation: Imputation; piece: Piece }>(
    `/interventions/${num}/pieces`,
    { ref_piece, quantite_utilisee },
  );
  return data;
}
export async function supprimerImputation(num: string, id: number): Promise<void> {
  await api.delete(`/interventions/${num}/pieces/${id}`);
}

// ---------- Stock ----------
export interface FiltresPieces {
  q?: string;
  sous_seuil?: boolean;
  page?: number;
  limit?: number;
}
export async function listerPieces(filtres: FiltresPieces = {}): Promise<Paginated<Piece>> {
  const { data } = await api.get<Paginated<Piece>>('/pieces', { params: filtres });
  return data;
}
export async function creerPiece(input: PieceInput): Promise<Piece> {
  const { data } = await api.post<{ piece: Piece }>('/pieces', input);
  return data.piece;
}
export async function modifierPiece(ref: string, input: PieceUpdateInput): Promise<Piece> {
  const { data } = await api.put<{ piece: Piece }>(`/pieces/${ref}`, input);
  return data.piece;
}
export async function supprimerPiece(ref: string): Promise<void> {
  await api.delete(`/pieces/${ref}`);
}
export async function approvisionnerPiece(ref: string, quantite: number): Promise<Piece> {
  const { data } = await api.post<{ piece: Piece }>(`/pieces/${ref}/approvisionner`, { quantite });
  return data.piece;
}
export async function ajusterPiece(ref: string, quantite_en_stock: number, motif: string): Promise<Piece> {
  const { data } = await api.post<{ piece: Piece }>(`/pieces/${ref}/ajuster`, { quantite_en_stock, motif });
  return data.piece;
}

// ---------- Audit ----------
export interface FiltresAudit {
  matricule?: string;
  action?: string;
  page?: number;
  limit?: number;
}
export async function listerAudit(filtres: FiltresAudit = {}): Promise<Paginated<AuditLog>> {
  const { data } = await api.get<Paginated<AuditLog>>('/audit', { params: filtres });
  return data;
}

// ---------- Dashboard ----------
export async function obtenirDashboard(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/dashboard');
  return data;
}

// ---------- Utilisateurs ----------
export interface FiltresUtilisateurs {
  q?: string;
  role?: 'ADMINISTRATEUR' | 'CADRE_MAINTENANCE';
  statut_compte?: 'ACTIF' | 'INACTIF';
  page?: number;
  limit?: number;
}
export async function listerUtilisateurs(
  filtres: FiltresUtilisateurs = {},
): Promise<Paginated<UtilisateurComplet>> {
  const { data } = await api.get<Paginated<UtilisateurComplet>>('/utilisateurs', { params: filtres });
  return data;
}
export async function obtenirUtilisateur(matricule: string): Promise<UtilisateurComplet> {
  const { data } = await api.get<{ utilisateur: UtilisateurComplet }>(`/utilisateurs/${matricule}`);
  return data.utilisateur;
}
export async function creerUtilisateur(input: UtilisateurCreateInput): Promise<UtilisateurComplet> {
  const { data } = await api.post<{ utilisateur: UtilisateurComplet }>('/utilisateurs', input);
  return data.utilisateur;
}
export async function modifierUtilisateur(
  matricule: string,
  input: UtilisateurUpdateInput,
): Promise<UtilisateurComplet> {
  const { data } = await api.put<{ utilisateur: UtilisateurComplet }>(`/utilisateurs/${matricule}`, input);
  return data.utilisateur;
}
export async function changerStatutUtilisateur(
  matricule: string,
  statut: 'ACTIF' | 'INACTIF',
): Promise<UtilisateurComplet> {
  const { data } = await api.patch<{ utilisateur: UtilisateurComplet }>(
    `/utilisateurs/${matricule}/statut`,
    { statut_compte: statut },
  );
  return data.utilisateur;
}
export async function reinitialiserMotDePasse(
  matricule: string,
  input: ReinitialisationMotDePasseInput,
): Promise<void> {
  await api.post(`/utilisateurs/${matricule}/reinitialiser-mot-de-passe`, input);
}

// ---------- Mon mot de passe ----------
export async function changerSonMotDePasse(input: ChangementMotDePasseInput): Promise<void> {
  await api.put('/mot-de-passe', input);
}

// ---------- Affectations / Bons ----------
export interface FiltresAffectations {
  code_materiel?: string;
  type_mouvement?: TypeMouvement;
  id_localisation?: number;
  page?: number;
  limit?: number;
}
export async function listerAffectations(
  filtres: FiltresAffectations = {},
): Promise<Paginated<Affectation>> {
  const { data } = await api.get<Paginated<Affectation>>('/affectations', { params: filtres });
  return data;
}
export async function obtenirAffectation(id: number): Promise<Affectation> {
  const { data } = await api.get<{ affectation: Affectation }>(`/affectations/${id}`);
  return data.affectation;
}
export async function creerAffectation(
  input: AffectationCreateInput,
): Promise<CreationAffectationResponse> {
  const { data } = await api.post<CreationAffectationResponse>('/affectations', input);
  return data;
}
export function urlPdfBon(bon: BonDecharge): string | null {
  if (!bon.chemin_fichier_pdf) return null;
  return `http://localhost:3000/api/bons/${bon.num_bon}/pdf`;
}