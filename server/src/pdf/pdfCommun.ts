import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const LOGO_ASECNA = fileURLToPath(new URL('../../assets/logo_asecna.png', import.meta.url));

export const COULEUR_PRIMAIRE = '#1e3a5f';
const COULEUR_TEXTE = '#0f172a';
const COULEUR_ETIQUETTE = '#475569';

export type Colonne = { titre: string; largeur: number };

export function creerDocument(paysage = false): PDFKit.PDFDocument {
  return new PDFDocument({
    size: 'A4',
    layout: paysage ? 'landscape' : 'portrait',
    margin: 50,
    bufferPages: true,
  });
}

// Termine le document (pieds de page inclus) et renvoie le contenu binaire
export function finaliser(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const morceaux: Buffer[] = [];
    doc.on('data', (morceau: Buffer) => morceaux.push(morceau));
    doc.on('end', () => resolve(Buffer.concat(morceaux)));
    doc.on('error', reject);

    const pages = doc.bufferedPageRange();
    const maintenant = formatDate(new Date().toISOString().replace('T', ' ').slice(0, 16));
    for (let i = 0; i < pages.count; i += 1) {
      doc.switchToPage(pages.start + i);
      const margeBasse = doc.page.margins.bottom;
      doc.page.margins.bottom = 0; // évite un saut de page automatique en écrivant dans la marge
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COULEUR_ETIQUETTE)
        .text(
          `RSI ASECNA Madagascar - Document généré le ${maintenant} - Page ${i + 1}/${pages.count}`,
          doc.page.margins.left,
          doc.page.height - 35,
          {
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
            align: 'center',
            lineBreak: false,
          },
        );
      doc.page.margins.bottom = margeBasse;
    }
    doc.end();
  });
}

// 'AAAA-MM-JJ' ou 'AAAA-MM-JJ HH:MM:SS' vers 'JJ/MM/AAAA' (avec l'heure si présente)
export function formatDate(valeur: string | null): string {
  if (!valeur) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(valeur);
  if (!m) return valeur;
  const [, annee, mois, jour, heure, minute] = m;
  return heure && minute ? `${jour}/${mois}/${annee} ${heure}:${minute}` : `${jour}/${mois}/${annee}`;
}

function largeurUtile(doc: PDFKit.PDFDocument): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

export function enTete(doc: PDFKit.PDFDocument): void {
  const x = doc.page.margins.left;
  const largeur = largeurUtile(doc);
  const tailleLogo = 48;

  doc.image(LOGO_ASECNA, x + (largeur - tailleLogo) / 2, doc.y, {
    width: tailleLogo,
    height: tailleLogo,
  });
  doc.y += tailleLogo + 4;

  doc.font('Helvetica-Bold').fontSize(16).fillColor(COULEUR_PRIMAIRE);
  doc.text('ASECNA', x, doc.y, { width: largeur, align: 'center' });
  doc.font('Helvetica').fontSize(8.5).fillColor(COULEUR_ETIQUETTE);
  doc.text(
    'Agence pour la Sécurité de la Navigation Aérienne en Afrique et à Madagascar',
    x,
    doc.y,
    { width: largeur, align: 'center' },
  );
  doc.text(
    "Service Réseaux, Systèmes d'Information et Télécommunications (RSI) - Antananarivo",
    x,
    doc.y,
    { width: largeur, align: 'center' },
  );

  doc.y += 6;
  doc
    .save()
    .moveTo(x, doc.y)
    .lineTo(x + largeur, doc.y)
    .lineWidth(1.2)
    .strokeColor(COULEUR_PRIMAIRE)
    .stroke()
    .restore();
  doc.y += 14;
}

export function titreDocument(doc: PDFKit.PDFDocument, titre: string, sousTitre?: string): void {
  const x = doc.page.margins.left;
  const largeur = largeurUtile(doc);
  doc.font('Helvetica-Bold').fontSize(18).fillColor(COULEUR_TEXTE);
  doc.text(titre, x, doc.y, { width: largeur, align: 'center' });
  if (sousTitre) {
    doc.font('Helvetica').fontSize(10).fillColor(COULEUR_ETIQUETTE);
    doc.text(sousTitre, x, doc.y + 2, { width: largeur, align: 'center' });
  }
  doc.y += 14;
}

export function sectionTitre(doc: PDFKit.PDFDocument, texte: string): void {
  const x = doc.page.margins.left;
  const largeur = largeurUtile(doc);
  if (doc.y + 60 > doc.page.height - doc.page.margins.bottom) doc.addPage();
  doc.y += 6;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COULEUR_PRIMAIRE);
  doc.text(texte.toUpperCase(), x, doc.y, { width: largeur });
  doc
    .save()
    .moveTo(x, doc.y + 1)
    .lineTo(x + largeur, doc.y + 1)
    .lineWidth(0.5)
    .strokeColor('#cbd5e1')
    .stroke()
    .restore();
  doc.y += 8;
}

