import type { PoolClient } from 'pg';
import { pool } from '../config/database.js';
import type {
  Affectation,
  BonDecharge,
  CreateAffectationDto,
  ListAffectationsQuery,
  LocalisationRef,
} from '../models/affectation.js';
import type { StatutMateriel } from '../models/materiel.js';

const SELECT_AFFECTATION = `
  SELECT a.id_affectation, a.code_materiel, m.marque, m.modele,
         a.id_localisation, l.nom_service, l.code_bureau, l.ville,
         to_char(a.date_mouvement, 'YYYY-MM-DD HH24:MI:SS') AS date_mouvement,
         a.type_mouvement, a.agent_beneficiaire, a.motif_mouvement, b.num_bon
    FROM affectations a
    JOIN materiels m     ON m.code_materiel = a.code_materiel
    JOIN localisations l ON l.id_localisation = a.id_localisation
    LEFT JOIN bons_decharge b ON b.id_affectation = a.id_affectation`;

type BonLigne = Omit<BonDecharge, 'destination' | 'origine'> & {
  dest_id: number;
  dest_nom_service: string;
  dest_code_bureau: string | null;
  dest_ville: string;
};

export type MaterielVerrou = {
  code_materiel: string;
  statut_materiel: StatutMateriel;
  id_localisation: number;
};

export class AffectationRepository {
  async findAll(f: ListAffectationsQuery): Promise<{ items: Affectation[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const param = (v: unknown): string => {
      values.push(v);
      return `$${values.length}`;
    };

    if (f.code_materiel) conditions.push(`a.code_materiel = ${param(f.code_materiel)}`);
    if (f.type_mouvement) conditions.push(`a.type_mouvement = ${param(f.type_mouvement)}`);
    if (f.id_localisation) conditions.push(`a.id_localisation = ${param(f.id_localisation)}`);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM affectations a ${where}`,
      values,
    );
    const total = countRes.rows[0]?.total ?? 0;

    const limitParam = param(f.limit);
    const offsetParam = param((f.page - 1) * f.limit);
    const res = await pool.query<Affectation>(
      `${SELECT_AFFECTATION}
       ${where}
       ORDER BY a.date_mouvement DESC, a.id_affectation DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      values,
    );
    return { items: res.rows, total };
  }

  async findById(id: number): Promise<Affectation | null> {
    const res = await pool.query<Affectation>(`${SELECT_AFFECTATION} WHERE a.id_affectation = $1`, [id]);
    return res.rows[0] ?? null;
  }

  async findBonByNum(num: string): Promise<BonDecharge | null> {
    const res = await pool.query<BonLigne>(
      `SELECT b.num_bon, b.id_affectation,
              to_char(b.date_emission, 'YYYY-MM-DD') AS date_emission,
              b.chemin_fichier_pdf, a.type_mouvement,
              to_char(a.date_mouvement, 'YYYY-MM-DD HH24:MI:SS') AS date_mouvement,
              a.agent_beneficiaire, a.motif_mouvement, a.code_materiel,
              m.marque, m.modele, m.num_serie, m.type_categorie, m.type_equipement,
              m.systeme_aviation, m.caracteristiques,
              l.id_localisation AS dest_id, l.nom_service AS dest_nom_service,
              l.code_bureau AS dest_code_bureau, l.ville AS dest_ville
         FROM bons_decharge b
         JOIN affectations a  ON a.id_affectation = b.id_affectation
         JOIN materiels m     ON m.code_materiel = a.code_materiel
         JOIN localisations l ON l.id_localisation = a.id_localisation
        WHERE b.num_bon = $1`,
      [num],
    );
    const ligne = res.rows[0];
    if (!ligne) return null;

    // Provenance = localisation du mouvement précédent du même matériel (si elle existe)
    const origine = await pool.query<LocalisationRef>(
      `SELECT l.id_localisation, l.nom_service, l.code_bureau, l.ville
         FROM affectations a
         JOIN localisations l ON l.id_localisation = a.id_localisation
        WHERE a.code_materiel = $1 AND a.id_affectation < $2
        ORDER BY a.id_affectation DESC
        LIMIT 1`,
      [ligne.code_materiel, ligne.id_affectation],
    );

    const { dest_id, dest_nom_service, dest_code_bureau, dest_ville, ...reste } = ligne;
    return {
      ...reste,
      destination: {
        id_localisation: dest_id,
        nom_service: dest_nom_service,
        code_bureau: dest_code_bureau,
        ville: dest_ville,
      },
      origine: origine.rows[0] ?? null,
    };
  }

  async setCheminPdf(num: string, chemin: string): Promise<void> {
    await pool.query('UPDATE bons_decharge SET chemin_fichier_pdf = $2 WHERE num_bon = $1', [
      num,
      chemin,
    ]);
  }

  // --- Méthodes transactionnelles ---

  async lockMaterielTx(client: PoolClient, code: string): Promise<MaterielVerrou | null> {
    const res = await client.query<MaterielVerrou>(
      `SELECT code_materiel, statut_materiel, id_localisation
         FROM materiels
        WHERE code_materiel = $1
          FOR UPDATE`,
      [code],
    );
    return res.rows[0] ?? null;
  }

  async localisationExistsTx(client: PoolClient, id: number): Promise<boolean> {
    const res = await client.query('SELECT 1 FROM localisations WHERE id_localisation = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async insertAffectationTx(client: PoolClient, dto: CreateAffectationDto): Promise<number> {
    const res = await client.query<{ id_affectation: number }>(
      `INSERT INTO affectations
         (code_materiel, id_localisation, type_mouvement, agent_beneficiaire, motif_mouvement)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_affectation`,
      [dto.code_materiel, dto.id_localisation, dto.type_mouvement, dto.agent_beneficiaire, dto.motif_mouvement],
    );
    const row = res.rows[0];
    if (!row) throw new Error("Insertion de l'affectation sans retour.");
    return row.id_affectation;
  }

  async updateMaterielTx(
    client: PoolClient,
    code: string,
    idLocalisation: number,
    statut: StatutMateriel,
  ): Promise<void> {
    await client.query(
      'UPDATE materiels SET id_localisation = $2, statut_materiel = $3 WHERE code_materiel = $1',
      [code, idLocalisation, statut],
    );
  }

  async insertBonTx(client: PoolClient, idAffectation: number): Promise<string> {
    const res = await client.query<{ num_bon: string }>(
      `INSERT INTO bons_decharge (num_bon, id_affectation)
       VALUES ('BD-' || to_char(CURRENT_DATE, 'YYYY') || '-' ||
               lpad(nextval('seq_num_bon')::text, 5, '0'),
               $1)
       RETURNING num_bon`,
      [idAffectation],
    );
    const row = res.rows[0];
    if (!row) throw new Error('Insertion du bon sans retour.');
    return row.num_bon;
  }
}