import { z } from 'zod';

export type JournalEntry = {
  id_log: string;
  matricule_operateur: string;
  nom: string;
  prenom: string;
  date_heure: string;
  action_effectuee: string;
  details_operation: string | null;
};

export const listAuditQuerySchema = z.object({
  matricule: z.string().trim().max(20).optional(),
  action: z.string().trim().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;