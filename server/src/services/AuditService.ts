import type { JournalEntry, ListAuditQuery } from '../models/audit.js';
import type { AuditRepository } from '../repositories/AuditRepository.js';

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
    return {
      items,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    };
  }
}