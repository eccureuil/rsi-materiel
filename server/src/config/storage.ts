import { join } from 'node:path';

export const DOSSIER_STOCKAGE = join(process.cwd(), 'storage');
export const DOSSIER_BONS = join(DOSSIER_STOCKAGE, 'bons');

// `num` est toujours validé (regex BD-AAAA-NNNNN) avant d'arriver ici : pas de traversée de chemin possible
export function cheminBon(num: string): string {
  return join(DOSSIER_BONS, `${num}.pdf`);
}