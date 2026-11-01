import { pool } from '../config/database.js';
import type { UtilisateurRow } from '../models/auth.js';

export class UtilisateurRepository {
  async findByMatricule(matricule: string): Promise<UtilisateurRow | null> {
    const res = await pool.query<UtilisateurRow>(
      `SELECT matricule, nom, prenom, mot_de_passe, statut_compte, role
         FROM utilisateurs
        WHERE matricule = $1`,
      [matricule],
    );
    return res.rows[0] ?? null;
  }
}