import bcrypt from 'bcrypt';
import { withTransaction } from '../config/database.js';
import { AppError } from '../middlewares/errorHandler.js';
import type { StatutCompte } from '../models/auth.js';
import type {
  CreateUtilisateurDto,
  ListUtilisateursQuery,
  UpdateUtilisateurDto,
  UtilisateurDetail,
} from '../models/utilisateur.js';
import type { UtilisateurRepository } from '../repositories/UtilisateurRepository.js';

const COUT_BCRYPT = 12;

export type PageUtilisateurs = {
  items: UtilisateurDetail[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export class UtilisateurService {
  constructor(private readonly utilisateurs: UtilisateurRepository) {}

  async lister(filters: ListUtilisateursQuery): Promise<PageUtilisateurs> {
    const { items, total } = await this.utilisateurs.findAll(filters);
    return {
      items,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    };
  }

  async obtenir(matricule: string): Promise<UtilisateurDetail> {
    const user = await this.utilisateurs.findDetail(matricule);
    if (!user) throw new AppError(404, 'Utilisateur introuvable.');
    return user;
  }

  async creer(dto: CreateUtilisateurDto): Promise<UtilisateurDetail> {
    if (await this.utilisateurs.findByMatricule(dto.matricule)) {
      throw new AppError(409, 'Ce matricule existe déjà.');
    }
    const hash = await bcrypt.hash(dto.mot_de_passe, COUT_BCRYPT);
    await withTransaction((client) => this.utilisateurs.createTx(client, dto, hash));
    return this.obtenir(dto.matricule);
  }

  async modifier(matricule: string, dto: UpdateUtilisateurDto): Promise<UtilisateurDetail> {
    const actuel = await this.obtenir(matricule);
    await withTransaction(async (client) => {
      await this.utilisateurs.updateIdentiteTx(client, matricule, dto.nom, dto.prenom);
      if (actuel.role === 'CADRE_MAINTENANCE' && dto.specialite) {
        await this.utilisateurs.updateSpecialiteTx(client, matricule, dto.specialite);
      }
      if (actuel.role === 'ADMINISTRATEUR' && dto.niveau_privilege) {
        await this.utilisateurs.updateNiveauTx(client, matricule, dto.niveau_privilege);
      }
    });
    return this.obtenir(matricule);
  }

  // RG_COMPTE_01 : un compte est ACTIF ou INACTIF (jamais supprimé, car référencé par l'audit et les pannes)
  async changerStatut(
    matricule: string,
    statut: StatutCompte,
    operateur: string,
  ): Promise<UtilisateurDetail> {
    const cible = await this.obtenir(matricule);

    if (statut === 'INACTIF') {
      if (matricule === operateur) {
        throw new AppError(409, 'Vous ne pouvez pas désactiver votre propre compte.');
      }
      if (
        cible.role === 'ADMINISTRATEUR' &&
        cible.statut_compte === 'ACTIF' &&
        (await this.utilisateurs.countAdminsActifs()) <= 1
      ) {
        throw new AppError(409, 'Impossible de désactiver le dernier administrateur actif.');
      }
    }
    await this.utilisateurs.setStatut(matricule, statut);
    return this.obtenir(matricule);
  }

  async reinitialiserMotDePasse(matricule: string, nouveau: string): Promise<void> {
    await this.obtenir(matricule);
    const hash = await bcrypt.hash(nouveau, COUT_BCRYPT);
    await this.utilisateurs.setMotDePasse(matricule, hash);
  }

  // Erreurs en 400 (et non 401) : un 401 déclencherait la déconnexion automatique côté front.
  async changerSonMotDePasse(matricule: string, ancien: string, nouveau: string): Promise<void> {
    const user = await this.utilisateurs.findByMatricule(matricule);
    if (!user) throw new AppError(401, 'Session invalide.');
    if (!(await bcrypt.compare(ancien, user.mot_de_passe))) {
      throw new AppError(400, 'Ancien mot de passe incorrect.');
    }
    if (ancien === nouveau) {
      throw new AppError(400, "Le nouveau mot de passe doit être différent de l'ancien.");
    }
    const hash = await bcrypt.hash(nouveau, COUT_BCRYPT);
    await this.utilisateurs.setMotDePasse(matricule, hash);
  }
}