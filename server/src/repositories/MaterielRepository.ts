import { pool } from '../config/database.js';
import type {
  CreateMaterielDto,
  ListMaterielsQuery,
  Materiel,
  MaterielDto,
} from '../models/materiel.js';

const SELECT_MATERIEL = `
  SELECT m.code_materiel, m.num_serie, m.marque, m.modele,
         to_char(m.date_acquisition, 'YYYY-MM-DD') AS date_acquisition,
         m.statut_materiel, m.caracteristiques, m.type_categorie,
         m.type_equipement, m.systeme_aviation,
         m.id_localisation, l.nom_service, l.code_bureau, l.ville,
         m.id_localisation_origine,
         lo.nom_service AS origine_nom_service,
         lo.code_bureau AS origine_code_bureau,
         lo.ville AS origine_ville
    FROM materiels m
    JOIN localisations l ON l.id_localisation = m.id_localisation
    JOIN localisations lo ON lo.id_localisation = m.id_localisation_origine`;

type MaterielCreation = Omit<CreateMaterielDto, 'code_materiel'>;

function valeursEditables(dto: MaterielDto): unknown[] {
  return [
    dto.num_serie,
    dto.marque,
    dto.modele,
    dto.date_acquisition,
    dto.caracteristiques,
    dto.type_categorie,
    dto.type_equipement,
    dto.systeme_aviation,
  ];
}

function valeursCreation(dto: MaterielCreation): unknown[] {
  return [
    dto.num_serie,
    dto.marque,
    dto.modele,
    dto.date_acquisition,
    dto.caracteristiques,
    dto.type_categorie,
    dto.type_equipement,
    dto.systeme_aviation,
    dto.id_localisation_origine,
  ];
}

export class MaterielRepository {
  async findAll(f: ListMaterielsQuery): Promise<{ items: Materiel[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const param = (v: unknown): string => {
      values.push(v);
      return `$${values.length}`;
    };

    if (f.q) {
      const p = param(`%${f.q}%`);
      conditions.push(
        `(m.code_materiel ILIKE ${p} OR m.num_serie ILIKE ${p} OR m.marque ILIKE ${p} OR m.modele ILIKE ${p})`,
      );
    }
    if (f.type_categorie) conditions.push(`m.type_categorie = ${param(f.type_categorie)}`);
    if (f.statut_materiel) conditions.push(`m.statut_materiel = ${param(f.statut_materiel)}`);
    if (f.id_localisation) conditions.push(`m.id_localisation = ${param(f.id_localisation)}`);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM materiels m ${where}`,
      values,
    );
    const total = countRes.rows[0]?.total ?? 0;

    const limitParam = param(f.limit);
    const offsetParam = param((f.page - 1) * f.limit);
    const res = await pool.query<Materiel>(
      `${SELECT_MATERIEL}
       ${where}
       ORDER BY m.date_acquisition DESC, m.code_materiel
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      values,
    );
    return { items: res.rows, total };
  }

  async findByCode(code: string): Promise<Materiel | null> {
    const res = await pool.query<Materiel>(`${SELECT_MATERIEL} WHERE m.code_materiel = $1`, [code]);
    return res.rows[0] ?? null;
  }

  async create(code: string, dto: MaterielCreation): Promise<void> {
    await pool.query(
      `INSERT INTO materiels
         (code_materiel, num_serie, marque, modele, date_acquisition, statut_materiel,
          caracteristiques, type_categorie, type_equipement, systeme_aviation,
          id_localisation, id_localisation_origine)
       VALUES ($1, $2, $3, $4, $5, 'STOCK', $6, $7, $8, $9, $10, $10)`,
      [code, ...valeursCreation(dto)],
    );
  }

  async update(code: string, dto: MaterielDto): Promise<boolean> {
    const res = await pool.query(
      `UPDATE materiels
          SET num_serie = $2, marque = $3, modele = $4, date_acquisition = $5,
              caracteristiques = $6, type_categorie = $7, type_equipement = $8,
              systeme_aviation = $9
        WHERE code_materiel = $1`,
      [code, ...valeursEditables(dto)],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async delete(code: string): Promise<boolean> {
    const res = await pool.query('DELETE FROM materiels WHERE code_materiel = $1', [code]);
    return (res.rowCount ?? 0) > 0;
  }
}