import { z } from 'zod';

export type Role = 'ADMINISTRATEUR' | 'CADRE_MAINTENANCE';
export type StatutCompte = 'ACTIF' | 'INACTIF';

export type UtilisateurRow = {
  matricule: string;
  nom: string;
  prenom: string;
  mot_de_passe: string;
  statut_compte: StatutCompte;
  role: Role;
};

export type AuthUser = {
  matricule: string;
  role: Role;
};

export type UtilisateurPublic = {
  matricule: string;
  nom: string;
  prenom: string;
  role: Role;
};

export const loginSchema = z.object({
  matricule: z.string().trim().min(1, 'Le matricule est requis.').max(20),
  mot_de_passe: z.string().min(1, 'Le mot de passe est requis.').max(128),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const jwtClaimsSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(['ADMINISTRATEUR', 'CADRE_MAINTENANCE']),
  exp: z.number(),
});
export type TokenClaims = z.infer<typeof jwtClaimsSchema>;