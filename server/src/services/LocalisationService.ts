import { AppError } from '../middlewares/errorHandler.js';
import type { Localisation, LocalisationDto } from '../models/localisation.js';
import type { LocalisationRepository } from '../repositories/LocalisationRepository.js';

export class LocalisationService {
  constructor(private readonly localisations: LocalisationRepository) {}

  lister(): Promise<Localisation[]> {
    return this.localisations.findAll();
  }

  async obtenir(id: number): Promise<Localisation> {
    const loc = await this.localisations.findById(id);
    if (!loc) throw new AppError(404, 'Localisation introuvable.');
    return loc;
  }

  async creer(dto: LocalisationDto): Promise<Localisation> {
    const id = await this.localisations.create(dto);
    return this.obtenir(id);
  }

  async modifier(id: number, dto: LocalisationDto): Promise<Localisation> {
    const ok = await this.localisations.update(id, dto);
    if (!ok) throw new AppError(404, 'Localisation introuvable.');
    return this.obtenir(id);
  }

  async supprimer(id: number): Promise<void> {
    const loc = await this.obtenir(id);
    if (loc.nb_materiels > 0) {
      throw new AppError(409, 'Suppression impossible : des matériels sont rattachés à cette localisation.');
    }
    await this.localisations.delete(id);
  }
}