import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { DOSSIER_BONS, cheminBon } from '../config/storage.js';
import { AppError } from '../middlewares/errorHandler.js';
import type { BonDecharge } from '../models/affectation.js';
import { genererBonDecharge } from '../pdf/bonDecharge.js';
import type { AffectationRepository } from '../repositories/AffectationRepository.js';

function estEnoent(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === 'ENOENT';
}

export class BonService {
  constructor(private readonly repo: AffectationRepository) {}

  async obtenir(num: string): Promise<BonDecharge> {
    const bon = await this.repo.findBonByNum(num);
    if (!bon) throw new AppError(404, 'Bon de décharge introuvable.');
    return bon;
  }

  // Génère le PDF, l'écrit sur disque et enregistre son chemin dans bons_decharge
  async genererEtStocker(num: string): Promise<Buffer> {
    const bon = await this.obtenir(num);
    const contenu = await genererBonDecharge(bon);
    await mkdir(DOSSIER_BONS, { recursive: true });
    await writeFile(cheminBon(num), contenu);
    await this.repo.setCheminPdf(num, `storage/bons/${num}.pdf`);
    return contenu;
  }

  // Sert le fichier stocké ; s'il a disparu, il est régénéré depuis la base
  async fichierPdf(num: string): Promise<Buffer> {
    await this.obtenir(num);
    try {
      return await readFile(cheminBon(num));
    } catch (err) {
      if (estEnoent(err)) return this.genererEtStocker(num);
      throw err;
    }
  }
}