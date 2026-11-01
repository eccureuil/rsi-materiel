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
      throw new AppError(401, 'Matricule ou mot de passe incorrect.');
    }
    // RG_COMPTE_01 : seuls les comptes ACTIF peuvent se connecter
    if (user.statut_compte !== 'ACTIF') {
      throw new AppError(403, 'Ce compte est inactif. Contactez un administrateur.');
    }

    const token = signToken(user.matricule, user.role);
    const claims = verifyToken(token);
    await this.audit.log(user.matricule, 'CONNEXION', 'Connexion réussie');

    return {
      token,
      expiresAtMs: claims.exp * 1000,
      user: { matricule: user.matricule, nom: user.nom, prenom: user.prenom, role: user.role },
    };
  }

  async getProfile(matricule: string): Promise<UtilisateurPublic> {
    const user = await this.utilisateurs.findByMatricule(matricule);
    if (!user || user.statut_compte !== 'ACTIF') {
      throw new AppError(401, 'Session invalide.');
    }
    return { matricule: user.matricule, nom: user.nom, prenom: user.prenom, role: user.role };
  }
}