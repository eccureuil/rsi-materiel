import bcrypt from 'bcrypt';
import { pool } from '../src/config/database.js';

async function creerAdmin(): Promise<void> {
  const [matricule, nom, prenom, motDePasse] = process.argv.slice(2);

  if (!matricule || !nom || !prenom || !motDePasse) {
    console.error('Usage : pnpm admin:create <matricule> <nom> <prenom> <mot_de_passe>');
    process.exit(1);
  }
  if (motDePasse.length < 8) {
    console.error('Le mot de passe doit contenir au moins 8 caractères.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(motDePasse, 12);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO utilisateurs (matricule, nom, prenom, mot_de_passe, role)
       VALUES ($1, $2, $3, $4, 'ADMINISTRATEUR')`,
      [matricule, nom, prenom, hash],
    );
    await client.query('INSERT INTO administrateurs (matricule) VALUES ($1)', [matricule]);
    await client.query('COMMIT');
    console.log(`Administrateur ${matricule} créé.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

creerAdmin().catch((err: Error) => {
  console.error('Échec :', err.message);
  process.exit(1);
});