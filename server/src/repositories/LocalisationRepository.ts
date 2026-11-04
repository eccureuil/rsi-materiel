import { pool } from '../config/database.js';
import type { Localisation, LocalisationDto } from '../models/localisation.js';

const SELECT_LOCALISATION = `
  SELECT l.id_localisation, l.nom_service, l.code_bureau, l.ville,
         COUNT(m.code_materiel)::int AS nb_materiels
    FROM localisations l
    LEFT JOIN materiels m ON m.id_localisation = l.id_localisation`;

export class LocalisationRepository {
  async findAll(): Promise<Localisation[]> {
    const res = await pool.query<Localisation>(
      `${SELECT_LOCALISATION}
       GROUP BY l.id_localisation
       ORDER BY l.nom_service, l.code_bureau NULLS FIRST`,
    );
    return res.rows;
  }

  async findById(id: number): Promise<Localisation | null> {
    const res = await pool.query<Localisation>(
      `${SELECT_LOCALISATION}
       WHERE l.id_localisation = $1
       GROUP BY l.id_localisation`,
      [id],
    );
    return res.rows[0] ?? null;
  }

  async exists(id: number): Promise<boolean> {
    const res = await pool.query('SELECT 1 FROM localisations WHERE id_localisation = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async create(dto: LocalisationDto): Promise<number> {
    const res = await pool.query<{ id_localisation: number }>(
      `INSERT INTO localisations (nom_service, code_bureau, ville)
       VALUES ($1, $2, $3)
       RETURNING id_localisation`,
      [dto.nom_service, dto.code_bureau, dto.ville],
    );
    const row = res.rows[0];
    if (!row) {
      throw new Error('Insertion de la localisation sans retour.');
    }
    return row.id_localisation;
  }

  async update(id: number, dto: LocalisationDto): Promise<boolean> {
    const res = await pool.query(
      `UPDATE localisations
          SET nom_service = $2, code_bureau = $3, ville = $4
        WHERE id_localisation = $1`,
      [id, dto.nom_service, dto.code_bureau, dto.ville],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async delete(id: number): Promise<boolean> {
    const res = await pool.query('DELETE FROM localisations WHERE id_localisation = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }
}