export function champ(doc: PDFKit.PDFDocument, etiquette: string, valeur: string): void {
  const x = doc.page.margins.left;
  const largeur = largeurUtile(doc);
  if (doc.y + 30 > doc.page.height - doc.page.margins.bottom) doc.addPage();
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COULEUR_ETIQUETTE);
  doc.text(etiquette, x, y, { width: 130 });
  const yEtiquette = doc.y;
  doc.font('Helvetica').fontSize(10).fillColor(COULEUR_TEXTE);
  doc.text(valeur, x + 135, y, { width: largeur - 135 });
  doc.y = Math.max(yEtiquette, doc.y) + 4;
}

export function paragraphe(doc: PDFKit.PDFDocument, texte: string): void {
  const x = doc.page.margins.left;
  doc.font('Helvetica').fontSize(10).fillColor(COULEUR_TEXTE);
  doc.text(texte, x, doc.y, { width: largeurUtile(doc), align: 'justify' });
  doc.y += 6;
}

export type Signature = { titre: string; nom?: string };

export function signatures(doc: PDFKit.PDFDocument, gauche: Signature, droite: Signature): void {
  const x = doc.page.margins.left;
  const largeur = largeurUtile(doc);
  const hauteur = 95;
  if (doc.y + hauteur + 20 > doc.page.height - doc.page.margins.bottom) doc.addPage();
  doc.y += 14;

  const y = doc.y;
  const largeurBloc = (largeur - 20) / 2;
  [gauche, droite].forEach((signature, index) => {
    const bx = x + index * (largeurBloc + 20);
    doc.save().rect(bx, y, largeurBloc, hauteur).lineWidth(0.7).strokeColor('#94a3b8').stroke().restore();
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COULEUR_TEXTE);
    doc.text(signature.titre, bx + 8, y + 8, { width: largeurBloc - 16 });
    if (signature.nom) {
      doc.font('Helvetica').fontSize(9).fillColor(COULEUR_ETIQUETTE);
      doc.text(signature.nom, bx + 8, y + 24, { width: largeurBloc - 16 });
    }
    doc.font('Helvetica').fontSize(8).fillColor(COULEUR_ETIQUETTE);
    doc.text('Date, nom, cachet et signature', bx + 8, y + hauteur - 16, {
      width: largeurBloc - 16,
      lineBreak: false,
    });
  });
  doc.y = y + hauteur + 10;
}

export function tableau(doc: PDFKit.PDFDocument, colonnes: Colonne[], lignes: string[][]): void {
  const x0 = doc.page.margins.left;
  const total = colonnes.reduce((somme, c) => somme + c.largeur, 0);
  const limiteBasse = (): number => doc.page.height - doc.page.margins.bottom - 20;

  const dessinerEntete = (): void => {
    const y = doc.y;
    doc.save().rect(x0, y, total, 20).fill(COULEUR_PRIMAIRE).restore();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
    let x = x0;
    for (const colonne of colonnes) {
      doc.text(colonne.titre, x + 4, y + 6, { width: colonne.largeur - 8, lineBreak: false });
      x += colonne.largeur;
    }
    doc.fillColor(COULEUR_TEXTE);
    doc.y = y + 20;
  };

  dessinerEntete();

  lignes.forEach((ligne, index) => {
    doc.font('Helvetica').fontSize(9);
    const hauteur =
      Math.max(
        14,
        ...colonnes.map((c, i) => doc.heightOfString(ligne[i] ?? '', { width: c.largeur - 8 })),
      ) + 8;

    if (doc.y + hauteur > limiteBasse()) {
      doc.addPage();
      dessinerEntete();
      doc.font('Helvetica').fontSize(9);
    }

    const y = doc.y;
    if (index % 2 === 1) {
      doc.save().rect(x0, y, total, hauteur).fill('#f1f5f9').restore();
    }
    doc.fillColor(COULEUR_TEXTE);
    let x = x0;
    colonnes.forEach((c, i) => {
      doc.text(ligne[i] ?? '', x + 4, y + 4, { width: c.largeur - 8 });
      x += c.largeur;
    });
    doc
      .save()
      .moveTo(x0, y + hauteur)
      .lineTo(x0 + total, y + hauteur)
      .lineWidth(0.5)
      .strokeColor('#e2e8f0')
      .stroke()
      .restore();
    doc.y = y + hauteur;
  });
  doc.y += 6;
}