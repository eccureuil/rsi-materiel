-- =====================================================================
-- RSI ASECNA Madagascar - Schema PostgreSQL 15+ (13 tables)
-- ATTENTION : ce script supprime et recree toutes les tables.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. Suppression des tables existantes (ordre inverse des dependances)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS journal_audit        CASCADE;
DROP TABLE IF EXISTS imputations_pieces   CASCADE;
DROP TABLE IF EXISTS pieces_detachees     CASCADE;
DROP TABLE IF EXISTS intervenants_fiches  CASCADE;
DROP TABLE IF EXISTS fiches_interventions CASCADE;
DROP TABLE IF EXISTS pannes_incidents     CASCADE;
DROP TABLE IF EXISTS bons_decharge        CASCADE;
DROP TABLE IF EXISTS affectations         CASCADE;
DROP TABLE IF EXISTS materiels            CASCADE;
DROP TABLE IF EXISTS localisations        CASCADE;
DROP TABLE IF EXISTS cadres_maintenance   CASCADE;
DROP TABLE IF EXISTS administrateurs      CASCADE;
DROP TABLE IF EXISTS utilisateurs         CASCADE;

-- ---------------------------------------------------------------------
-- 1. utilisateurs (RG_COMPTE_01)
-- ---------------------------------------------------------------------
CREATE TABLE utilisateurs (
    matricule      VARCHAR(20)  PRIMARY KEY,
    nom            VARCHAR(50)  NOT NULL,
    prenom         VARCHAR(50)  NOT NULL,
    mot_de_passe   VARCHAR(255) NOT NULL,
    statut_compte  VARCHAR(10)  NOT NULL DEFAULT 'ACTIF'
        CHECK (statut_compte IN ('ACTIF', 'INACTIF')),
    role           VARCHAR(30)  NOT NULL
        CHECK (role IN ('ADMINISTRATEUR', 'CADRE_MAINTENANCE'))
);

-- ---------------------------------------------------------------------
-- 2. administrateurs
-- ---------------------------------------------------------------------
CREATE TABLE administrateurs (
    matricule         VARCHAR(20) PRIMARY KEY
        REFERENCES utilisateurs(matricule) ON DELETE CASCADE,
    niveau_privilege  VARCHAR(30) NOT NULL DEFAULT 'SUPER_ADMIN'
);

-- ---------------------------------------------------------------------
-- 3. cadres_maintenance
-- ---------------------------------------------------------------------
CREATE TABLE cadres_maintenance (
    matricule   VARCHAR(20)  PRIMARY KEY
        REFERENCES utilisateurs(matricule) ON DELETE CASCADE,
    specialite  VARCHAR(100) NOT NULL
);

-- ---------------------------------------------------------------------
-- 4. localisations (RG_LOCALISATION_01 : code_bureau nullable)
-- ---------------------------------------------------------------------
CREATE TABLE localisations (
    id_localisation  SERIAL       PRIMARY KEY,
    nom_service      VARCHAR(100) NOT NULL,
    code_bureau      VARCHAR(20)  NULL,
    ville            VARCHAR(50)  NOT NULL DEFAULT 'Antananarivo'
);

-- ---------------------------------------------------------------------
-- 5. materiels (RG_MATERIEL_01 / RG_MATERIEL_02 : Single Table Inheritance)
-- ---------------------------------------------------------------------
CREATE TABLE materiels (
    code_materiel     VARCHAR(30) PRIMARY KEY,
    num_serie         VARCHAR(50) UNIQUE NULL,
    marque            VARCHAR(50) NULL DEFAULT 'INCONNU',
    modele            VARCHAR(50) NULL DEFAULT 'INCONNU',
    date_acquisition  DATE        NOT NULL,
    statut_materiel   VARCHAR(30) NOT NULL DEFAULT 'STOCK'
        CHECK (statut_materiel IN ('STOCK', 'SERVICE', 'PANNE', 'MAINTENANCE', 'REFORME')),
    caracteristiques  TEXT        NULL,
    type_categorie    VARCHAR(30) NOT NULL
        CHECK (type_categorie IN ('BUREAUTIQUE', 'OPERATIONNEL')),
    type_equipement   VARCHAR(50) NULL,
    systeme_aviation  VARCHAR(50) NULL,
    id_localisation   INT         NOT NULL
        REFERENCES localisations(id_localisation)
);

-- ---------------------------------------------------------------------
-- 6. affectations
-- ---------------------------------------------------------------------
CREATE TABLE affectations (
    id_affectation      SERIAL       PRIMARY KEY,
    code_materiel       VARCHAR(30)  NOT NULL REFERENCES materiels(code_materiel),
    id_localisation     INT          NOT NULL REFERENCES localisations(id_localisation),
    date_mouvement      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type_mouvement      VARCHAR(30)  NOT NULL
        CHECK (type_mouvement IN ('AFFECTATION', 'MUTATION', 'RESTITUTION')),
    agent_beneficiaire  VARCHAR(100) NOT NULL,
    motif_mouvement     TEXT         NULL
);

-- ---------------------------------------------------------------------
-- 7. bons_decharge
-- ---------------------------------------------------------------------
CREATE TABLE bons_decharge (
    num_bon             VARCHAR(30)  PRIMARY KEY,
    id_affectation      INT          NOT NULL UNIQUE REFERENCES affectations(id_affectation),
    date_emission       DATE         NOT NULL DEFAULT CURRENT_DATE,
    chemin_fichier_pdf  VARCHAR(255) NULL
);

