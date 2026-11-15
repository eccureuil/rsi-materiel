import { LocalisationRepository } from '../repositories/LocalisationRepository.js';
import type { ReferencesAudit } from './auditDescription.js';

const localisations = new LocalisationRepository();

export async function libelleLocalisation(id: number): Promise<string | null> {
  const localisation = await localisations.findById(id);
  if (!localisation) return null;
  return `${localisation.nom_service} — ${localisation.ville}`;
}

export async function referencesDepuisBody(body: unknown): Promise<ReferencesAudit | undefined> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return undefined;

  const valeur = (body as Record<string, unknown>).id_localisation_origine;
  const id = typeof valeur === 'number' ? valeur : Number(valeur);
  if (!Number.isInteger(id) || id <= 0) return undefined;

  const libelle = await libelleLocalisation(id);
  if (!libelle) return undefined;

  return { localisations: new Map([[id, libelle]]) };
}
