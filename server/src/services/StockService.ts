import type { PoolClient } from 'pg';
import { withTransaction } from '../config/database.js';
import { AppError } from '../middlewares/errorHandler.js';
import type {
  CreatePieceDto,
  Imputation,
  ImputerDto,
  ListPiecesQuery,
  Piece,
  UpdatePieceDto,
} from '../models/stock.js';
import type { InterventionRepository } from '../repositories/InterventionRepository.js';
import type { StockRepository } from '../repositories/StockRepository.js';

export type PagePieces = {
  items: Piece[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export class StockService {
  constructor(
    private readonly stock: StockRepository,
    private readonly interventions: InterventionRepository,
  ) {}

  // --- Catalogue des pièces ---

  async lister(filters: ListPiecesQuery): Promise<PagePieces> {
    const { items, total } = await this.stock.findAll(filters);
    return {
      items,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    };
  }

  async obtenir(ref: string): Promise<Piece> {
    const piece = await this.stock.findByRef(ref);
    if (!piece) throw new AppError(404, 'Pièce introuvable.');
    return piece;
  }

  async creer(dto: CreatePieceDto): Promise<Piece> {
    await this.stock.create(dto);
    return this.obtenir(dto.ref_piece);
  }

  async modifier(ref: string, dto: UpdatePieceDto): Promise<Piece> {
    if (!(await this.stock.update(ref, dto))) throw new AppError(404, 'Pièce introuvable.');
    return this.obtenir(ref);
  }

  async supprimer(ref: string): Promise<void> {
    await this.obtenir(ref);
    await this.stock.delete(ref); // 409 automatique si la pièce a déjà été imputée
  }

  async approvisionner(ref: string, quantite: number): Promise<Piece> {
    if (!(await this.stock.approvisionner(ref, quantite))) {
      throw new AppError(404, 'Pièce introuvable.');
    }
    return this.obtenir(ref);
  }

  // Ajustement d'inventaire : la nouvelle quantité remplace l'ancienne (motif conservé dans le journal d'audit)
  async ajuster(ref: string, quantite: number): Promise<Piece> {
    if (quantite < 0) {
      throw new AppError(400, 'La quantité en stock ne peut pas être négative.');
    }
    if (!(await this.stock.ajuster(ref, quantite))) throw new AppError(404, 'Pièce introuvable.');
    return this.obtenir(ref);
  }

  // --- Imputation de pièces sur une intervention ---

  async listerImputations(num: string): Promise<Imputation[]> {
    if (!(await this.interventions.findByNum(num))) {
      throw new AppError(404, 'Intervention introuvable.');
    }
    return this.stock.findImputationsByIntervention(num);
  }

  async imputer(
    num: string,
    dto: ImputerDto,
    matricule: string,
  ): Promise<{ imputation: Imputation; piece: Piece }> {
    const id = await withTransaction(async (client) => {
      await this.verrouillerFicheOuverte(client, num, matricule);

      const piece = await this.stock.lockPieceTx(client, dto.ref_piece);
      if (!piece) throw new AppError(404, 'Pièce introuvable.');

      // RG_STOCK_01 : vérification préalable, le stock ne doit jamais devenir négatif
      if (piece.quantite_en_stock < dto.quantite_utilisee) {
        throw new AppError(
          409,
          `Stock insuffisant pour « ${piece.designation} » : ${piece.quantite_en_stock} disponible(s), ${dto.quantite_utilisee} demandé(s).`,
        );
      }
      if (!(await this.stock.decrementerTx(client, dto.ref_piece, dto.quantite_utilisee))) {
        throw new AppError(409, 'Stock insuffisant : la quantité a changé, réessayez.');
      }
      return this.stock.insertImputationTx(client, num, dto.ref_piece, dto.quantite_utilisee);
    });

    const imputation = await this.stock.findImputationById(id);
    if (!imputation) throw new AppError(500, "Imputation introuvable après enregistrement.");
    const piece = await this.obtenir(dto.ref_piece);
    return { imputation, piece };
  }

  // Annule une imputation et restitue la quantité au stock (fiche non terminée uniquement)
  async annulerImputation(num: string, id: number, matricule: string): Promise<void> {
    await withTransaction(async (client) => {
      await this.verrouillerFicheOuverte(client, num, matricule);
      const imputation = await this.stock.lockImputationTx(client, id, num);
      if (!imputation) throw new AppError(404, 'Imputation introuvable pour cette intervention.');
      await this.stock.incrementerTx(client, imputation.ref_piece, imputation.quantite_utilisee);
      await this.stock.deleteImputationTx(client, id);
    });
  }

  private async verrouillerFicheOuverte(
    client: PoolClient,
    num: string,
    matricule: string,
  ): Promise<void> {
    const fiche = await this.interventions.lockFicheTx(client, num);
    if (!fiche) throw new AppError(404, 'Intervention introuvable.');
    if (!(await this.interventions.isIntervenantTx(client, num, matricule))) {
      throw new AppError(
        403,
        'Seuls les intervenants de cette fiche peuvent gérer les pièces utilisées. Utilisez « Intervenir » pour la rejoindre.',
      );
    }
    if (fiche.terminee) {
      throw new AppError(409, 'Cette intervention est terminée : les pièces ne sont plus modifiables.');
    }
  }
}