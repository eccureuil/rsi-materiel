import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/types/api';

export default function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const { hasRole } = useAuth();
  if (!hasRole(role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}