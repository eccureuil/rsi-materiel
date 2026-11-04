import { AppError } from '../middlewares/errorHandler.js';
import type {
  CreateMaterielDto,
  ListMaterielsQuery,
  Materiel,
  MaterielDto,
} from '../models/materiel.js';
import type { LocalisationRepository } from '../repositories/LocalisationRepository.js';
import type { MaterielRepository } from '../repositories/MaterielRepository.js';

export type PageMateriels = {
  items: Materiel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export class MaterielService {
  constructor(
    private readonly materiels: MaterielRepository,
    private readonly localisations: LocalisationRepository,
  ) {}

  async lister(filters: ListMaterielsQuery): Promise<PageMateriels> {
    const { items, total } = await this.materiels.findAll(filters);
    return {
      items,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    };
  }

  async obtenir(code: string): Promise<Materiel> {
    const materiel = await this.materiels.findByCode(code);
    if (!materiel) throw new AppError(404, 'Matériel introuvable.');
    return materiel;
  }

  async creer(dto: CreateMaterielDto): Promise<Materiel> {
    await this.verifierLocalisation(dto.id_localisation);
    const { code_materiel, ...donnees } = dto;
    await this.materiels.create(code_materiel, donnees);
    return this.obtenir(code_materiel);
  }

  async modifier(code: string, dto: MaterielDto): Promise<Materiel> {
    await this.obtenir(code);
    await this.verifierLocalisation(dto.id_localisation);
    await this.materiels.update(code, dto);
    return this.obtenir(code);
  }

  async supprimer(code: string): Promise<void> {
    await this.obtenir(code);
    await this.materiels.delete(code);
  }

  private async verifierLocalisation(id: number): Promise<void> {
    if (!(await this.localisations.exists(id))) {
      throw new AppError(400, "La localisation indiquée n'existe pas.");
    }
  }
}