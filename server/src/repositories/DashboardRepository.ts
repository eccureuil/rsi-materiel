import { pool } from '../config/database.js';
import type { IncidentResume, MaterielParLocalisation, PieceAlerte } from '../models/dashboard.js';

export type Compte = { cle: string; total: number };

export type ResumeInterventions = {
  en_cours: number;
  terminees_30_jours: number;
  mes_en_cours: number;
  duree_moyenne_heures: number | null;
};

export type ResumeStock = {
  total_references: number;
  en_alerte: number;
  en_rupture: number;
};

export class DashboardRepository {
  async materielsParStatut(): Promise<Compte[]> {
    const res = await pool.query<Compte>(
      'SELECT statut_materiel AS cle, COUNT(*)::int AS total FROM materiels GROUP BY statut_materiel',
    );
    return res.rows;
  }

  async materielsParCategorie(): Promise<Compte[]> {
    const res = await pool.query<Compte>(
      'SELECT type_categorie AS cle, COUNT(*)::int AS total FROM materiels GROUP BY type_categorie',
    );
    return res.rows;
  }

  async materielsParLocalisation(): Promise<MaterielParLocalisation[]> {
    const res = await pool.query<MaterielParLocalisation>(
      `SELECT l.id_localisation, l.nom_service, l.code_bureau, l.ville,
              COUNT(m.code_materiel)::int AS total
         FROM localisations l
         LEFT JOIN materiels m ON m.id_localisation = l.id_localisation
        GROUP BY l.id_localisation, l.nom_service, l.code_bureau, l.ville
        ORDER BY total DESC, l.nom_service`,
    );
    return res.rows;
  }

  async incidentsParStatut(): Promise<Compte[]> {
    const res = await pool.query<Compte>(
      'SELECT statut_incident AS cle, COUNT(*)::int AS total FROM pannes_incidents GROUP BY statut_incident',
    );
    return res.rows;
  }

  async incidentsOuvertsParUrgence(): Promise<Compte[]> {
    const res = await pool.query<Compte>(
      `SELECT degre_urgence AS cle, COUNT(*)::int AS total
         FROM pannes_incidents
        WHERE statut_incident IN ('DECLARE', 'PRISE_EN_CHARGE', 'EN_COURS')
        GROUP BY degre_urgence`,
    );
    return res.rows;
  }

  // 6 derniers mois, mois sans incident inclus (total = 0)
  async incidentsParMois(): Promise<{ mois: string; total: number }[]> {
    const res = await pool.query<{ mois: string; total: number }>(
      `SELECT to_char(m.mois, 'YYYY-MM') AS mois, COALESCE(c.total, 0)::int AS total
         FROM generate_series(
                date_trunc('month', LOCALTIMESTAMP) - interval '5 months',
                date_trunc('month', LOCALTIMESTAMP),
                interval '1 month') AS m(mois)
         LEFT JOIN (
                SELECT date_trunc('month', date_declaration) AS mois, COUNT(*)::int AS total
                  FROM pannes_incidents
                 GROUP BY 1) c ON c.mois = m.mois
        ORDER BY m.mois`,
    );
    return res.rows;
  }

  async incidentsPrioritaires(limite: number): Promise<IncidentResume[]> {
    const res = await pool.query<IncidentResume>(
      `SELECT i.num_incident, i.code_materiel, m.marque, m.modele, l.nom_service,
              i.degre_urgence, i.statut_incident,
              to_char(i.date_declaration, 'YYYY-MM-DD HH24:MI:SS') AS date_declaration
         FROM pannes_incidents i
         JOIN materiels m     ON m.code_materiel = i.code_materiel
         JOIN localisations l ON l.id_localisation = m.id_localisation
        WHERE i.statut_incident IN ('DECLARE', 'PRISE_EN_CHARGE', 'EN_COURS')
        ORDER BY CASE i.degre_urgence
                   WHEN 'CRITIQUE' THEN 1 WHEN 'URGENT' THEN 2 WHEN 'MOYEN' THEN 3 ELSE 4 END,
                 i.date_declaration
        LIMIT $1`,
      [limite],
    );
    return res.rows;
  }

  async resumeInterventions(matricule: string): Promise<ResumeInterventions> {
    const res = await pool.query<ResumeInterventions>(
      `SELECT COUNT(*) FILTER (WHERE f.date_fin IS NULL)::int AS en_cours,
              COUNT(*) FILTER (WHERE f.date_fin >= LOCALTIMESTAMP - interval '30 days')::int
                AS terminees_30_jours,
              COUNT(*) FILTER (
                WHERE f.date_fin IS NULL
                  AND EXISTS (SELECT 1 FROM intervenants_fiches x
                               WHERE x.num_intervention = f.num_intervention
                                 AND x.matricule_cadre = $1))::int AS mes_en_cours,
              ROUND(EXTRACT(EPOCH FROM AVG(f.date_fin - f.date_debut)) / 3600, 1)::float8
                AS duree_moyenne_heures
         FROM fiches_interventions f`,
      [matricule],
    );
    return (
      res.rows[0] ?? {
        en_cours: 0,
        terminees_30_jours: 0,
        mes_en_cours: 0,
        duree_moyenne_heures: null,
      }
    );
  }

  async resumeStock(): Promise<ResumeStock> {
    const res = await pool.query<ResumeStock>(
      `SELECT COUNT(*)::int AS total_references,
              COUNT(*) FILTER (WHERE quantite_en_stock <= seuil_minimum)::int AS en_alerte,
              COUNT(*) FILTER (WHERE quantite_en_stock = 0)::int AS en_rupture
         FROM pieces_detachees`,
    );
    return res.rows[0] ?? { total_references: 0, en_alerte: 0, en_rupture: 0 };
  }

  async piecesEnAlerte(limite: number): Promise<PieceAlerte[]> {
    const res = await pool.query<PieceAlerte>(
      `SELECT ref_piece, designation, quantite_en_stock, seuil_minimum
         FROM pieces_detachees
        WHERE quantite_en_stock <= seuil_minimum
        ORDER BY quantite_en_stock, designation
        LIMIT $1`,
      [limite],
    );
    return res.rows;
  }
}