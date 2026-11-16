import type { Fiche, Incident, StatutFinal, TypeMaintenance } from '../models/incident.js';
import type { Materiel } from '../models/materiel.js';
import type { Imputation } from '../models/stock.js';
import {
  champ,
  creerDocument,
  enTete,
  finaliser,
  formatDate,
  paragraphe,
  sectionTitre,
  signatures,
  tableau,
  titreDocument,
} from './pdfCommun.js';

export type FicheInterventionPdfData = {
  fiche: Fiche;
  incident: Incident;
  materiel: Materiel | null;
  pieces: Imputation[];
};

const TYPE_MAINTENANCE: Record<TypeMaintenance, string> = {
  CORRECTIVE: 'Maintenance corrective',
  PREVENTIVE: 'Maintenance préventive',
};

const STATUT_FINAL: Record<StatutFinal, string> = {
  SERVICE: 'Remis en service',
  PANNE: 'Toujours en panne',
  REFORME: 'Réformé',
};

export async function genererFicheIntervention(data: FicheInterventionPdfData): Promise<Buffer> {
  const { fiche, incident, materiel, pieces } = data;
  const doc = creerDocument();

  enTete(doc);
  titreDocument(
    doc,
    "FICHE D'INTERVENTION",
    `N° ${fiche.num_intervention} - incident ${fiche.num_incident}`,
  );

  sectionTitre(doc, 'Incident');
  champ(doc, 'Déclaré le', formatDate(incident.date_declaration));
  champ(doc, 'Déclaré par', `${incident.declarant_prenom} ${incident.declarant_nom} (${incident.matricule_declarant})`);
  champ(doc, "Degré d'urgence", incident.degre_urgence);
  champ(doc, 'Symptômes', incident.symptomes);

  sectionTitre(doc, 'Matériel');
  champ(doc, 'Code matériel', fiche.code_materiel);
  champ(
    doc,
    'Désignation',
    [incident.marque, incident.modele].filter((v): v is string => v !== null && v !== '').join(' ') || '—',
  );
  if (materiel) champ(doc, 'Numéro de série', materiel.num_serie ?? '—');
  champ(doc, 'Localisation', incident.nom_service);

  sectionTitre(doc, 'Intervention');
  champ(doc, 'Type', TYPE_MAINTENANCE[fiche.type_maintenance]);
  champ(doc, 'Début', formatDate(fiche.date_debut));
  champ(doc, 'Fin', fiche.date_fin ? formatDate(fiche.date_fin) : 'En cours');
  champ(doc, 'État final du matériel', fiche.statut_final_materiel ? STATUT_FINAL[fiche.statut_final_materiel] : '—');

  sectionTitre(doc, 'Intervenants');
  tableau(
    doc,
    [
      { titre: 'Matricule', largeur: 90 },
      { titre: 'Nom et prénom', largeur: 180 },
      { titre: 'Spécialité', largeur: 130 },
      { titre: 'Date de prise en charge', largeur: 95 },
    ],
    fiche.intervenants.map((i) => [
      i.matricule_cadre,
      `${i.prenom} ${i.nom}`,
      i.specialite,
      formatDate(i.date_affectation),
    ]),
  );

  sectionTitre(doc, 'Comptes rendus');
  if (fiche.comptes_rendus.length === 0) {
    paragraphe(doc, 'Aucun compte rendu.');
  } else {
    fiche.comptes_rendus.forEach((compte, index) => {
      if (index > 0) doc.moveDown(0.5);
      champ(doc, 'Date', formatDate(compte.date_saisie));
      champ(doc, 'Auteur', compte.auteur ?? 'Non renseigné');
      if (compte.est_final) champ(doc, 'Type', 'Compte rendu final');
      if (compte.diagnostic) champ(doc, 'Diagnostic', compte.diagnostic);
      if (compte.travaux_realises) champ(doc, 'Travaux réalisés', compte.travaux_realises);
    });
  }

  sectionTitre(doc, 'Pièces utilisées');
  if (pieces.length === 0) {
    paragraphe(doc, 'Aucune pièce utilisée.');
  } else {
    tableau(
      doc,
      [
        { titre: 'Référence', largeur: 110 },
        { titre: 'Désignation', largeur: 255 },
        { titre: 'Quantité', largeur: 130 },
      ],
      pieces.map((p) => [p.ref_piece, p.designation, String(p.quantite_utilisee)]),
    );
  }

  signatures(
    doc,
    {
      titre: fiche.intervenants.length > 1 ? 'Les intervenants' : "L'intervenant",
      nom: fiche.intervenants.map((i) => `${i.prenom} ${i.nom}`).join(', '),
    },
    { titre: 'Le Chef du service RSI' },
  );

  return finaliser(doc);
}