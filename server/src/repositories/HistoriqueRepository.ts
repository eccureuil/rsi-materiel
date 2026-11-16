import { pool } from '../config/database.js';
import type { Evenement, FiltresHistorique, SyntheseMateriel } from '../models/historique.js';

// Frise unifiée : une ligne par événement, `ordre` départage les événements simultanés.
const EVENEMENTS_CTE = `
  WITH evenements AS (
    SELECT m.code_materiel, 'ACQUISITION'::text AS type_evenement, 1 AS ordre,
           m.date_acquisition::timestamp AS date_evenement,
           m.code_materiel::text AS reference,
           jsonb_build_object(
             'marque', m.marque,
             'modele', m.modele,
             'num_serie', m.num_serie,
             'localisation_origine', lo.nom_service,
             'origine_code_bureau', lo.code_bureau,
             'origine_ville', lo.ville) AS details
      FROM materiels m
      JOIN localisations lo ON lo.id_localisation = m.id_localisation_origine

    UNION ALL
    SELECT a.code_materiel, 'MOUVEMENT', 2, a.date_mouvement, b.num_bon::text,
           jsonb_build_object(
             'type_mouvement', a.type_mouvement,
             'agent_beneficiaire', a.agent_beneficiaire,
             'motif_mouvement', a.motif_mouvement,
             'localisation', l.nom_service,
             'code_bureau', l.code_bureau,
             'ville', l.ville,
             'origine_localisation', lo.nom_service,
             'origine_code_bureau', lo.code_bureau,
             'origine_ville', lo.ville,
             'id_affectation', a.id_affectation)
      FROM affectations a
      JOIN localisations l ON l.id_localisation = a.id_localisation
      LEFT JOIN localisations lo ON lo.id_localisation = a.id_localisation_origine
      LEFT JOIN bons_decharge b ON b.id_affectation = a.id_affectation

    UNION ALL
    SELECT i.code_materiel, 'INCIDENT', 3, i.date_declaration, i.num_incident::text,
           jsonb_build_object(
             'degre_urgence', i.degre_urgence,
             'statut_incident', i.statut_incident,
             'symptomes', i.symptomes,
             'declarant', u.prenom || ' ' || u.nom,
             'matricule_declarant', i.matricule_declarant)
      FROM pannes_incidents i
      JOIN utilisateurs u ON u.matricule = i.matricule_declarant

    UNION ALL
    SELECT i.code_materiel, 'INTERVENTION_DEBUT', 4, f.date_debut, f.num_intervention::text,
           jsonb_build_object(
             'type_maintenance', f.type_maintenance,
             'num_incident', f.num_incident,
             'intervenants', (
                SELECT string_agg(u.prenom || ' ' || u.nom, ', '
                                  ORDER BY x.date_affectation, x.matricule_cadre)
                  FROM intervenants_fiches x
                  JOIN utilisateurs u ON u.matricule = x.matricule_cadre
                 WHERE x.num_intervention = f.num_intervention))
      FROM fiches_interventions f
      JOIN pannes_incidents i ON i.num_incident = f.num_incident

    UNION ALL
    SELECT i.code_materiel, 'COMPTE_RENDU_INTERVENTION', 5, cr.date_saisie, cr.num_intervention::text,
           jsonb_build_object(
             'num_incident', f.num_incident,
             'auteur', CASE
                         WHEN u.matricule IS NULL THEN NULL
                         ELSE u.prenom || ' ' || u.nom
                       END,
             'diagnostic', cr.diagnostic,
             'travaux_realises', cr.travaux_realises,
             'est_final', CASE WHEN cr.est_final THEN 'oui' ELSE 'non' END)
      FROM comptes_rendus_intervention cr
      JOIN fiches_interventions f ON f.num_intervention = cr.num_intervention
      JOIN pannes_incidents i     ON i.num_incident = f.num_incident
      LEFT JOIN utilisateurs u    ON u.matricule = cr.matricule_cadre

    UNION ALL
    SELECT i.code_materiel, 'PIECE_UTILISEE', 6, ip.date_imputation, ip.ref_piece::text,
           jsonb_build_object(
             'designation', p.designation,
             'quantite_utilisee', ip.quantite_utilisee,
             'num_intervention', ip.num_intervention)
      FROM imputations_pieces ip
      JOIN fiches_interventions f ON f.num_intervention = ip.num_intervention
      JOIN pannes_incidents i     ON i.num_incident = f.num_incident
      JOIN pieces_detachees p     ON p.ref_piece = ip.ref_piece

    UNION ALL
    SELECT i.code_materiel, 'INTERVENTION_FIN', 7, f.date_fin, f.num_intervention::text,
           jsonb_build_object(
             'statut_final_materiel', f.statut_final_materiel,
             'diagnostic', cr.diagnostic,
             'travaux_realises', cr.travaux_realises,
             'duree_heures', ROUND(EXTRACT(EPOCH FROM (f.date_fin - f.date_debut)) / 3600, 1))
      FROM fiches_interventions f
      JOIN pannes_incidents i ON i.num_incident = f.num_incident
      LEFT JOIN LATERAL (
        SELECT diagnostic, travaux_realises
          FROM comptes_rendus_intervention
         WHERE num_intervention = f.num_intervention
           AND est_final
         ORDER BY date_saisie DESC, id_compte_rendu DESC
         LIMIT 1
      ) cr ON TRUE
     WHERE f.date_fin IS NOT NULL
  )`;

