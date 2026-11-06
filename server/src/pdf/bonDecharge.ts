import type { BonDecharge, LocalisationRef, TypeMouvement } from '../models/affectation.js';
import {
  champ,
  creerDocument,
  enTete,
  finaliser,
  formatDate,
  paragraphe,
  sectionTitre,
  signatures,
  titreDocument,
} from './pdfCommun.js';

const TITRES: Record<TypeMouvement, string> = {
  AFFECTATION: "BON D'AFFECTATION",
  MUTATION: 'BON DE MUTATION',
  RESTITUTION: 'BON DE RESTITUTION',
};

function libelleLocalisation(l: LocalisationRef | null): string {
  if (!l) return 'Non renseignée';
  const bureau = l.code_bureau ? ` (bureau ${l.code_bureau})` : '';
  return `${l.nom_service}${bureau}, ${l.ville}`;
}

function texteDecharge(bon: BonDecharge): string {
  const agent = bon.agent_beneficiaire;
  switch (bon.type_mouvement) {
    case 'AFFECTATION':
      return `Je soussigné(e) ${agent}, reconnais avoir reçu le matériel désigné ci-dessus, en bon état apparent de fonctionnement. Je m'engage à en faire un usage conforme aux règles de l'ASECNA, à signaler sans délai toute panne ou anomalie au service RSI, et à le restituer sur simple demande.`;
    case 'MUTATION':
      return `Je soussigné(e) ${agent}, reconnais avoir pris en charge le matériel désigné ci-dessus à la suite de son transfert vers la localisation indiquée. Je m'engage à en faire un usage conforme aux règles de l'ASECNA et à signaler sans délai toute panne ou anomalie au service RSI.`;
    case 'RESTITUTION':
      return `Je soussigné(e) ${agent}, déclare restituer au service RSI le matériel désigné ci-dessus. Le service RSI en prend réception et me décharge de sa responsabilité à compter de la date de ce bon.`;
  }
}

export async function genererBonDecharge(bon: BonDecharge): Promise<Buffer> {
  const doc = creerDocument();

  enTete(doc);
  titreDocument(
    doc,
    TITRES[bon.type_mouvement],
    `Bon de décharge n° ${bon.num_bon} - émis le ${formatDate(bon.date_emission)}`,
  );

  sectionTitre(doc, 'Matériel concerné');
  champ(doc, 'Code matériel', bon.code_materiel);
  champ(
    doc,
    'Désignation',
    [bon.marque, bon.modele].filter((v): v is string => v !== null && v !== '').join(' ') || '—',
  );
  champ(doc, 'Numéro de série', bon.num_serie ?? '—');
  champ(doc, 'Catégorie', bon.type_categorie === 'OPERATIONNEL' ? 'Opérationnel' : 'Bureautique');
  if (bon.type_equipement) champ(doc, "Type d'équipement", bon.type_equipement);
  if (bon.systeme_aviation) champ(doc, 'Système aviation', bon.systeme_aviation);
  if (bon.caracteristiques) champ(doc, 'Caractéristiques', bon.caracteristiques);

  sectionTitre(doc, 'Mouvement');
  champ(doc, 'Date du mouvement', formatDate(bon.date_mouvement));
  champ(doc, 'Agent concerné', bon.agent_beneficiaire);
  if (bon.type_mouvement !== 'AFFECTATION') {
    champ(doc, 'Provenance', libelleLocalisation(bon.origine));
  }
  champ(
    doc,
    bon.type_mouvement === 'RESTITUTION' ? 'Lieu de dépôt' : 'Destination',
    libelleLocalisation(bon.destination),
  );
  if (bon.motif_mouvement) champ(doc, 'Motif', bon.motif_mouvement);

  sectionTitre(doc, 'Décharge');
  paragraphe(doc, texteDecharge(bon));

  signatures(
    doc,
    {
      titre: bon.type_mouvement === 'RESTITUTION' ? "L'agent restituant" : "L'agent bénéficiaire",
      nom: bon.agent_beneficiaire,
    },
    { titre: 'Le Chef du service RSI' },
  );

  return finaliser(doc);
}