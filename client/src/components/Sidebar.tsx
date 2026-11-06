import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface Lien { to: string; label: string; adminSeulement?: boolean; }
const liens: Lien[] = [
  { to: '/dashboard', label: 'Tableau de bord' },
  { to: '/materiels', label: 'Inventaire materiels' },
  { to: '/localisations', label: 'Localisations' },
  { to: '/affectations', label: 'Affectations / Bons' },
  { to: '/pannes', label: 'Declarations pannes' },
  { to: '/interventions', label: 'Interventions' },
  { to: '/stock', label: 'Stock pieces' },
  { to: '/utilisateurs', label: 'Utilisateurs', adminSeulement: true },
  { to: '/audit', label: 'Journal audit', adminSeulement: true },
];

export default function Sidebar() {
  const { hasRole } = useAuth();
  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white">
      <nav className="flex flex-col gap-1 p-4">
        {liens.filter((l) => !l.adminSeulement || hasRole('ADMINISTRATEUR')).map((lien) => (
          <NavLink key={lien.to} to={lien.to}
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-asecna-bleu text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}>
            {lien.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}