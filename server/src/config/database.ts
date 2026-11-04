import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import { env } from './env.js';

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err: Error) => {
  console.error('Erreur inattendue du pool PostgreSQL :', err.message);
});

export async function verifierConnexionDB(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('Connexion PostgreSQL établie.');
  } finally {
    client.release();
  }
}

// Exécute `fn` dans une transaction : COMMIT si tout réussit, ROLLBACK à la première erreur.
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}