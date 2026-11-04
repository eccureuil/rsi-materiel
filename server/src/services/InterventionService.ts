import type { PoolClient } from 'pg';
import { withTransaction } from '../config/database.js';
import { AppError } from '../middlewares/errorHandler.js';
import type {
  Fiche,
  FicheListItem,
  ListInterventionsQuery,
  MajFicheDto,
  TerminerFicheDto,
} from '../models/incident.js';
import type { IncidentRepository } from '../repositories/IncidentRepository.js';
import type {
  FicheVerrou,
  InterventionRepository,
} from '../repositories/InterventionRepository.js';

export type PageInterventions = {
  items: FicheListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export class InterventionService {
  constructor(
    private readonly interventions: InterventionRepository,
    private readonly incidents: IncidentRepository,
  ) {}

  async lister(filters: ListInterventionsQuery, matricule: string): Promise<PageInterventions> {
    const { items, total } = await this.interventions.findAll(filters, matricule);
    return {
      items,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    };
  }

  async obtenir(num: string): Promise<Fiche> {
    const fiche = await this.interventions.findByNum(num);
    if (!fiche) throw new AppError(404, 'Intervention introuvable.');
    return fiche;
  }

  async mettreAJour(num: string, dto: MajFicheDto, matricule: string): Promise<Fiche> {
    await withTransaction(async (client) => {
      const fiche = await this.verrouillerFicheOuverte(client, num, matricule);
      await this.interventions.updateFicheTx(client, num, dto);
      if (fiche.statut_incident === 'PRISE_EN_CHARGE') {
        await this.incidents.updateStatutTx(client, fiche.num_incident, 'EN_COURS');
      }
    });
    return this.obtenir(num);
  }

  async terminer(num: string, dto: TerminerFicheDto, matricule: string): Promise<Fiche> {
    await withTransaction(async (client) => {
      const fiche = await this.verrouillerFicheOuverte(client, num, matricule);
      await this.interventions.terminerFicheTx(client, num, dto);
      await this.incidents.updateStatutTx(client, fiche.num_incident, 'RESOLU');
      await this.incidents.setMaterielStatutTx(client, fiche.code_materiel, dto.statut_final_materiel);
    });
    return this.obtenir(num);
  }

  private async verrouillerFicheOuverte(
    client: PoolClient,
    num: string,
    matricule: string,
  ): Promise<FicheVerrou> {
    const fiche = await this.interventions.lockFicheTx(client, num);
    if (!fiche) throw new AppError(404, 'Intervention introuvable.');
    if (!(await this.interventions.isIntervenantTx(client, num, matricule))) {
      throw new AppError(
        403,
        'Seuls les intervenants de cette fiche peuvent la modifier. Utilisez « Intervenir » pour la rejoindre.',
      );
    }
    if (fiche.terminee) {
      throw new AppError(409, 'Cette intervention est déjà terminée.');
    }
    return fiche;
  }
}