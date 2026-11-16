-- Historique append-only des diagnostics et travaux realises par fiche.
-- Les anciennes valeurs de fiches_interventions sont reprises puis les colonnes sont supprimees.

CREATE TABLE IF NOT EXISTS comptes_rendus_intervention (
  id_compte_rendu   SERIAL       PRIMARY KEY,
  num_intervention  VARCHAR(30)  NOT NULL
    REFERENCES fiches_interventions(num_intervention) ON DELETE CASCADE,
  matricule_cadre   VARCHAR(20)  NULL
    REFERENCES cadres_maintenance(matricule),
  diagnostic        TEXT         NULL,
  travaux_realises  TEXT         NULL,
  est_final         BOOLEAN      NOT NULL DEFAULT FALSE,
  date_saisie       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (diagnostic IS NOT NULL OR travaux_realises IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_comptes_rendus_intervention
  ON comptes_rendus_intervention(num_intervention, date_saisie, id_compte_rendu);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'fiches_interventions'
       AND column_name = 'diagnostic'
  ) THEN
    INSERT INTO comptes_rendus_intervention
      (num_intervention, matricule_cadre, diagnostic, travaux_realises, est_final, date_saisie)
    SELECT f.num_intervention,
           (SELECT ifc.matricule_cadre
              FROM intervenants_fiches ifc
             WHERE ifc.num_intervention = f.num_intervention
             ORDER BY ifc.date_affectation, ifc.matricule_cadre
             LIMIT 1),
           NULLIF(BTRIM(f.diagnostic), ''),
           NULLIF(BTRIM(f.travaux_realises), ''),
           (f.date_fin IS NOT NULL),
           COALESCE(f.date_fin, f.date_debut)
      FROM fiches_interventions f
     WHERE NULLIF(BTRIM(f.diagnostic), '') IS NOT NULL
        OR NULLIF(BTRIM(f.travaux_realises), '') IS NOT NULL;

    ALTER TABLE fiches_interventions
      DROP COLUMN diagnostic,
      DROP COLUMN travaux_realises;
  END IF;
END $$;
