export type ColonneCsv<T> = {
  entete: string;
  valeur: (ligne: T) => string | number | null;
};

function echapper(valeur: string | number | null): string {
  if (valeur === null) return '';
  let texte = typeof valeur === 'number' ? String(valeur) : valeur;
  // Neutralise l'injection de formules (Excel, LibreOffice) sur les textes
  if (typeof valeur === 'string' && /^[=+\-@\t\r]/.test(texte)) {
    texte = `'${texte}`;
  }
  return /[;"\r\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

// Séparateur ";" et BOM UTF-8 : s'ouvre directement dans Excel (version française)
export function toCsv<T>(colonnes: ColonneCsv<T>[], lignes: T[]): string {
  const entete = colonnes.map((c) => echapper(c.entete)).join(';');
  const corps = lignes.map((ligne) => colonnes.map((c) => echapper(c.valeur(ligne))).join(';'));
  return `\uFEFF${[entete, ...corps].join('\r\n')}\r\n`;
}