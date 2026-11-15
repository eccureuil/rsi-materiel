type Corps = Record<string, unknown>;

export type ReferencesAudit = {
  localisations?: ReadonlyMap<number, string>;
};

const CLES_SENSIBLES = /mot_de_passe|password|token|secret/i;

const LIBELLES_CHAMPS: Record<string, string> = {
  code_materiel: 'Code matériel',
  num_serie: 'Numéro de série',
  marque: 'Marque',
  modele: 'Modèle',
  date_acquisition: "Date d'acquisition",
  statut_materiel: 'Statut du matériel',
  caracteristiques: 'Caractéristiques',
  type_categorie: 'Catégorie',
  type_equipement: "Type d'équipement",
  systeme_aviation: 'Système aviation',
  id_localisation: 'Localisation',
  id_localisation_origine: "Localisation d'origine",
  nom_service: 'Service',
  code_bureau: 'Bureau',
  ville: 'Ville',
  type_mouvement: 'Type de mouvement',
  agent_beneficiaire: 'Agent bénéficiaire',
  motif_mouvement: 'Motif du mouvement',
  generer_bon: 'Générer un bon',
  symptomes: 'Symptômes',
  degre_urgence: "Degré d'urgence",
  type_maintenance: 'Type de maintenance',
  motif: 'Motif',
  diagnostic: 'Diagnostic',
  travaux_realises: 'Travaux réalisés',
  statut_final_materiel: 'Statut final du matériel',
  ref_piece: 'Référence pièce',
  designation: 'Désignation',
  quantite_en_stock: 'Quantité en stock',
  seuil_minimum: 'Seuil minimum',
  quantite: 'Quantité',
  quantite_utilisee: 'Quantité utilisée',
  matricule: 'Matricule',
  nom: 'Nom',
  prenom: 'Prénom',
  role: 'Rôle',
  specialite: 'Spécialité',
  niveau_privilege: 'Niveau de privilège',
  statut_compte: 'Statut du compte',
  q: 'Recherche',
  statut_incident: 'Statut',
  page: 'Page',
  limit: 'Limite',
  telecharger: 'Télécharger',
};

const LIBELLES_REQUETE: Record<string, string> = {
  ...LIBELLES_CHAMPS,
  sous_seuil: 'Sous le seuil',
  terminee: 'Terminée',
  mes_interventions: 'Mes interventions',
  du: 'Du',
  au: 'Au',
  ordre: 'Ordre',
  types: 'Types',
};

