-- Plusieurs fiches d'intervention possibles pour un meme incident.
-- Une seule fiche peut rester ouverte (date_fin IS NULL) a la fois.

-- Supprime l'ancienne contrainte UNIQUE sur num_incident, quel que soit son nom.
DO $$
DECLARE
  contrainte record;
BEGIN
  FOR contrainte IN
    SELECT conname
      FROM pg_constraint
     WHERE conrelid = 'fiches_interventions'::regclass
       AND contype = 'u'
       AND conkey = ARRAY[
         (SELECT attnum
            FROM pg_attribute
           WHERE attrelid = 'fiches_interventions'::regclass
             AND attname = 'num_incident')
       ]
  LOOP
    EXECUTE format('ALTER TABLE fiches_interventions DROP CONSTRAINT %I', contrainte.conname);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fiches_incident_ouverte
  ON fiches_interventions(num_incident)
  WHERE date_fin IS NULL;

CREATE INDEX IF NOT EXISTS idx_fiches_incident_date
  ON fiches_interventions(num_incident, date_debut);
