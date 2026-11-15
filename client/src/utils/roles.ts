import type { Role } from '@/types/api';

export const LIBELLES_ROLE: Record<Role, string> = {
  ADMINISTRATEUR: 'Administrateur',
  CADRE_MAINTENANCE: 'Cadre maintenance',
};

export function libelleRole(role: Role): string {
  return LIBELLES_ROLE[role];
}
