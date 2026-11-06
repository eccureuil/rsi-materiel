import type { PoolClient } from 'pg';
import { pool } from '../config/database.js';
import type { StatutCompte, UtilisateurRow } from '../models/auth.js';
import type {
  CreateUtilisateurDto,
  ListUtilisateursQuery,
  UtilisateurDetail,
} from '../models/utilisateur.js';

const SELECT_DETAIL = `
  SELECT u.matricule, u.nom, u.prenom, u.role, u.statut_compte,
         c.specialite, a.niveau_privilege
    FROM utilisateurs u
    LEFT JOIN cadres_maintenance c ON c.matricule = u.matricule
    LEFT JOIN administrateurs a    ON a.matricule = u.matricule`;

export class UtilisateurRepository {
  // --- Authentification ---

  async findByMatricule(matricule: string): Promise<UtilisateurRow | null> {
    const res = await pool.query<UtilisateurRow>(
      `SELECT matricule, nom, prenom, mot_de_passe, statut_compte, role
         FROM utilisateurs
        WHERE matricule = $1`,
      [matricule],
    );
    return res.rows[0] ?? null;
  }

  async findStatut(matricule: string): Promise<StatutCompte | null> {
    const res = await pool.query<{ statut_compte: StatutCompte }>(
      'SELECT statut_compte FROM utilisateurs WHERE matricule = $1',
      [matricule],
    );
    return res.rows[0]?.statut_compte ?? null;
  }

  // --- Gestion des utilisateurs ---

  async findAll(f: ListUtilisateursQuery): Promise<{ items: UtilisateurDetail[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const param = (v: unknown): string => {
      values.push(v);
      return `$${values.length}`;
    };

    if (f.q) {
      const p = param(`%${f.q}%`);
      conditions.push(`(u.matricule ILIKE ${p} OR u.nom ILIKE ${p} OR u.prenom ILIKE ${p})`);
    }
    if (f.role) conditions.push(`u.role = ${param(f.role)}`);
    if (f.statut_compte) conditions.push(`u.statut_compte = ${param(f.statut_compte)}`);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM utilisateurs u ${where}`,
      values,
    );
    const total = countRes.rows[0]?.total ?? 0;

    const limitParam = param(f.limit);
    const offsetParam = param((f.page - 1) * f.limit);
    const res = await pool.query<UtilisateurDetail>(
      `${SELECT_DETAIL}
       ${where}
       ORDER BY u.nom, u.prenom, u.matricule
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      values,
    );
    return { items: res.rows, total };
  }

  async findDetail(matricule: string): Promise<UtilisateurDetail | null> {
    const res = await pool.query<UtilisateurDetail>(`${SELECT_DETAIL} WHERE u.matricule = $1`, [
      matricule,
    ]);
    return res.rows[0] ?? null;
  }

  async countAdminsActifs(): Promise<number> {
    const res = await pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM utilisateurs
        WHERE role = 'ADMINISTRATEUR' AND statut_compte = 'ACTIF'`,
    );
    return res.rows[0]?.total ?? 0;
  }

  async setStatut(matricule: string, statut: StatutCompte): Promise<boolean> {
    const res = await pool.query('UPDATE utilisateurs SET statut_compte = $2 WHERE matricule = $1', [
      matricule,
      statut,
    ]);
    return (res.rowCount ?? 0) > 0;
  }

  async setMotDePasse(matricule: string, hash: string): Promise<boolean> {
    const res = await pool.query('UPDATE utilisateurs SET mot_de_passe = $2 WHERE matricule = $1', [
      matricule,
      hash,
    ]);
    return (res.rowCount ?? 0) > 0;
  }

  // --- Méthodes transactionnelles ---

  async createTx(client: PoolClient, dto: CreateUtilisateurDto, hash: string): Promise<void> {
    await client.query(
      `INSERT INTO utilisateurs (matricule, nom, prenom, mot_de_passe, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [dto.matricule, dto.nom, dto.prenom, hash, dto.role],
    );
    if (dto.role === 'ADMINISTRATEUR') {
      await client.query(
        `INSERT INTO administrateurs (matricule, niveau_privilege)
         VALUES ($1, COALESCE($2, 'SUPER_ADMIN'))`,
        [dto.matricule, dto.niveau_privilege ?? null],
      );
    } else {
      await client.query('INSERT INTO cadres_maintenance (matricule, specialite) VALUES ($1, $2)', [
        dto.matricule,
        dto.specialite ?? '',
      ]);
    }
  }

  async updateIdentiteTx(
    client: PoolClient,
    matricule: string,
    nom: string,
    prenom: string,
  ): Promise<void> {
    await client.query('UPDATE utilisateurs SET nom = $2, prenom = $3 WHERE matricule = $1', [
      matricule,
      nom,
      prenom,
    ]);
  }

  async updateSpecialiteTx(client: PoolClient, matricule: string, specialite: string): Promise<void> {
    await client.query('UPDATE cadres_maintenance SET specialite = $2 WHERE matricule = $1', [
      matricule,
      specialite,
    ]);
  }

  async updateNiveauTx(client: PoolClient, matricule: string, niveau: string): Promise<void> {
    await client.query('UPDATE administrateurs SET niveau_privilege = $2 WHERE matricule = $1', [
      matricule,
      niveau,
    ]);
  }
}