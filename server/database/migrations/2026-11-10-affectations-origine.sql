-- Ajout de la localisation d'origine (provenance) des mouvements.
-- Nullable : les affectations anterieures n'ont pas d'origine connue.
ALTER TABLE affectations
  ADD COLUMN IF NOT EXISTS id_localisation_origine INT
  REFERENCES localisations(id_localisation);

CREATE INDEX IF NOT EXISTS idx_affectations_origine
  ON affectations(id_localisation_origine);