import type { PoolClient } from 'pg';
import { pool } from '../config/database.js';
import type {
  CompteRenduDto,
  CompteRenduIntervention,
  Fiche,
  FicheListItem,
  FicheRow,
  Intervenant,
  ListInterventionsQuery,
  StatutIncident,
  TerminerFicheDto,
  TypeMaintenance,
} from '../models/incident.js';

const SELECT_FICHE = `
  SELECT f.num_intervention, f.num_incident, i.code_materiel, i.statut_incident,
         f.type_maintenance,
         to_char(f.date_debut, 'YYYY-MM-DD HH24:MI:SS') AS date_debut,
         to_char(f.date_fin, 'YYYY-MM-DD HH24:MI:SS') AS date_fin,
         dernier.diagnostic, dernier.travaux_realises, f.statut_final_materiel
    FROM fiches_interventions f
    JOIN pannes_incidents i ON i.num_incident = f.num_incident
    LEFT JOIN LATERAL (
      SELECT cr.diagnostic, cr.travaux_realises
        FROM comptes_rendus_intervention cr
       WHERE cr.num_intervention = f.num_intervention
       ORDER BY cr.date_saisie DESC, cr.id_compte_rendu DESC
       LIMIT 1
    ) dernier ON TRUE`;

const SELECT_COMPTE_RENDU = `
  SELECT cr.id_compte_rendu, cr.num_intervention, cr.matricule_cadre,
         CASE
           WHEN u.matricule IS NULL THEN NULL
           ELSE u.prenom || ' ' || u.nom
         END AS auteur,
         cr.diagnostic, cr.travaux_realises, cr.est_final,
         to_char(cr.date_saisie, 'YYYY-MM-DD HH24:MI:SS') AS date_saisie
    FROM comptes_rendus_intervention cr
    LEFT JOIN utilisateurs u ON u.matricule = cr.matricule_cadre`;

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

    const [inter, comptes] = await Promise.all([
      pool.query<Intervenant>(
        `SELECT ifc.matricule_cadre, u.nom, u.prenom, c.specialite,
                to_char(ifc.date_affectation, 'YYYY-MM-DD HH24:MI:SS') AS date_affectation
           FROM intervenants_fiches ifc
           JOIN cadres_maintenance c ON c.matricule = ifc.matricule_cadre
           JOIN utilisateurs u       ON u.matricule = c.matricule
          WHERE ifc.num_intervention = $1
          ORDER BY ifc.date_affectation, ifc.matricule_cadre`,
        [num],
      ),
      pool.query<CompteRenduIntervention>(
        `${SELECT_COMPTE_RENDU}
          WHERE cr.num_intervention = $1
          ORDER BY cr.date_saisie, cr.id_compte_rendu`,
        [num],
      ),
    ]);
    return { ...fiche, intervenants: inter.rows, comptes_rendus: comptes.rows };
  }

  async findAllByIncident(numIncident: string): Promise<Fiche[]> {
    const res = await pool.query<FicheRow>(
      `${SELECT_FICHE}
        WHERE f.num_incident = $1
        ORDER BY (f.date_fin IS NULL) DESC, f.date_debut DESC, f.num_intervention DESC`,
      [numIncident],
    );
    const fiches = res.rows;
    if (fiches.length === 0) return [];

    const nums = fiches.map((f) => f.num_intervention);
    const [inter, comptes] = await Promise.all([
      pool.query<Intervenant & { num_intervention: string }>(
        `SELECT ifc.num_intervention, ifc.matricule_cadre, u.nom, u.prenom, c.specialite,
                to_char(ifc.date_affectation, 'YYYY-MM-DD HH24:MI:SS') AS date_affectation
           FROM intervenants_fiches ifc
           JOIN cadres_maintenance c ON c.matricule = ifc.matricule_cadre
           JOIN utilisateurs u       ON u.matricule = c.matricule
          WHERE ifc.num_intervention = ANY($1::text[])
          ORDER BY ifc.num_intervention, ifc.date_affectation, ifc.matricule_cadre`,
        [nums],
      ),
      pool.query<CompteRenduIntervention>(
        `${SELECT_COMPTE_RENDU}
          WHERE cr.num_intervention = ANY($1::text[])
          ORDER BY cr.num_intervention, cr.date_saisie, cr.id_compte_rendu`,
        [nums],
      ),
    ]);

    const intervenantsParFiche = new Map<string, Intervenant[]>();
    for (const { num_intervention, ...intervenant } of inter.rows) {
      const liste = intervenantsParFiche.get(num_intervention) ?? [];
      liste.push(intervenant);
      intervenantsParFiche.set(num_intervention, liste);
    }

    const comptesParFiche = new Map<string, CompteRenduIntervention[]>();
    for (const compte of comptes.rows) {
      const liste = comptesParFiche.get(compte.num_intervention) ?? [];
      liste.push(compte);
      comptesParFiche.set(compte.num_intervention, liste);
    }

    return fiches.map((fiche) => ({
      ...fiche,
      intervenants: intervenantsParFiche.get(fiche.num_intervention) ?? [],
      comptes_rendus: comptesParFiche.get(fiche.num_intervention) ?? [],
    }));
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

  async findOuverteByIncidentTx(client: PoolClient, numIncident: string): Promise<string | null> {
    const res = await client.query<{ num_intervention: string }>(
      `SELECT num_intervention
         FROM fiches_interventions
        WHERE num_incident = $1
          AND date_fin IS NULL
        ORDER BY date_debut DESC, num_intervention DESC
        LIMIT 1`,
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

  async insertCompteRenduTx(
    client: PoolClient,
    num: string,
    matricule: string,
    dto: CompteRenduDto,
    estFinal = false,
  ): Promise<number> {
    const res = await client.query<{ id_compte_rendu: number }>(
      `INSERT INTO comptes_rendus_intervention
         (num_intervention, matricule_cadre, diagnostic, travaux_realises, est_final)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_compte_rendu`,
      [num, matricule, dto.diagnostic, dto.travaux_realises, estFinal],
    );
    const row = res.rows[0];
    if (!row) throw new Error('Insertion du compte rendu sans retour.');
    return row.id_compte_rendu;
  }

  async updateCompteRenduTx(
    client: PoolClient,
    num: string,
    id: number,
    dto: CompteRenduDto,
  ): Promise<boolean> {
    const res = await client.query(
      `UPDATE comptes_rendus_intervention
          SET diagnostic = $3,
              travaux_realises = $4
        WHERE id_compte_rendu = $1
          AND num_intervention = $2
          AND est_final = FALSE`,
      [id, num, dto.diagnostic, dto.travaux_realises],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async deleteCompteRenduTx(client: PoolClient, num: string, id: number): Promise<boolean> {
    const res = await client.query(
      `DELETE FROM comptes_rendus_intervention
        WHERE id_compte_rendu = $1
          AND num_intervention = $2
          AND est_final = FALSE`,
      [id, num],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async terminerFicheTx(client: PoolClient, num: string, dto: TerminerFicheDto): Promise<void> {
    await client.query(
      `UPDATE fiches_interventions
          SET statut_final_materiel = $2,
              date_fin = CURRENT_TIMESTAMP
        WHERE num_intervention = $1`,
      [num, dto.statut_final_materiel],
    );
  }
}
