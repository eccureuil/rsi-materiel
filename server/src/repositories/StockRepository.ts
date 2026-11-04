import type { PoolClient } from 'pg';
import { pool } from '../config/database.js';
import type {
  CreatePieceDto,
  Imputation,
  ListPiecesQuery,
  Piece,
  PieceVerrou,
  UpdatePieceDto,
} from '../models/stock.js';

const SELECT_PIECE = `
  SELECT ref_piece, designation, quantite_en_stock, seuil_minimum,
         (quantite_en_stock <= seuil_minimum) AS en_alerte
    FROM pieces_detachees`;

const SELECT_IMPUTATION = `
  SELECT ip.id_imputation, ip.num_intervention, ip.ref_piece, p.designation,
         ip.quantite_utilisee,
         to_char(ip.date_imputation, 'YYYY-MM-DD HH24:MI:SS') AS date_imputation
    FROM imputations_pieces ip
    JOIN pieces_detachees p ON p.ref_piece = ip.ref_piece`;

export class StockRepository {
  // --- Pièces ---

  async findAll(f: ListPiecesQuery): Promise<{ items: Piece[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const param = (v: unknown): string => {
      values.push(v);
      return `$${values.length}`;
    };

    if (f.q) {
      const p = param(`%${f.q}%`);
      conditions.push(`(ref_piece ILIKE ${p} OR designation ILIKE ${p})`);
    }
    if (f.sous_seuil === true) conditions.push('quantite_en_stock <= seuil_minimum');
    if (f.sous_seuil === false) conditions.push('quantite_en_stock > seuil_minimum');
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM pieces_detachees ${where}`,
      values,
    );
    const total = countRes.rows[0]?.total ?? 0;

    const limitParam = param(f.limit);
    const offsetParam = param((f.page - 1) * f.limit);
    const res = await pool.query<Piece>(
      `${SELECT_PIECE}
       ${where}
       ORDER BY en_alerte DESC, designation, ref_piece
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      values,
    );
    return { items: res.rows, total };
  }

  async findByRef(ref: string): Promise<Piece | null> {
    const res = await pool.query<Piece>(`${SELECT_PIECE} WHERE ref_piece = $1`, [ref]);
    return res.rows[0] ?? null;
  }

  async create(dto: CreatePieceDto): Promise<void> {
    await pool.query(
      `INSERT INTO pieces_detachees (ref_piece, designation, quantite_en_stock, seuil_minimum)
       VALUES ($1, $2, $3, $4)`,
      [dto.ref_piece, dto.designation, dto.quantite_en_stock, dto.seuil_minimum],
    );
  }

  async update(ref: string, dto: UpdatePieceDto): Promise<boolean> {
    const res = await pool.query(
      'UPDATE pieces_detachees SET designation = $2, seuil_minimum = $3 WHERE ref_piece = $1',
      [ref, dto.designation, dto.seuil_minimum],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async delete(ref: string): Promise<boolean> {
    const res = await pool.query('DELETE FROM pieces_detachees WHERE ref_piece = $1', [ref]);
    return (res.rowCount ?? 0) > 0;
  }

  async approvisionner(ref: string, quantite: number): Promise<boolean> {
    const res = await pool.query(
      'UPDATE pieces_detachees SET quantite_en_stock = quantite_en_stock + $2 WHERE ref_piece = $1',
      [ref, quantite],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async ajuster(ref: string, quantite: number): Promise<boolean> {
    const res = await pool.query(
      'UPDATE pieces_detachees SET quantite_en_stock = $2 WHERE ref_piece = $1',
      [ref, quantite],
    );
    return (res.rowCount ?? 0) > 0;
  }

  // --- Imputations ---

  async findImputationsByIntervention(num: string): Promise<Imputation[]> {
    const res = await pool.query<Imputation>(
      `${SELECT_IMPUTATION} WHERE ip.num_intervention = $1 ORDER BY ip.id_imputation`,
      [num],
    );
    return res.rows;
  }

  async findImputationById(id: number): Promise<Imputation | null> {
    const res = await pool.query<Imputation>(`${SELECT_IMPUTATION} WHERE ip.id_imputation = $1`, [id]);
    return res.rows[0] ?? null;
  }

  // --- Méthodes transactionnelles ---

  async lockPieceTx(client: PoolClient, ref: string): Promise<PieceVerrou | null> {
    const res = await client.query<PieceVerrou>(
      `SELECT ref_piece, designation, quantite_en_stock, seuil_minimum
         FROM pieces_detachees
        WHERE ref_piece = $1
          FOR UPDATE`,
      [ref],
    );
    return res.rows[0] ?? null;
  }

  // Garde atomique RG_STOCK_01 : ne décrémente que si le stock est suffisant.
  async decrementerTx(client: PoolClient, ref: string, quantite: number): Promise<boolean> {
    const res = await client.query(
      `UPDATE pieces_detachees
          SET quantite_en_stock = quantite_en_stock - $2
        WHERE ref_piece = $1 AND quantite_en_stock >= $2`,
      [ref, quantite],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async incrementerTx(client: PoolClient, ref: string, quantite: number): Promise<void> {
    await client.query(
      'UPDATE pieces_detachees SET quantite_en_stock = quantite_en_stock + $2 WHERE ref_piece = $1',
      [ref, quantite],
    );
  }

  async insertImputationTx(
    client: PoolClient,
    num: string,
    ref: string,
    quantite: number,
  ): Promise<number> {
    const res = await client.query<{ id_imputation: number }>(
      `INSERT INTO imputations_pieces (num_intervention, ref_piece, quantite_utilisee)
       VALUES ($1, $2, $3)
       RETURNING id_imputation`,
      [num, ref, quantite],
    );
    const row = res.rows[0];
    if (!row) throw new Error("Insertion de l'imputation sans retour.");
    return row.id_imputation;
  }

  async lockImputationTx(
    client: PoolClient,
    id: number,
    num: string,
  ): Promise<{ id_imputation: number; ref_piece: string; quantite_utilisee: number } | null> {
    const res = await client.query<{
      id_imputation: number;
      ref_piece: string;
      quantite_utilisee: number;
    }>(
      `SELECT id_imputation, ref_piece, quantite_utilisee
         FROM imputations_pieces
        WHERE id_imputation = $1 AND num_intervention = $2
          FOR UPDATE`,
      [id, num],
    );
    return res.rows[0] ?? null;
  }

  async deleteImputationTx(client: PoolClient, id: number): Promise<void> {
    await client.query('DELETE FROM imputations_pieces WHERE id_imputation = $1', [id]);
  }
}