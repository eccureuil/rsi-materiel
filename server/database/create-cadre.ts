import bcrypt from 'bcrypt';
import { pool } from '../src/config/database.js';

async function creerCadre(): Promise<void> {
  const [matricule, nom, prenom, motDePasse, specialite] = process.argv.slice(2);

  if (!matricule || !nom || !prenom || !motDePasse || !specialite) {
    console.error('Usage : pnpm cadre:create <matricule> <nom> <prenom> <mot_de_passe> <specialite>');
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
       VALUES ($1, $2, $3, $4, 'CADRE_MAINTENANCE')`,
      [matricule, nom, prenom, hash],
    );
    await client.query(
      'INSERT INTO cadres_maintenance (matricule, specialite) VALUES ($1, $2)',
      [matricule, specialite],
    );
    await client.query('COMMIT');
    console.log(`Cadre de maintenance ${matricule} créé (${specialite}).`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

creerCadre().catch((err: Error) => {
  console.error('Échec :', err.message);
  process.exit(1);
});