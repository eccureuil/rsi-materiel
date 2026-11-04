import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pool } from '../src/config/database.js';

function lire(nom: string): string {
  return readFileSync(join(process.cwd(), 'database', nom), 'utf8');
}

async function main(): Promise<void> {
  const fichiers = process.argv.slice(2);
  try {
    if (fichiers.length > 0) {
      for (const f of fichiers) {
        await pool.query(lire(f));
        console.log(`Script applique : ${f}`);
      }
      return;
    }

    await pool.query('DROP SEQUENCE IF EXISTS seq_num_incident, seq_num_intervention');
    await pool.query(lire('schema.sql'));
    await pool.query(lire('sequences.sql'));
    const res = await pool.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    console.log(`Schema applique : ${res.rowCount} tables creees.`);
    res.rows.forEach((r) => console.log(' -', r.table_name));
  } finally {
    await pool.end();
  }
}

main().catch((err: Error) => {
  console.error('Echec :', err.message);
  process.exit(1);
});