-- ---------------------------------------------------------------------
-- 8. pannes_incidents
-- ---------------------------------------------------------------------
CREATE TABLE pannes_incidents (
    num_incident         VARCHAR(30) PRIMARY KEY,
    code_materiel        VARCHAR(30) NOT NULL REFERENCES materiels(code_materiel),
    matricule_declarant  VARCHAR(20) NOT NULL REFERENCES utilisateurs(matricule),
    date_declaration     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    symptomes            TEXT        NOT NULL,
    degre_urgence        VARCHAR(20) NOT NULL DEFAULT 'MOYEN'
        CHECK (degre_urgence IN ('FAIBLE', 'MOYEN', 'URGENT', 'CRITIQUE')),
    statut_incident      VARCHAR(30) NOT NULL DEFAULT 'DECLARE'
        CHECK (statut_incident IN ('DECLARE', 'PRISE_EN_CHARGE', 'EN_COURS', 'RESOLU', 'CLOTURE', 'REJETE'))
);

-- ---------------------------------------------------------------------
-- 9. fiches_interventions
-- ---------------------------------------------------------------------
CREATE TABLE fiches_interventions (
    num_intervention       VARCHAR(30) PRIMARY KEY,
    num_incident           VARCHAR(30) NOT NULL UNIQUE REFERENCES pannes_incidents(num_incident),
    type_maintenance       VARCHAR(30) NOT NULL
        CHECK (type_maintenance IN ('CORRECTIVE', 'PREVENTIVE')),
    date_debut             TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_fin               TIMESTAMP   NULL,
    diagnostic             TEXT        NULL,
    travaux_realises       TEXT        NULL,
    statut_final_materiel  VARCHAR(30) NULL
        CHECK (statut_final_materiel IN ('SERVICE', 'PANNE', 'REFORME'))
);

-- ---------------------------------------------------------------------
-- 10. intervenants_fiches (RG_INTERVENTION_01 : plusieurs cadres par fiche)
-- ---------------------------------------------------------------------
CREATE TABLE intervenants_fiches (
    num_intervention  VARCHAR(30) NOT NULL
        REFERENCES fiches_interventions(num_intervention) ON DELETE CASCADE,
    matricule_cadre   VARCHAR(20) NOT NULL
        REFERENCES cadres_maintenance(matricule),
    date_affectation  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (num_intervention, matricule_cadre)
);

-- ---------------------------------------------------------------------
-- 11. pieces_detachees (RG_STOCK_01 : stock jamais negatif)
-- ---------------------------------------------------------------------
CREATE TABLE pieces_detachees (
    ref_piece          VARCHAR(30)  PRIMARY KEY,
    designation        VARCHAR(100) NOT NULL,
    quantite_en_stock  INT          NOT NULL DEFAULT 0
        CHECK (quantite_en_stock >= 0),
    seuil_minimum      INT          NOT NULL DEFAULT 1
        CHECK (seuil_minimum >= 0)
);

-- ---------------------------------------------------------------------
-- 12. imputations_pieces
-- ---------------------------------------------------------------------
CREATE TABLE imputations_pieces (
    id_imputation      SERIAL      PRIMARY KEY,
    num_intervention   VARCHAR(30) NOT NULL REFERENCES fiches_interventions(num_intervention),
    ref_piece          VARCHAR(30) NOT NULL REFERENCES pieces_detachees(ref_piece),
    quantite_utilisee  INT         NOT NULL CHECK (quantite_utilisee > 0),
    date_imputation    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 13. journal_audit
-- ---------------------------------------------------------------------
CREATE TABLE journal_audit (
    id_log               BIGSERIAL   PRIMARY KEY,
    matricule_operateur  VARCHAR(20) NOT NULL REFERENCES utilisateurs(matricule),
    date_heure           TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action_effectuee     VARCHAR(50) NOT NULL,
    details_operation    TEXT        NULL
);

-- ---------------------------------------------------------------------
-- Index (cles etrangeres et colonnes de recherche frequentes)
-- ---------------------------------------------------------------------
CREATE INDEX idx_materiels_localisation    ON materiels(id_localisation);
CREATE INDEX idx_materiels_statut          ON materiels(statut_materiel);
CREATE INDEX idx_materiels_categorie       ON materiels(type_categorie);
CREATE INDEX idx_affectations_materiel     ON affectations(code_materiel);
CREATE INDEX idx_affectations_localisation ON affectations(id_localisation);
CREATE INDEX idx_pannes_materiel           ON pannes_incidents(code_materiel);
CREATE INDEX idx_pannes_declarant          ON pannes_incidents(matricule_declarant);
CREATE INDEX idx_pannes_statut             ON pannes_incidents(statut_incident);
CREATE INDEX idx_intervenants_cadre        ON intervenants_fiches(matricule_cadre);
CREATE INDEX idx_imputations_intervention  ON imputations_pieces(num_intervention);
CREATE INDEX idx_imputations_piece         ON imputations_pieces(ref_piece);
CREATE INDEX idx_audit_operateur           ON journal_audit(matricule_operateur);
CREATE INDEX idx_audit_date                ON journal_audit(date_heure);

COMMIT;