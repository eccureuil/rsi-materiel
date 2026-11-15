import { withTransaction } from '../config/database.js';
import { AppError } from '../middlewares/errorHandler.js';
import type {
  Affectation,
  BonDecharge,
  CreateAffectationDto,
  ListAffectationsQuery,
  TypeMouvement,
} from '../models/affectation.js';
import type { StatutMateriel } from '../models/materiel.js';
import type { AffectationRepository } from '../repositories/AffectationRepository.js';
import type { BonService } from './BonService.js';

// Statut requis avant le mouvement et statut après (null = inchangé)
const REGLES: Record<TypeMouvement, { requis: StatutMateriel; apres: StatutMateriel | null }> = {
  AFFECTATION: { requis: 'STOCK', apres: 'SERVICE' },
  MUTATION: { requis: 'SERVICE', apres: null },
  RESTITUTION: { requis: 'SERVICE', apres: 'STOCK' },
};

export type PageAffectations = {
  items: Affectation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export class AffectationService {
  constructor(
    private readonly repo: AffectationRepository,
    private readonly bons: BonService,
  ) {}

  async lister(filters: ListAffectationsQuery): Promise<PageAffectations> {
    const { items, total } = await this.repo.findAll(filters);
    return {
      items,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    };
  }

  async obtenir(id: number): Promise<Affectation> {
    const affectation = await this.repo.findById(id);
    if (!affectation) throw new AppError(404, 'Mouvement introuvable.');
    return affectation;
  }

  async genererBon(id: number): Promise<BonDecharge> {
    await this.obtenir(id);
    let numBon = await this.repo.findNumBonByAffectation(id);
    if (!numBon) {
      numBon = await withTransaction((client) => this.repo.insertBonTx(client, id));
    }

    try {
      await this.bons.genererEtStocker(numBon);
    } catch (err) {
      console.error(`Échec de génération du PDF ${numBon} :`, err);
    }

    return this.bons.obtenir(numBon);
  }

  async creer(dto: CreateAffectationDto): Promise<{ affectation: Affectation; bon: BonDecharge | null }> {
    const { idAffectation, numBon } = await withTransaction(async (client) => {
      const materiel = await this.repo.lockMaterielTx(client, dto.code_materiel);
      if (!materiel) throw new AppError(404, 'Matériel introuvable.');
      if (!(await this.repo.localisationExistsTx(client, dto.id_localisation))) {
        throw new AppError(400, "La localisation indiquée n'existe pas.");
      }

      const regle = REGLES[dto.type_mouvement];
      if (materiel.statut_materiel !== regle.requis) {
        throw new AppError(
          409,
          `Une ${dto.type_mouvement.toLowerCase()} exige un matériel au statut ${regle.requis} (statut actuel : ${materiel.statut_materiel}).`,
        );
      }
      if (dto.type_mouvement !== 'RESTITUTION' && materiel.id_localisation === dto.id_localisation) {
        throw new AppError(409, 'Le matériel se trouve déjà dans cette localisation.');
      }

      const id = await this.repo.insertAffectationTx(client, {
        ...dto,
        id_localisation_origine: materiel.id_localisation,
      });
      await this.repo.updateMaterielTx(
        client,
        dto.code_materiel,
        dto.id_localisation,
        regle.apres ?? materiel.statut_materiel,
      );

      // Génération du bon seulement si l'utilisateur le demande explicitement (défaut : non)
      let num: string | null = null;
      if (dto.generer_bon === true) {
        num = await this.repo.insertBonTx(client, id);
      }
      return { idAffectation: id, numBon: num };
    });

    // Génération du PDF après validation de la transaction : un échec ne doit pas annuler le mouvement
    // (le fichier sera régénéré au premier téléchargement).
    if (numBon) {
      try {
        await this.bons.genererEtStocker(numBon);
      } catch (err) {
        console.error(`Échec de génération du PDF ${numBon} :`, err);
      }
    }

    const affectation = await this.obtenir(idAffectation);
    const bon = numBon ? await this.bons.obtenir(numBon) : null;
    return { affectation, bon };
  }
}