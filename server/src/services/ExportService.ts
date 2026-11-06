import { AppError } from '../middlewares/errorHandler.js';
import type { ListIncidentsQuery } from '../models/incident.js';
import type { ListMaterielsQuery } from '../models/materiel.js';
import type { ListPiecesQuery } from '../models/stock.js';
import { genererFicheIntervention } from '../pdf/ficheIntervention.js';
import { genererInventairePdf } from '../pdf/inventaire.js';
import type { IncidentRepository } from '../repositories/IncidentRepository.js';
import type { InterventionRepository } from '../repositories/InterventionRepository.js';
import type { MaterielRepository } from '../repositories/MaterielRepository.js';
import type { StockRepository } from '../repositories/StockRepository.js';
import { toCsv } from '../utils/csv.js';

const LIMITE_EXPORT = 100_000;

export type FiltresMateriels = Omit<ListMaterielsQuery, 'page' | 'limit'>;
export type FiltresIncidents = Omit<ListIncidentsQuery, 'page' | 'limit'>;
export type FiltresPieces = Omit<ListPiecesQuery, 'page' | 'limit'>;

function designation(marque: string | null, modele: string | null): string {
  return [marque, modele].filter((v): v is string => v !== null && v !== '').join(' ');
}

export class ExportService {
  constructor(
    private readonly materiels: MaterielRepository,
    private readonly incidents: IncidentRepository,
    private readonly stock: StockRepository,
    private readonly interventions: InterventionRepository,
  ) {}

  async csvMateriels(f: FiltresMateriels): Promise<string> {
    const { items } = await this.materiels.findAll({ ...f, page: 1, limit: LIMITE_EXPORT });
    return toCsv(
      [
        { entete: 'Code matériel', valeur: (m) => m.code_materiel },
        { entete: 'N° de série', valeur: (m) => m.num_serie },
        { entete: 'Marque', valeur: (m) => m.marque },
        { entete: 'Modèle', valeur: (m) => m.modele },
        { entete: 'Catégorie', valeur: (m) => m.type_categorie },
        { entete: "Type d'équipement", valeur: (m) => m.type_equipement },
        { entete: 'Système aviation', valeur: (m) => m.systeme_aviation },
        { entete: 'Statut', valeur: (m) => m.statut_materiel },
        { entete: "Date d'acquisition", valeur: (m) => m.date_acquisition },
        { entete: 'Service', valeur: (m) => m.nom_service },
        { entete: 'Code bureau', valeur: (m) => m.code_bureau },
        { entete: 'Ville', valeur: (m) => m.ville },
        { entete: 'Caractéristiques', valeur: (m) => m.caracteristiques },
      ],
      items,
    );
  }

  async pdfMateriels(f: FiltresMateriels): Promise<Buffer> {
    const { items } = await this.materiels.findAll({ ...f, page: 1, limit: LIMITE_EXPORT });
    const criteres: string[] = [];
    if (f.q) criteres.push(`recherche « ${f.q} »`);
    if (f.type_categorie) criteres.push(`catégorie ${f.type_categorie}`);
    if (f.statut_materiel) criteres.push(`statut ${f.statut_materiel}`);
    if (f.id_localisation) criteres.push(`localisation n° ${f.id_localisation}`);
    return genererInventairePdf(items, criteres.length > 0 ? criteres.join(', ') : 'aucun');
  }

  async csvIncidents(f: FiltresIncidents): Promise<string> {
    const { items } = await this.incidents.findAll({ ...f, page: 1, limit: LIMITE_EXPORT });
    return toCsv(
      [
        { entete: 'N° incident', valeur: (i) => i.num_incident },
        { entete: 'Code matériel', valeur: (i) => i.code_materiel },
        { entete: 'Désignation', valeur: (i) => designation(i.marque, i.modele) },
        { entete: 'Service', valeur: (i) => i.nom_service },
        { entete: 'Déclarant', valeur: (i) => `${i.declarant_prenom} ${i.declarant_nom}` },
        { entete: 'Matricule déclarant', valeur: (i) => i.matricule_declarant },
        { entete: 'Date de déclaration', valeur: (i) => i.date_declaration },
        { entete: 'Urgence', valeur: (i) => i.degre_urgence },
        { entete: 'Statut', valeur: (i) => i.statut_incident },
        { entete: 'Symptômes', valeur: (i) => i.symptomes },
        { entete: 'N° intervention', valeur: (i) => i.num_intervention },
        { entete: "Nb d'intervenants", valeur: (i) => i.nb_intervenants },
      ],
      items,
    );
  }

  async csvPieces(f: FiltresPieces): Promise<string> {
    const { items } = await this.stock.findAll({ ...f, page: 1, limit: LIMITE_EXPORT });
    return toCsv(
      [
        { entete: 'Référence', valeur: (p) => p.ref_piece },
        { entete: 'Désignation', valeur: (p) => p.designation },
        { entete: 'Quantité en stock', valeur: (p) => p.quantite_en_stock },
        { entete: 'Seuil minimum', valeur: (p) => p.seuil_minimum },
        { entete: 'En alerte', valeur: (p) => (p.en_alerte ? 'Oui' : 'Non') },
      ],
      items,
    );
  }

  async pdfFicheIntervention(num: string): Promise<Buffer> {
    const fiche = await this.interventions.findByNum(num);
    if (!fiche) throw new AppError(404, 'Intervention introuvable.');
    const incident = await this.incidents.findByNum(fiche.num_incident);
    if (!incident) throw new AppError(404, 'Incident introuvable.');
    const materiel = await this.materiels.findByCode(fiche.code_materiel);
    const pieces = await this.stock.findImputationsByIntervention(num);
    return genererFicheIntervention({ fiche, incident, materiel, pieces });
  }
}