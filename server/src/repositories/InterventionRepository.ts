import type { PoolClient } from 'pg';
import { pool } from '../config/database.js';
import type {
  Fiche,
  FicheListItem,
  FicheRow,
  Intervenant,
  ListInterventionsQuery,
  MajFicheDto,
  StatutIncident,
  TerminerFicheDto,
  TypeMaintenance,
} from '../models/incident.js';

const SELECT_FICHE = `
  SELECT f.num_intervention, f.num_incident, i.code_materiel, i.statut_incident,
         f.type_maintenance,
         to_char(f.date_debut, 'YYYY-MM-DD HH24:MI:SS') AS date_debut,
         to_char(f.date_fin, 'YYYY-MM-DD HH24:MI:SS') AS date_fin,
         f.diagnostic, f.travaux_realises, f.statut_final_materiel
    FROM fiches_interventions f
    JOIN pannes_incidents i ON i.num_incident = f.num_incident`;

export type FicheVerrou = {
  num_intervention: string;
  num_incident: string;
  code_materiel: string;
  statut_incident: StatutIncident;
  terminee: boolean;
};

export class InterventionRepository {
  async findByNum(num: string): Promise<Fiche | null> {
    const res = await pool.query<FicheRow>(`${SELECT_FICHE} WHERE f.num_intervention = $1`, [num]);
    const fiche = res.rows[0];
    if (!fiche) return null;

    const inter = await pool.query<Intervenant>(
      `SELECT ifc.matricule_cadre, u.nom, u.prenom, c.specialite,
              to_char(ifc.date_affectation, 'YYYY-MM-DD HH24:MI:SS') AS date_affectation
         FROM intervenants_fiches ifc
         JOIN cadres_maintenance c ON c.matricule = ifc.matricule_cadre
         JOIN utilisateurs u       ON u.matricule = c.matricule
        WHERE ifc.num_intervention = $1
        ORDER BY ifc.date_affectation, ifc.matricule_cadre`,
      [num],
    );
    return { ...fiche, intervenants: inter.rows };
  }

  async findAll(
    f: ListInterventionsQuery,
    matricule: string,
  ): Promise<{ items: FicheListItem[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const param = (v: unknown): string => {
      values.push(v);
      return `$${values.length}`;
    };

    if (f.type_maintenance) conditions.push(`f.type_maintenance = ${param(f.type_maintenance)}`);
    if (f.terminee === true) conditions.push('f.date_fin IS NOT NULL');
    if (f.terminee === false) conditions.push('f.date_fin IS NULL');
    if (f.mes_interventions === true) {
      conditions.push(
        `EXISTS (SELECT 1 FROM intervenants_fiches x
                  WHERE x.num_intervention = f.num_intervention
                    AND x.matricule_cadre = ${param(matricule)})`,
      );
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM fiches_interventions f ${where}`,
      values,
    );
    const total = countRes.rows[0]?.total ?? 0;

    const limitParam = param(f.limit);
    const offsetParam = param((f.page - 1) * f.limit);
    const res = await pool.query<FicheListItem>(
      `SELECT s.*,
              (SELECT COUNT(*)::int FROM intervenants_fiches x
                WHERE x.num_intervention = s.num_intervention) AS nb_intervenants
         FROM (${SELECT_FICHE} ${where}) s
        ORDER BY s.date_debut DESC, s.num_intervention DESC
        LIMIT ${limitParam} OFFSET ${offsetParam}`,
      values,
    );
    return { items: res.rows, total };
  }

  // --- Méthodes transactionnelles ---

  async findNumByIncidentTx(client: PoolClient, numIncident: string): Promise<string | null> {
    const res = await client.query<{ num_intervention: string }>(
      'SELECT num_intervention FROM fiches_interventions WHERE num_incident = $1',
      [numIncident],
    );
    return res.rows[0]?.num_intervention ?? null;
  }

  async insertFicheTx(
    client: PoolClient,
    numIncident: string,
    type: TypeMaintenance,
  ): Promise<string> {
    const res = await client.query<{ num_intervention: string }>(
      `INSERT INTO fiches_interventions (num_intervention, num_incident, type_maintenance)
       VALUES ('INT-' || to_char(CURRENT_DATE, 'YYYY') || '-' ||
               lpad(nextval('seq_num_intervention')::text, 5, '0'),
               $1, $2)
       RETURNING num_intervention`,
      [numIncident, type],
    );
    const row = res.rows[0];
    if (!row) throw new Error('Insertion de la fiche sans retour.');
    return row.num_intervention;
  }

  // RG_INTERVENTION_01 : clé composée (num_intervention, matricule_cadre) => pas de doublon
  async addIntervenantTx(client: PoolClient, num: string, matricule: string): Promise<boolean> {
    const res = await client.query(
      `INSERT INTO intervenants_fiches (num_intervention, matricule_cadre)
       VALUES ($1, $2)
       ON CONFLICT (num_intervention, matricule_cadre) DO NOTHING`,
      [num, matricule],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async lockFicheTx(client: PoolClient, num: string): Promise<FicheVerrou | null> {
    const res = await client.query<FicheVerrou>(
      `SELECT f.num_intervention, f.num_incident, i.code_materiel, i.statut_incident,
              (f.date_fin IS NOT NULL) AS terminee
         FROM fiches_interventions f
         JOIN pannes_incidents i ON i.num_incident = f.num_incident
        WHERE f.num_intervention = $1
          FOR UPDATE OF f, i`,
      [num],
    );
    return res.rows[0] ?? null;
  }

  async isIntervenantTx(client: PoolClient, num: string, matricule: string): Promise<boolean> {
    const res = await client.query(
      'SELECT 1 FROM intervenants_fiches WHERE num_intervention = $1 AND matricule_cadre = $2',
      [num, matricule],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async updateFicheTx(client: PoolClient, num: string, dto: MajFicheDto): Promise<void> {
    await client.query(
      'UPDATE fiches_interventions SET diagnostic = $2, travaux_realises = $3 WHERE num_intervention = $1',
      [num, dto.diagnostic, dto.travaux_realises],
    );
  }

  async terminerFicheTx(client: PoolClient, num: string, dto: TerminerFicheDto): Promise<void> {
    await client.query(
      `UPDATE fiches_interventions
          SET diagnostic = COALESCE($2, diagnostic),
              travaux_realises = $3,
              statut_final_materiel = $4,
              date_fin = CURRENT_TIMESTAMP
        WHERE num_intervention = $1`,
      [num, dto.diagnostic ?? null, dto.travaux_realises, dto.statut_final_materiel],
    );
  }
}