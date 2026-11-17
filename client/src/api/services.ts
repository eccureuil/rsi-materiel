import { api } from '@/api/client';
import type {
  Affectation, AffectationCreateInput, AuditLog, BonDecharge, ChangementMotDePasseInput,
  CreationAffectationResponse, DashboardStats, Imputation, Incident, IncidentInput,
  Intervention, Localisation, LocalisationInput, Materiel, MaterielInput,
  MaterielUpdateInput, Paginated, Piece, PieceInput, PieceUpdateInput,
  ReinitialisationMotDePasseInput, TypeMouvement, UtilisateurComplet, UtilisateurCreateInput, UtilisateurUpdateInput,
} from '@/types/api';

function normaliserIntervention(i: Intervention): Intervention {
  return {
    ...i,
    intervenants: i.intervenants ?? [],
    comptes_rendus: i.comptes_rendus ?? [],
  };
}

export const INTERVENTIONS_CHANGE_EVENT = 'rsi:interventions-change';
export const PIECES_CHANGE_EVENT = 'rsi:pieces-change';

function signalerChangementInterventions(): void {
  window.dispatchEvent(new Event(INTERVENTIONS_CHANGE_EVENT));
}

function signalerChangementPieces(): void {
  window.dispatchEvent(new Event(PIECES_CHANGE_EVENT));
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
export async function intervenirIncident(num: string, type_maintenance?: string): Promise<Incident> {
  const { data } = await api.post<{ incident: Incident }>(
    `/incidents/${num}/intervenir`,
    { type_maintenance },
  );
  signalerChangementInterventions();
  return data.incident;
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
export async function ajouterCompteRenduIntervention(
  num: string,
  input: { diagnostic?: string; travaux_realises?: string },
): Promise<Intervention> {
  const { data } = await api.post<{ intervention: Intervention }>(
    `/interventions/${num}/comptes-rendus`,
    input,
  );
  return normaliserIntervention(data.intervention);
}
export async function modifierCompteRenduIntervention(
  num: string,
  id: number,
  input: { diagnostic?: string; travaux_realises?: string },
): Promise<Intervention> {
  const { data } = await api.put<{ intervention: Intervention }>(
    `/interventions/${num}/comptes-rendus/${id}`,
    input,
  );
  return normaliserIntervention(data.intervention);
}
export async function supprimerCompteRenduIntervention(
  num: string,
  id: number,
): Promise<Intervention> {
  const { data } = await api.delete<{ intervention: Intervention }>(
    `/interventions/${num}/comptes-rendus/${id}`,
  );
  return normaliserIntervention(data.intervention);
}
export async function terminerIntervention(
  num: string,
  input: { travaux_realises: string; statut_final_materiel: string; diagnostic?: string },
): Promise<void> {
  await api.post(`/interventions/${num}/terminer`, input);
  signalerChangementInterventions();
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
  signalerChangementPieces();
  return data;
}
export async function supprimerImputation(num: string, id: number): Promise<void> {
  await api.delete(`/interventions/${num}/pieces/${id}`);
  signalerChangementPieces();
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
  signalerChangementPieces();
  return data.piece;
}
export async function modifierPiece(ref: string, input: PieceUpdateInput): Promise<Piece> {
  const { data } = await api.put<{ piece: Piece }>(`/pieces/${ref}`, input);
  signalerChangementPieces();
  return data.piece;
}
export async function supprimerPiece(ref: string): Promise<void> {
  await api.delete(`/pieces/${ref}`);
  signalerChangementPieces();
}
export async function approvisionnerPiece(ref: string, quantite: number): Promise<Piece> {
  const { data } = await api.post<{ piece: Piece }>(`/pieces/${ref}/approvisionner`, { quantite });
  signalerChangementPieces();
  return data.piece;
}
export async function ajusterPiece(ref: string, quantite_en_stock: number, motif: string): Promise<Piece> {
  const { data } = await api.post<{ piece: Piece }>(`/pieces/${ref}/ajuster`, { quantite_en_stock, motif });
  signalerChangementPieces();
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
export async function genererBonAffectation(id: number): Promise<BonDecharge> {
  const { data } = await api.post<{ bon: BonDecharge }>(`/affectations/${id}/bon`);
  return data.bon;
}
function urlApi(chemin: string): string {
  return `${api.defaults.baseURL ?? ''}${chemin}`;
}

export function urlPdfBonNum(numBon: string, telecharger = false): string {
  const url = urlApi(`/bons/${encodeURIComponent(numBon)}/pdf`);
  return telecharger ? `${url}?telecharger=true` : url;
}

export function urlPdfBon(bon: BonDecharge): string {
  return urlPdfBonNum(bon.num_bon);
}

export interface FiltresPdfInventaire {
  q?: string;
  type_categorie?: string;
  statut_materiel?: string;
  id_localisation?: string | number;
}

export function urlPdfInventaire(filtres: FiltresPdfInventaire = {}): string {
  const params = new URLSearchParams();
  if (filtres.q?.trim()) params.set('q', filtres.q.trim());
  if (filtres.type_categorie) params.set('type_categorie', filtres.type_categorie);
  if (filtres.statut_materiel) params.set('statut_materiel', filtres.statut_materiel);
  if (filtres.id_localisation) params.set('id_localisation', String(filtres.id_localisation));
  const query = params.toString();
  return urlApi(`/exports/materiels/pdf${query ? `?${query}` : ''}`);
}

export function urlPdfFicheIntervention(num: string): string {
  return urlApi(`/exports/interventions/${encodeURIComponent(num)}/pdf`);
}
// ---------- Historique ----------
import type {
  FiltresHistoriqueGlobal,
  FiltresHistoriqueMateriel,
  HistoriqueMateriel,
  PageEvenements,
} from '@/types/historique';

export async function obtenirHistoriqueMateriel(
  code: string,
  filtres: FiltresHistoriqueMateriel = {},
): Promise<HistoriqueMateriel> {
  const params: Record<string, string> = {};
  if (filtres.types && filtres.types.length > 0) params.types = filtres.types.join(',');
  if (filtres.du) params.du = filtres.du;
  if (filtres.au) params.au = filtres.au;
  if (filtres.ordre) params.ordre = filtres.ordre;

  const { data } = await api.get<HistoriqueMateriel>(
    `/materiels/${code}/historique`,
    { params },
  );
  return data;
}

export async function listerHistorique(
  filtres: FiltresHistoriqueGlobal = {},
): Promise<PageEvenements> {
  const params: Record<string, string | number> = {};
  if (filtres.code_materiel) params.code_materiel = filtres.code_materiel;
  if (filtres.types && filtres.types.length > 0) params.types = filtres.types.join(',');
  if (filtres.du) params.du = filtres.du;
  if (filtres.au) params.au = filtres.au;
  if (filtres.ordre) params.ordre = filtres.ordre;
  if (filtres.page) params.page = filtres.page;
  if (filtres.limit) params.limit = filtres.limit;

  const { data } = await api.get<PageEvenements>('/historique', { params });
  return data;
}