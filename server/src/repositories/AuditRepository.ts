import { pool } from '../config/database.js';

export class AuditRepository {
  async log(matricule: string, action: string, details: string | null = null): Promise<void> {
    await pool.query(
      `INSERT INTO journal_audit (matricule_operateur, action_effectuee, details_operation)
       VALUES ($1, $2, $3)`,
      [matricule, action, details],
    );
  }
}