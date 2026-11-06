import { STATUTS_INCIDENT, DEGRES_URGENCE, STATUTS_INCIDENT_OUVERTS } from '../models/incident.js';
import type { DashboardStats } from '../models/dashboard.js';
import { STATUTS_MATERIEL, TYPES_CATEGORIE } from '../models/materiel.js';
import type { Compte, DashboardRepository } from '../repositories/DashboardRepository.js';

// Renvoie un objet contenant TOUTES les clés attendues, à 0 si absentes de la base
function completer<T extends string>(cles: readonly T[], lignes: Compte[]): Record<T, number> {
  const resultat = {} as Record<T, number>;
  for (const cle of cles) resultat[cle] = 0;
  for (const ligne of lignes) {
    const cle = cles.find((c) => c === ligne.cle);
    if (cle !== undefined) resultat[cle] = ligne.total;
  }
  return resultat;
}

export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  async statistiques(matricule: string): Promise<DashboardStats> {
    const [
      matStatut,
      matCategorie,
      incStatut,
      incUrgence,
      parMois,
      prioritaires,
      interventions,
      stock,
      alertes,
    ] = await Promise.all([
      this.repo.materielsParStatut(),
      this.repo.materielsParCategorie(),
      this.repo.incidentsParStatut(),
      this.repo.incidentsOuvertsParUrgence(),
      this.repo.incidentsParMois(),
      this.repo.incidentsPrioritaires(5),
      this.repo.resumeInterventions(matricule),
      this.repo.resumeStock(),
      this.repo.piecesEnAlerte(10),
    ]);

    const materielsParStatut = completer(STATUTS_MATERIEL, matStatut);
    const incidentsParStatut = completer(STATUTS_INCIDENT, incStatut);

    return {
      genere_le: new Date().toISOString(),
      materiels: {
        total: Object.values(materielsParStatut).reduce((a, b) => a + b, 0),
        par_statut: materielsParStatut,
        par_categorie: completer(TYPES_CATEGORIE, matCategorie),
      },
      incidents: {
        ouverts: STATUTS_INCIDENT_OUVERTS.reduce((somme, s) => somme + incidentsParStatut[s], 0),
        par_statut: incidentsParStatut,
        ouverts_par_urgence: completer(DEGRES_URGENCE, incUrgence),
        par_mois: parMois,
        recents_prioritaires: prioritaires,
      },
      interventions,
      stock: { ...stock, pieces_en_alerte: alertes },
    };
  }
}