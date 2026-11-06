import type { Materiel, StatutMateriel } from '../models/materiel.js';
import {
  creerDocument,
  enTete,
  finaliser,
  formatDate,
  paragraphe,
  tableau,
  titreDocument,
} from './pdfCommun.js';

const STATUT: Record<StatutMateriel, string> = {
  STOCK: 'En stock',
  SERVICE: 'En service',
  PANNE: 'En panne',
  MAINTENANCE: 'En maintenance',
  REFORME: 'Réformé',
};

export async function genererInventairePdf(items: Materiel[], resumeFiltres: string): Promise<Buffer> {
  const doc = creerDocument(true);

  enTete(doc);
  titreDocument(doc, "ÉTAT DE L'INVENTAIRE DES MATÉRIELS", `${items.length} matériel(s)`);
  paragraphe(doc, `Filtres appliqués : ${resumeFiltres}`);

  tableau(
    doc,
    [
      { titre: 'Code', largeur: 85 },
      { titre: 'Désignation', largeur: 150 },
      { titre: 'N° de série', largeur: 100 },
      { titre: 'Catégorie', largeur: 85 },
      { titre: 'Statut', largeur: 70 },
      { titre: 'Localisation', largeur: 180 },
      { titre: 'Acquisition', largeur: 72 },
    ],
    items.map((m) => [
      m.code_materiel,
      [m.marque, m.modele].filter((v): v is string => v !== null && v !== '').join(' ') || '—',
      m.num_serie ?? '—',
      m.type_categorie === 'OPERATIONNEL' ? 'Opérationnel' : 'Bureautique',
      STATUT[m.statut_materiel],
      m.code_bureau ? `${m.nom_service} (${m.code_bureau})` : m.nom_service,
      formatDate(m.date_acquisition),
    ]),
  );

  return finaliser(doc);
}