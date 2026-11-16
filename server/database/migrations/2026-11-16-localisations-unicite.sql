-- Empêche les doublons de localisation.
-- Signature : nom_service + code_bureau + ville, insensible à la casse et aux espaces.
-- Un code_bureau NULL est traité comme une chaîne vide.
CREATE UNIQUE INDEX IF NOT EXISTS uq_localisations_signature
  ON localisations (
    LOWER(TRIM(nom_service)),
    LOWER(TRIM(COALESCE(code_bureau, ''))),
    LOWER(TRIM(ville))
  );
