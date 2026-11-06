import { z } from 'zod';
import type { Role, StatutCompte } from './auth.js';

export type UtilisateurDetail = {
  matricule: string;
  nom: string;
  prenom: string;
  role: Role;
  statut_compte: StatutCompte;
  specialite: string | null;
  niveau_privilege: string | null;
};

export const matriculeParamSchema = z.object({ matricule: z.string().trim().min(1).max(20) });

// Politique de mot de passe : 8 caractères minimum, au moins une lettre et un chiffre
const motDePasseSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
  .max(128)
  .regex(/[A-Za-z]/, 'Le mot de passe doit contenir au moins une lettre.')
  .regex(/\d/, 'Le mot de passe doit contenir au moins un chiffre.');

export const createUtilisateurSchema = z
  .object({
    matricule: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9._-]{1,20}$/, 'Matricule invalide : 1 à 20 caractères (lettres, chiffres, . _ -).'),
    nom: z.string().trim().min(1, 'Le nom est requis.').max(50),
    prenom: z.string().trim().min(1, 'Le prénom est requis.').max(50),
    mot_de_passe: motDePasseSchema,
    role: z.enum(['ADMINISTRATEUR', 'CADRE_MAINTENANCE']),
    specialite: z.string().trim().max(100).optional(),
    niveau_privilege: z.string().trim().max(30).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.role === 'CADRE_MAINTENANCE' && !v.specialite) {
      ctx.addIssue({
        code: 'custom',
        path: ['specialite'],
        message: 'La spécialité est requise pour un cadre de maintenance.',
      });
    }
  });
export type CreateUtilisateurDto = z.infer<typeof createUtilisateurSchema>;

// Le rôle n'est pas modifiable (il détermine la table fille)
export const updateUtilisateurSchema = z.object({
  nom: z.string().trim().min(1, 'Le nom est requis.').max(50),
  prenom: z.string().trim().min(1, 'Le prénom est requis.').max(50),
  specialite: z.string().trim().min(1).max(100).optional(),
  niveau_privilege: z.string().trim().min(1).max(30).optional(),
});
export type UpdateUtilisateurDto = z.infer<typeof updateUtilisateurSchema>;

export const statutCompteSchema = z.object({ statut_compte: z.enum(['ACTIF', 'INACTIF']) });

export const reinitialiserMotDePasseSchema = z.object({ nouveau_mot_de_passe: motDePasseSchema });

export const changerMotDePasseSchema = z.object({
  ancien_mot_de_passe: z.string().min(1, "L'ancien mot de passe est requis.").max(128),
  nouveau_mot_de_passe: motDePasseSchema,
});

export const listUtilisateursQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['ADMINISTRATEUR', 'CADRE_MAINTENANCE']).optional(),
  statut_compte: z.enum(['ACTIF', 'INACTIF']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListUtilisateursQuery = z.infer<typeof listUtilisateursQuerySchema>;