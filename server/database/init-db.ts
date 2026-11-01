import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pool } from '../src/config/database.js';

async function initialiserSchema(): Promise<void> {
  const chemin = join(process.cwd(), 'database', 'schema.sql');
  const sql = readFileSync(chemin, 'utf8');

  try {
    await pool.query(sql);
    const res = await pool.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    console.log(`Schema applique : ${res.rowCount} tables creees.`);
    res.rows.forEach((r) => console.log(' -', r.table_name));
  } finally {
    await pool.end();
  }
}

initialiserSchema().catch((err: Error) => {
  console.error('Echec :', err.message);
  process.exit(1);
});