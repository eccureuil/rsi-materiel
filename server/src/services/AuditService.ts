import type { JournalEntry, ListAuditQuery } from '../models/audit.js';
import type { AuditRepository } from '../repositories/AuditRepository.js';
import { formaterDetailsStockes } from '../utils/auditDescription.js';
import { libelleLocalisation } from '../utils/auditReferences.js';

export type PageJournal = {
  items: JournalEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export class AuditService {
  constructor(private readonly audit: AuditRepository) {}

  async lister(filters: ListAuditQuery): Promise<PageJournal> {
    const { items, total } = await this.audit.findAll(filters);
    const cache = new Map<number, string | null>();
    const resoudreLocalisation = async (id: number): Promise<string | null> => {
      if (cache.has(id)) return cache.get(id) ?? null;
      const libelle = await libelleLocalisation(id);
      cache.set(id, libelle);
      return libelle;
    };
    const itemsFormates = await Promise.all(
      items.map(async (item) => ({
        ...item,
        details_operation: await formaterDetailsStockes(
          item.details_operation,
          resoudreLocalisation,
        ),
      })),
    );
    return {
      items: itemsFormates,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    };
  }
}