import type { PoolClient } from 'pg';
import { pool } from '../config/database.js';
import type {
  DeclarerIncidentDto,
  Incident,
  ListIncidentsQuery,
  StatutIncident,
} from '../models/incident.js';
import type { StatutMateriel } from '../models/materiel.js';

const SELECT_INCIDENT = `
  SELECT i.num_incident, i.code_materiel, m.marque, m.modele, m.type_categorie,
         l.nom_service, i.matricule_declarant,
         u.nom AS declarant_nom, u.prenom AS declarant_prenom,
         to_char(i.date_declaration, 'YYYY-MM-DD HH24:MI:SS') AS date_declaration,
         i.symptomes, i.degre_urgence, i.statut_incident,
         f.num_intervention,
         (SELECT COUNT(*)::int FROM intervenants_fiches x
           WHERE x.num_intervention = f.num_intervention) AS nb_intervenants
    FROM pannes_incidents i
    JOIN materiels m      ON m.code_materiel = i.code_materiel
    JOIN localisations l  ON l.id_localisation = m.id_localisation
    JOIN utilisateurs u   ON u.matricule = i.matricule_declarant
    LEFT JOIN fiches_interventions f ON f.num_incident = i.num_incident`;

export type IncidentVerrou = {
  num_incident: string;
  code_materiel: string;
  statut_incident: StatutIncident;
};

export class IncidentRepository {
  async findAll(f: ListIncidentsQuery): Promise<{ items: Incident[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const param = (v: unknown): string => {
      values.push(v);
      return `$${values.length}`;
    };

    if (f.q) {
      const p = param(`%${f.q}%`);
      conditions.push(
        `(i.num_incident ILIKE ${p} OR i.code_materiel ILIKE ${p} OR i.symptomes ILIKE ${p})`,
      );
    }
    if (f.statut_incident) conditions.push(`i.statut_incident = ${param(f.statut_incident)}`);
    if (f.degre_urgence) conditions.push(`i.degre_urgence = ${param(f.degre_urgence)}`);
    if (f.code_materiel) conditions.push(`i.code_materiel = ${param(f.code_materiel)}`);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM pannes_incidents i ${where}`,
      values,
    );
    const total = countRes.rows[0]?.total ?? 0;

    const limitParam = param(f.limit);
    const offsetParam = param((f.page - 1) * f.limit);
    const res = await pool.query<Incident>(
      `${SELECT_INCIDENT}
       ${where}
       ORDER BY i.date_declaration DESC, i.num_incident DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      values,
    );
    return { items: res.rows, total };
  }

  async findByNum(num: string): Promise<Incident | null> {
    const res = await pool.query<Incident>(`${SELECT_INCIDENT} WHERE i.num_incident = $1`, [num]);
    return res.rows[0] ?? null;
  }

  // --- Méthodes transactionnelles ---

  async lockByNumTx(client: PoolClient, num: string): Promise<IncidentVerrou | null> {
    const res = await client.query<IncidentVerrou>(
      `SELECT num_incident, code_materiel, statut_incident
         FROM pannes_incidents
        WHERE num_incident = $1
          FOR UPDATE`,
      [num],
    );
    return res.rows[0] ?? null;
  }

  async hasActiveIncidentTx(client: PoolClient, code: string): Promise<boolean> {
    const res = await client.query(
      `SELECT 1 FROM pannes_incidents
        WHERE code_materiel = $1
          AND statut_incident IN ('DECLARE', 'PRISE_EN_CHARGE', 'EN_COURS')`,
      [code],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async insertTx(client: PoolClient, dto: DeclarerIncidentDto, matricule: string): Promise<string> {
    const res = await client.query<{ num_incident: string }>(
      `INSERT INTO pannes_incidents
         (num_incident, code_materiel, matricule_declarant, symptomes, degre_urgence)
       VALUES ('INC-' || to_char(CURRENT_DATE, 'YYYY') || '-' ||
               lpad(nextval('seq_num_incident')::text, 5, '0'),
               $1, $2, $3, $4)
       RETURNING num_incident`,
      [dto.code_materiel, matricule, dto.symptomes, dto.degre_urgence],
    );
    const row = res.rows[0];
    if (!row) throw new Error("Insertion de l'incident sans retour.");
    return row.num_incident;
  }

  async updateStatutTx(client: PoolClient, num: string, statut: StatutIncident): Promise<void> {
    await client.query('UPDATE pannes_incidents SET statut_incident = $2 WHERE num_incident = $1', [
      num,
      statut,
    ]);
  }

  async getMaterielStatutTx(client: PoolClient, code: string): Promise<StatutMateriel | null> {
    const res = await client.query<{ statut_materiel: StatutMateriel }>(
      'SELECT statut_materiel FROM materiels WHERE code_materiel = $1 FOR UPDATE',
      [code],
    );
    return res.rows[0]?.statut_materiel ?? null;
  }

  // Si `siActuel` est fourni, le changement n'a lieu que si le statut courant correspond.
  async setMaterielStatutTx(
    client: PoolClient,
    code: string,
    statut: StatutMateriel,
    siActuel?: StatutMateriel,
  ): Promise<void> {
    if (siActuel) {
      await client.query(
        'UPDATE materiels SET statut_materiel = $2 WHERE code_materiel = $1 AND statut_materiel = $3',
        [code, statut, siActuel],
      );
      return;
    }
    await client.query('UPDATE materiels SET statut_materiel = $2 WHERE code_materiel = $1', [
      code,
      statut,
    ]);
  }
}