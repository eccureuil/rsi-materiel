import { pool } from '../config/database.js';
import type { JournalEntry, ListAuditQuery } from '../models/audit.js';

export class AuditRepository {
  async log(matricule: string, action: string, details: string | null = null): Promise<void> {
    await pool.query(
      `INSERT INTO journal_audit (matricule_operateur, action_effectuee, details_operation)
       VALUES ($1, $2, $3)`,
      [matricule, action.slice(0, 50), details],
    );
  }

  async findAll(f: ListAuditQuery): Promise<{ items: JournalEntry[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const param = (v: unknown): string => {
      values.push(v);
      return `$${values.length}`;
    };

    if (f.matricule) conditions.push(`j.matricule_operateur = ${param(f.matricule)}`);
    if (f.action) conditions.push(`j.action_effectuee ILIKE ${param(`%${f.action}%`)}`);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM journal_audit j ${where}`,
      values,
    );
    const total = countRes.rows[0]?.total ?? 0;

    const limitParam = param(f.limit);
    const offsetParam = param((f.page - 1) * f.limit);
    const res = await pool.query<JournalEntry>(
      `SELECT j.id_log::text AS id_log, j.matricule_operateur, u.nom, u.prenom,
              to_char(j.date_heure, 'YYYY-MM-DD HH24:MI:SS') AS date_heure,
              j.action_effectuee, j.details_operation
         FROM journal_audit j
         JOIN utilisateurs u ON u.matricule = j.matricule_operateur
         ${where}
        ORDER BY j.id_log DESC
        LIMIT ${limitParam} OFFSET ${offsetParam}`,
      values,
    );
    return { items: res.rows, total };
  }
}