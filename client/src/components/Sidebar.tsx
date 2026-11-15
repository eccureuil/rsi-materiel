import { useEffect, useState, type ComponentType } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  INTERVENTIONS_CHANGE_EVENT, listerInterventions, listerPieces, PIECES_CHANGE_EVENT,
} from '@/api/services';
import { useAuth } from '@/context/AuthContext';

interface Lien {
  to: string;
  label: string;
  Icone: ComponentType;
  adminSeulement?: boolean;
}

interface Section {
  titre: string;
  liens: Lien[];
}

const sections: Section[] = [
  {
    titre: 'Pilotage',
    liens: [
      { to: '/dashboard', label: 'Tableau de bord', Icone: IconeTableauDeBord },
    ],
  },
  {
    titre: 'Parc',
    liens: [
      { to: '/materiels', label: 'Inventaire matériels', Icone: IconeInventaire },
      { to: '/localisations', label: 'Localisations', Icone: IconeLocalisation },
      { to: '/affectations', label: 'Mouvements', Icone: IconeAffectation },
    ],
  },
  {
    titre: 'Maintenance',
    liens: [
      { to: '/pannes', label: 'Déclarations pannes', Icone: IconePanne },
      { to: '/interventions', label: 'Interventions', Icone: IconeIntervention },
      { to: '/stock', label: 'Stock pièces', Icone: IconeStock },
    ],
  },
  {
    titre: 'Administration',
    liens: [
      { to: '/utilisateurs', label: 'Utilisateurs', Icone: IconeUtilisateurs, adminSeulement: true },
      { to: '/audit', label: 'Journal audit', Icone: IconeAudit, adminSeulement: true },
    ],
  },
];

export default function Sidebar() {
  const { hasRole } = useAuth();
  const estAdmin = hasRole('ADMINISTRATEUR');
  const location = useLocation();
  const [interventionsEnCours, setInterventionsEnCours] = useState(0);
  const [piecesEnAlerte, setPiecesEnAlerte] = useState(0);

  useEffect(() => {
    let annule = false;

    const chargerCompteurs = async () => {
      const [interventions, pieces] = await Promise.all([
        listerInterventions({ terminee: false, page: 1, limit: 1 }).catch(() => null),
        listerPieces({ sous_seuil: true, page: 1, limit: 1 }).catch(() => null),
      ]);
      if (annule) return;
      setInterventionsEnCours(interventions?.total ?? 0);
      setPiecesEnAlerte(pieces?.total ?? 0);
    };

    void chargerCompteurs();
    const minuterie = window.setInterval(() => void chargerCompteurs(), 30_000);
    const surFocus = () => void chargerCompteurs();
    window.addEventListener('focus', surFocus);
    window.addEventListener(INTERVENTIONS_CHANGE_EVENT, surFocus);
    window.addEventListener(PIECES_CHANGE_EVENT, surFocus);

    return () => {
      annule = true;
      window.clearInterval(minuterie);
      window.removeEventListener('focus', surFocus);
      window.removeEventListener(INTERVENTIONS_CHANGE_EVENT, surFocus);
      window.removeEventListener(PIECES_CHANGE_EVENT, surFocus);
    };
  }, [location.pathname]);

  return (
    <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-200/80 bg-white">
      <nav aria-label="Navigation principale" className="flex flex-col gap-5 p-3">
        {sections.map((section) => {
          const liensVisibles = section.liens.filter((lien) => !lien.adminSeulement || estAdmin);
          if (liensVisibles.length === 0) return null;

          return (
            <div key={section.titre}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {section.titre}
              </p>
              <div className="flex flex-col gap-1">
                {liensVisibles.map(({ to, label, Icone }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-asecna-bleu/30 ${
                        isActive
                          ? 'bg-asecna-bleu text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-asecna-bleu'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icone />
                        <span className="truncate">{label}</span>
                        {to === '/interventions' && (
                          <CompteurMenu
                            total={interventionsEnCours}
                            titre={`${interventionsEnCours} intervention(s) en cours`}
                            actif={isActive}
                          />
                        )}
                        {to === '/stock' && (
                          <CompteurMenu
                            total={piecesEnAlerte}
                            titre={`${piecesEnAlerte} pièce(s) en alerte`}
                            actif={isActive}
                            danger
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function CompteurMenu({
  total,
  titre,
  actif,
  danger = false,
}: {
  total: number;
  titre: string;
  actif: boolean;
  danger?: boolean;
}) {
  if (total <= 0) return null;
  return (
    <span
      className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
        actif ? 'bg-white/20 text-white' : danger ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
      }`}
      title={titre}
    >
      {total}
    </span>
  );
}

function IconeTableauDeBord() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconeInventaire() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}

function IconeLocalisation() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconeAffectation() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="m16 3 4 4-4 4" />
      <path d="M20 7H4" />
      <path d="m8 21-4-4 4-4" />
      <path d="M4 17h16" />
    </svg>
  );
}

function IconePanne() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconeIntervention() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
    </svg>
  );
}

function IconeStock() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function IconeUtilisateurs() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconeAudit() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}