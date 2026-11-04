import { z } from 'zod';
import { texteOptionnel } from './common.js';

export type Localisation = {
  id_localisation: number;
  nom_service: string;
  code_bureau: string | null;
  ville: string;
  nb_materiels: number;
};

// RG_LOCALISATION_01 : code_bureau optionnel (salles serveurs, locaux techniques)
export const localisationSchema = z.object({
  nom_service: z.string().trim().min(1, 'Le nom du service est requis.').max(100),
  code_bureau: texteOptionnel(20),
  ville: z.string().trim().min(1).max(50).default('Antananarivo'),
});
export type LocalisationDto = z.infer<typeof localisationSchema>;