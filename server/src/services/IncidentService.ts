import { withTransaction } from '../config/database.js';
import { AppError } from '../middlewares/errorHandler.js';
import { STATUTS_INCIDENT_OUVERTS } from '../models/incident.js';
import type {
  DeclarerIncidentDto,
  Incident,
  IncidentDetail,
  IntervenirDto,
  ListIncidentsQuery,
} from '../models/incident.js';
import type { IncidentRepository } from '../repositories/IncidentRepository.js';
import type { InterventionRepository } from '../repositories/InterventionRepository.js';

export type PageIncidents = {
  items: Incident[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export class IncidentService {
  constructor(
    private readonly incidents: IncidentRepository,
    private readonly interventions: InterventionRepository,
  ) {}

  async lister(filters: ListIncidentsQuery): Promise<PageIncidents> {
    const { items, total } = await this.incidents.findAll(filters);
    return {
      items,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    };
  }

  async obtenir(num: string): Promise<IncidentDetail> {
    const incident = await this.incidents.findByNum(num);
    if (!incident) throw new AppError(404, 'Incident introuvable.');
    const fiche = incident.num_intervention
      ? await this.interventions.findByNum(incident.num_intervention)
      : null;
    return { ...incident, fiche };
  }

  async declarer(dto: DeclarerIncidentDto, matricule: string): Promise<IncidentDetail> {
    const num = await withTransaction(async (client) => {
      const statut = await this.incidents.getMaterielStatutTx(client, dto.code_materiel);
      if (statut === null) throw new AppError(404, 'Matériel introuvable.');
      if (statut === 'REFORME') {
        throw new AppError(409, 'Ce matériel est réformé : aucune panne ne peut être déclarée.');
      }
      if (await this.incidents.hasActiveIncidentTx(client, dto.code_materiel)) {
        throw new AppError(409, 'Un incident est déjà ouvert pour ce matériel.');
      }
      const numIncident = await this.incidents.insertTx(client, dto, matricule);
      await this.incidents.setMaterielStatutTx(client, dto.code_materiel, 'PANNE');
      return numIncident;
    });
    return this.obtenir(num);
  }

  // Bouton « Intervenir » (RG_INTERVENTION_01) : le 1er cadre crée la fiche, les suivants la rejoignent.
  async intervenir(num: string, dto: IntervenirDto, matricule: string): Promise<IncidentDetail> {
    await withTransaction(async (client) => {
      const incident = await this.incidents.lockByNumTx(client, num);
      if (!incident) throw new AppError(404, 'Incident introuvable.');
      if (!STATUTS_INCIDENT_OUVERTS.includes(incident.statut_incident)) {
        throw new AppError(
          409,
          `Cet incident n'accepte plus d'intervenants (statut : ${incident.statut_incident}).`,
        );
      }

      let numFiche = await this.interventions.findNumByIncidentTx(client, num);
      if (!numFiche) {
        numFiche = await this.interventions.insertFicheTx(client, num, dto.type_maintenance);
        await this.incidents.updateStatutTx(client, num, 'PRISE_EN_CHARGE');
        await this.incidents.setMaterielStatutTx(client, incident.code_materiel, 'MAINTENANCE');
      }
      await this.interventions.addIntervenantTx(client, numFiche, matricule);
    });
    return this.obtenir(num);
  }

  // Le motif est validé par le contrôleur et conservé dans journal_audit (corps de la requête).
  async rejeter(num: string): Promise<IncidentDetail> {
    await withTransaction(async (client) => {
      const incident = await this.incidents.lockByNumTx(client, num);
      if (!incident) throw new AppError(404, 'Incident introuvable.');
      if (incident.statut_incident !== 'DECLARE') {
        throw new AppError(409, 'Seul un incident au statut DECLARE peut être rejeté.');
      }
      await this.incidents.updateStatutTx(client, num, 'REJETE');
      await this.incidents.setMaterielStatutTx(client, incident.code_materiel, 'SERVICE', 'PANNE');
    });
    return this.obtenir(num);
  }

  async cloturer(num: string): Promise<IncidentDetail> {
    await withTransaction(async (client) => {
      const incident = await this.incidents.lockByNumTx(client, num);
      if (!incident) throw new AppError(404, 'Incident introuvable.');
      if (incident.statut_incident !== 'RESOLU') {
        throw new AppError(409, 'Seul un incident au statut RESOLU peut être clôturé.');
      }
      await this.incidents.updateStatutTx(client, num, 'CLOTURE');
    });
    return this.obtenir(num);
  }
}