function estObjet(valeur: unknown): valeur is Corps {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

function humaniser(cle: string): string {
  const texte = cle.replace(/_/g, ' ');
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

function texteValeur(valeur: unknown): string {
  if (valeur === null || valeur === undefined || valeur === '') return 'non renseigné';
  if (typeof valeur === 'boolean') return valeur ? 'oui' : 'non';
  if (typeof valeur === 'number') return String(valeur);
  if (typeof valeur === 'string') {
    const texte = valeur.trim();
    return texte.length > 400 ? `${texte.slice(0, 400)}…` : texte;
  }
  if (Array.isArray(valeur)) return valeur.map(texteValeur).join(', ');
  return JSON.stringify(valeur);
}

function texteChamp(cle: string, valeur: unknown, references?: ReferencesAudit): string {
  if (cle === 'id_localisation_origine' && references?.localisations) {
    const id = typeof valeur === 'number' ? valeur : Number(valeur);
    const libelle = references.localisations.get(id);
    if (libelle) return libelle;
  }
  return texteValeur(valeur);
}

function detailsCorps(body: unknown, references?: ReferencesAudit): string[] {
  if (!estObjet(body)) return [];
  return Object.entries(body)
    .filter(([cle]) => !CLES_SENSIBLES.test(cle))
    .map(
      ([cle, valeur]) =>
        `${LIBELLES_CHAMPS[cle] ?? humaniser(cle)} : ${texteChamp(cle, valeur, references)}`,
    );
}

function detailsRequete(params: URLSearchParams): string[] {
  return [...params.entries()].map(
    ([cle, valeur]) => `${LIBELLES_REQUETE[cle] ?? humaniser(cle)} : ${texteValeur(valeur)}`,
  );
}

function decoder(segment: string | undefined): string {
  if (!segment) return '';
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function descriptionRessource(
  ressource: string,
  reste: string[],
  methode: string,
  body: unknown,
): string | null {
  const premier = decoder(reste[0]);
  const second = decoder(reste[1]);
  const troisieme = decoder(reste[2]);

  switch (ressource) {
    case 'materiels':
      if (methode === 'GET' && second === 'historique') {
        return `Consultation de l'historique du matériel « ${premier} »`;
      }
      if (methode === 'GET' && premier) return `Consultation du matériel « ${premier} »`;
      if (methode === 'GET') return "Consultation de la liste des matériels";
      if (methode === 'POST') return 'Création d’un matériel';
      if (methode === 'PUT') return `Modification du matériel « ${premier} »`;
      if (methode === 'DELETE') return `Suppression du matériel « ${premier} »`;
      return null;

    case 'localisations':
      if (methode === 'GET' && premier) return `Consultation de la localisation #${premier}`;
      if (methode === 'GET') return 'Consultation de la liste des localisations';
      if (methode === 'POST') return 'Création d’une localisation';
      if (methode === 'PUT') return `Modification de la localisation #${premier}`;
      if (methode === 'DELETE') return `Suppression de la localisation #${premier}`;
      return null;

    case 'affectations':
      if (methode === 'POST' && second === 'bon') {
        return `Génération du bon de décharge du mouvement #${premier}`;
      }
      if (methode === 'POST') return 'Enregistrement d’un mouvement de matériel';
      if (methode === 'GET' && premier) return `Consultation du mouvement #${premier}`;
      if (methode === 'GET') return 'Consultation de la liste des mouvements';
      return null;

    case 'bons':
      if (methode === 'GET' && second === 'pdf') {
        return `Téléchargement du bon de décharge « ${premier} » au format PDF`;
      }
      if (methode === 'GET') return `Consultation du bon de décharge « ${premier} »`;
      return null;

    case 'incidents':
      if (methode === 'POST' && second === 'intervenir') {
        return `Prise en charge de l’incident « ${premier} »`;
      }
      if (methode === 'POST' && second === 'rejeter') {
        return `Rejet de l’incident « ${premier} »`;
      }
      if (methode === 'POST' && second === 'cloturer') {
        return `Clôture de l’incident « ${premier} »`;
      }
      if (methode === 'POST') return 'Déclaration d’une panne';
      if (methode === 'GET' && premier) return `Consultation de l’incident « ${premier} »`;
      if (methode === 'GET') return 'Consultation de la liste des incidents';
      return null;

    case 'interventions':
      if (methode === 'POST' && second === 'terminer') {
        return `Clôture de l’intervention « ${premier} »`;
      }
      if (methode === 'POST' && second === 'pieces') {
        return `Imputation d’une pièce à l’intervention « ${premier} »`;
      }
      if (methode === 'DELETE' && second === 'pieces') {
        return `Annulation de l’imputation #${troisieme} de l’intervention « ${premier} »`;
      }
      if (methode === 'GET' && second === 'pieces') {
        return `Consultation des pièces de l’intervention « ${premier} »`;
      }
      if (methode === 'PUT') return `Mise à jour de l’intervention « ${premier} »`;
      if (methode === 'GET' && premier) return `Consultation de l’intervention « ${premier} »`;
      if (methode === 'GET') return 'Consultation de la liste des interventions';
      return null;

    case 'pieces':
      if (methode === 'POST' && second === 'approvisionner') {
        return `Approvisionnement de la pièce « ${premier} »`;
      }
      if (methode === 'POST' && second === 'ajuster') {
        return `Ajustement du stock de la pièce « ${premier} »`;
      }
      if (methode === 'POST') return 'Création d’une pièce détachée';
      if (methode === 'PUT') return `Modification de la pièce « ${premier} »`;
      if (methode === 'DELETE') return `Suppression de la pièce « ${premier} »`;
      if (methode === 'GET' && premier) return `Consultation de la pièce « ${premier} »`;
      if (methode === 'GET') return 'Consultation de la liste des pièces détachées';
      return null;

    case 'utilisateurs':
      if (methode === 'PATCH' && second === 'statut') {
        return `Changement du statut du compte « ${premier} »`;
      }
      if (methode === 'POST' && second === 'reinitialiser-mot-de-passe') {
        return `Réinitialisation du mot de passe de « ${premier} »`;
      }
      if (methode === 'POST') return 'Création d’un utilisateur';
      if (methode === 'PUT') return `Modification de l’utilisateur « ${premier} »`;
      if (methode === 'GET' && premier) return `Consultation de l’utilisateur « ${premier} »`;
      if (methode === 'GET') return 'Consultation de la liste des utilisateurs';
      return null;

    case 'profil':
      if (methode === 'PUT' && premier === 'mot-de-passe') {
        return 'Changement du mot de passe';
      }
      return null;

    case 'dashboard':
      if (methode === 'GET') return 'Consultation des statistiques du tableau de bord';
      return null;

    case 'historique':
      if (methode === 'GET') return 'Consultation du fil d’activité du parc';
      return null;

    case 'exports':
      if (premier === 'materiels' && second === 'csv') return 'Export CSV de l’inventaire du matériel';
      if (premier === 'materiels' && second === 'pdf') return 'Export PDF de l’inventaire du matériel';
      if (premier === 'incidents' && second === 'csv') return 'Export CSV des incidents';
      if (premier === 'pieces' && second === 'csv') return 'Export CSV du stock de pièces';
      if (premier === 'interventions' && troisieme === 'pdf') {
        return `Export PDF de la fiche d’intervention « ${second} »`;
      }
      return null;

    default:
      return null;
  }
}

export function decrireOperation(
  methode: string,
  url: string,
  statutHttp: number,
  body?: unknown,
  references?: ReferencesAudit,
): string {
  const urlAnalysee = new URL(url, 'http://localhost');
  const segments = urlAnalysee.pathname.split('/').filter(Boolean);
  const ressource = segments[1] ?? '';
  const reste = segments.slice(2);

  const titre = descriptionRessource(ressource, reste, methode, body)
    ?? `${methode} ${urlAnalysee.pathname}`;

  const details = [...detailsCorps(body, references), ...detailsRequete(urlAnalysee.searchParams)];
  const lignes = [titre, ...details];

  if (statutHttp >= 400) {
    lignes.push(`Statut HTTP : ${statutHttp}`);
  }

  return lignes.join('\n');
}

export async function formaterDetailsStockes(
  details: string | null,
  resoudreLocalisation?: (id: number) => Promise<string | null>,
): Promise<string | null> {
  if (!details) return details;

  const correspondance = /^(GET|HEAD|POST|PUT|PATCH|DELETE)\s+(\S+)\s+->\s+(\d+)(?:\s*\|\s*corps=([\s\S]*))?$/.exec(
    details,
  );
  if (!correspondance) return details;

  const [, methode, url, statut, corpsBrut] = correspondance;
  if (!methode || !url || !statut) return details;
  let body: unknown;
  if (corpsBrut) {
    try {
      body = JSON.parse(corpsBrut);
    } catch {
      body = undefined;
    }
  }

  let references: ReferencesAudit | undefined;
  if (estObjet(body) && resoudreLocalisation) {
    const valeur = body.id_localisation_origine;
    const id = typeof valeur === 'number' ? valeur : Number(valeur);
    if (Number.isInteger(id) && id > 0) {
      const libelle = await resoudreLocalisation(id);
      if (libelle) references = { localisations: new Map([[id, libelle]]) };
    }
  }

  return decrireOperation(methode, url, Number(statut), body, references);
}
