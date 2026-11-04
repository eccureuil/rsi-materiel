import bcrypt from 'bcrypt';
import { AppError } from '../middlewares/errorHandler.js';
import type { LoginDto, UtilisateurPublic } from '../models/auth.js';
import type { AuditRepository } from '../repositories/AuditRepository.js';
import type { UtilisateurRepository } from '../repositories/UtilisateurRepository.js';
import { signToken, verifyToken } from './TokenService.js';

// Hash factice : on compare toujours un mot de passe, même si le matricule n'existe pas
// (limite l'énumération des matricules par mesure du temps de réponse).
const DUMMY_HASH = bcrypt.hashSync('mot-de-passe-factice', 12);

export type LoginResult = {
  token: string;
  expiresAtMs: number;
  user: UtilisateurPublic;
};

export class AuthService {
  constructor(
    private readonly utilisateurs: UtilisateurRepository,
    private readonly audit: AuditRepository,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.utilisateurs.findByMatricule(dto.matricule);
    const passwordOk = await bcrypt.compare(dto.mot_de_passe, user?.mot_de_passe ?? DUMMY_HASH);

    if (!user || !passwordOk) {
      if (user) {
        await this.journaliser(user.matricule, 'ECHEC_CONNEXION', 'Mot de passe incorrect');
      }
      throw new AppError(401, 'Matricule ou mot de passe incorrect.');
    }
    // RG_COMPTE_01 : seuls les comptes ACTIF peuvent se connecter
    if (user.statut_compte !== 'ACTIF') {
      await this.journaliser(user.matricule, 'CONNEXION_REFUSEE', 'Compte inactif');
      throw new AppError(403, 'Ce compte est inactif. Contactez un administrateur.');
    }

    const token = signToken(user.matricule, user.role);
    const claims = verifyToken(token);
    await this.journaliser(user.matricule, 'CONNEXION', 'Connexion réussie');

    return {
      token,
      expiresAtMs: claims.exp * 1000,
      user: { matricule: user.matricule, nom: user.nom, prenom: user.prenom, role: user.role },
    };
  }

  async logout(token: unknown): Promise<void> {
    if (typeof token !== 'string' || token.length === 0) return;
    let matricule: string;
    try {
      matricule = verifyToken(token).sub;
    } catch {
      return; // jeton invalide ou expiré : rien à journaliser
    }
    await this.journaliser(matricule, 'DECONNEXION', 'Déconnexion');
  }

  async getProfile(matricule: string): Promise<UtilisateurPublic> {
    const user = await this.utilisateurs.findByMatricule(matricule);
    if (!user || user.statut_compte !== 'ACTIF') {
      throw new AppError(401, 'Session invalide.');
    }
    return { matricule: user.matricule, nom: user.nom, prenom: user.prenom, role: user.role };
  }

  // Une panne du journal ne doit jamais empêcher la connexion ou la déconnexion.
  private async journaliser(matricule: string, action: string, details: string): Promise<void> {
    try {
      await this.audit.log(matricule, action, details);
    } catch (err) {
      console.error("Échec d'écriture dans le journal d'audit :", err);
    }
  }
}