export class HistoriqueRepository {
  async findEvenements(f: FiltresHistorique): Promise<{ items: Evenement[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const param = (v: unknown): string => {
      values.push(v);
      return `$${values.length}`;
    };

    if (f.code_materiel) conditions.push(`e.code_materiel = ${param(f.code_materiel)}`);
    if (f.types && f.types.length > 0) {
      conditions.push(`e.type_evenement = ANY(${param(f.types)}::text[])`);
    }
    if (f.du) conditions.push(`e.date_evenement >= ${param(f.du)}::date`);
    if (f.au) conditions.push(`e.date_evenement < (${param(f.au)}::date + 1)`);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query<{ total: number }>(
      `${EVENEMENTS_CTE} SELECT COUNT(*)::int AS total FROM evenements e ${where}`,
      values,
    );
    const total = countRes.rows[0]?.total ?? 0;

    const sens = f.ordre === 'asc' ? 'ASC' : 'DESC'; // valeur issue d'un enum validé, jamais d'une saisie brute
    const limitParam = param(f.limit);
    const offsetParam = param((f.page - 1) * f.limit);
    const res = await pool.query<Evenement>(
      `${EVENEMENTS_CTE}
       SELECT e.code_materiel, mt.marque, mt.modele, e.type_evenement,
              to_char(e.date_evenement, 'YYYY-MM-DD HH24:MI:SS') AS date_evenement,
              e.reference, e.details
         FROM evenements e
         JOIN materiels mt ON mt.code_materiel = e.code_materiel
         ${where}
        ORDER BY e.date_evenement ${sens}, e.ordre ${sens}
        LIMIT ${limitParam} OFFSET ${offsetParam}`,
      values,
    );
    return { items: res.rows, total };
  }

  async synthese(code: string): Promise<SyntheseMateriel> {
    const res = await pool.query<SyntheseMateriel>(
      `SELECT
         (SELECT COUNT(*)::int FROM affectations WHERE code_materiel = $1) AS nb_mouvements,
         (SELECT COUNT(*)::int FROM pannes_incidents WHERE code_materiel = $1) AS nb_incidents,
         (SELECT COUNT(*)::int FROM pannes_incidents
           WHERE code_materiel = $1
             AND statut_incident IN ('DECLARE', 'PRISE_EN_CHARGE', 'EN_COURS')) AS nb_incidents_ouverts,
         (SELECT COUNT(*)::int
            FROM fiches_interventions f
            JOIN pannes_incidents i ON i.num_incident = f.num_incident
           WHERE i.code_materiel = $1) AS nb_interventions,
         (SELECT COALESCE(SUM(ip.quantite_utilisee), 0)::int
            FROM imputations_pieces ip
            JOIN fiches_interventions f ON f.num_intervention = ip.num_intervention
            JOIN pannes_incidents i     ON i.num_incident = f.num_incident
           WHERE i.code_materiel = $1) AS nb_pieces_utilisees,
         (SELECT ROUND(EXTRACT(EPOCH FROM AVG(f.date_fin - f.date_debut)) / 3600, 1)::float8
            FROM fiches_interventions f
            JOIN pannes_incidents i ON i.num_incident = f.num_incident
           WHERE i.code_materiel = $1 AND f.date_fin IS NOT NULL) AS duree_moyenne_reparation_heures,
         (SELECT ROUND(EXTRACT(EPOCH FROM SUM(f.date_fin - i.date_declaration)) / 3600, 1)::float8
            FROM fiches_interventions f
            JOIN pannes_incidents i ON i.num_incident = f.num_incident
           WHERE i.code_materiel = $1 AND f.date_fin IS NOT NULL) AS indisponibilite_totale_heures,
         (SELECT num_incident FROM pannes_incidents
           WHERE code_materiel = $1
             AND statut_incident IN ('DECLARE', 'PRISE_EN_CHARGE', 'EN_COURS')
           ORDER BY date_declaration DESC LIMIT 1) AS incident_ouvert,
         (SELECT to_char(MAX(date_mouvement), 'YYYY-MM-DD HH24:MI:SS')
            FROM affectations WHERE code_materiel = $1) AS dernier_mouvement`,
      [code],
    );
    const ligne = res.rows[0];
    if (!ligne) throw new Error('Synthèse du matériel sans retour.');
    return ligne;
  }
}