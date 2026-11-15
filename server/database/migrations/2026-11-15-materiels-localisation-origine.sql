-- Localisation d'origine permanente du materiel (figee a la creation).
ALTER TABLE materiels
  ADD COLUMN IF NOT EXISTS id_localisation_origine INT
  REFERENCES localisations(id_localisation);

-- Si l'historique des affectations est disponible, reprendre la provenance
-- du premier mouvement connu ; sinon la localisation actuelle est utilisee.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'affectations'
       AND column_name = 'id_localisation_origine'
  ) THEN
    UPDATE materiels m
       SET id_localisation_origine = (
         SELECT a.id_localisation_origine
           FROM affectations a
          WHERE a.code_materiel = m.code_materiel
            AND a.id_localisation_origine IS NOT NULL
          ORDER BY a.date_mouvement ASC, a.id_affectation ASC
          LIMIT 1
       )
     WHERE m.id_localisation_origine IS NULL
       AND EXISTS (
         SELECT 1
           FROM affectations a
          WHERE a.code_materiel = m.code_materiel
            AND a.id_localisation_origine IS NOT NULL
       );
  END IF;
END $$;

UPDATE materiels
   SET id_localisation_origine = id_localisation
 WHERE id_localisation_origine IS NULL;

ALTER TABLE materiels
  ALTER COLUMN id_localisation_origine SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_materiels_origine
  ON materiels(id_localisation_origine);
