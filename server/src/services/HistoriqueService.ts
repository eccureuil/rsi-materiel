import { AppError } from '../middlewares/errorHandler.js';
import type {
  Evenement,
  HistoriqueMateriel,
  HistoriqueMaterielQuery,
  ListHistoriqueQuery,
} from '../models/historique.js';
import type { HistoriqueRepository } from '../repositories/HistoriqueRepository.js';
import type { MaterielRepository } from '../repositories/MaterielRepository.js';

const LIMITE_HISTORIQUE_MATERIEL = 1000;

export type PageEvenements = {
  items: Evenement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function verifierPeriode(du?: string, au?: string): void {
  if (du && au && du > au) {
    throw new AppError(400, 'La date de début doit précéder la date de fin.');
  }
}

export class HistoriqueService {
  constructor(
    private readonly historique: HistoriqueRepository,
    private readonly materiels: MaterielRepository,
  ) {}

  // Fil d'activité de tous les matériels (ou d'un seul via ?code_materiel=)
  async lister(f: ListHistoriqueQuery): Promise<PageEvenements> {
    verifierPeriode(f.du, f.au);
    const { items, total } = await this.historique.findEvenements(f);
    return {
      items,
      total,
      page: f.page,
      limit: f.limit,
      totalPages: Math.max(1, Math.ceil(total / f.limit)),
    };
  }

  // Fiche de vie d'un matériel : matériel + synthèse chiffrée + frise complète
  async parMateriel(code: string, f: HistoriqueMaterielQuery): Promise<HistoriqueMateriel> {
    verifierPeriode(f.du, f.au);
    const materiel = await this.materiels.findByCode(code);
    if (!materiel) throw new AppError(404, 'Matériel introuvable.');

    const [synthese, { items, total }] = await Promise.all([
      this.historique.synthese(code),
      this.historique.findEvenements({
        ...f,
        code_materiel: code,
        page: 1,
        limit: LIMITE_HISTORIQUE_MATERIEL,
      }),
    ]);
    return { materiel, synthese, total, tronque: total > items.length, evenements: items };
  }
}