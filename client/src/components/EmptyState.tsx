import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  icone?: ReactNode;
  titre: string;
  description?: string;
  // Bouton principal (action locale : ouvrir un modal, reinitialiser un filtre...)
  ctaLabel?: string;
  ctaOnClick?: () => void;
  // Variante "lien" (navigation)
  lienLabel?: string;
  lienTo?: string;
  // Filtres actifs : on affiche alors "Aucun resultat" au lieu de "Aucune donnee"
  filtreActif?: boolean;
}

export default function EmptyState({
  icone,
  titre,
  description,
  ctaLabel,
  ctaOnClick,
  lienLabel,
  lienTo,
  filtreActif = false,
}: Props) {
  return (
    <div className="rsi-fade-in flex flex-col items-center justify-center px-6 py-16 text-center">
      {icone && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          {icone}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900">{titre}</h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      )}

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {ctaLabel && ctaOnClick && (
          <button className="btn-primary" onClick={ctaOnClick}>
            {ctaLabel}
          </button>
        )}
        {lienLabel && lienTo && (
          <Link to={lienTo} className="btn-primary">
            {lienLabel}
          </Link>
        )}
        {filtreActif && ctaOnClick && !ctaLabel && (
          <button className="btn-secondary" onClick={ctaOnClick}>
            Reinitialiser les filtres
          </button>
        )}
      </div>
    </div>
  );
}

export const IconesEmpty = {
  Boite: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  ),
  Recherche: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Alerte: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  ),
  Outil: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a4 4 0 1 0 5 5l-9.4 9.4a2 2 0 1 1-2.8-2.8z" />
    </svg>
  ),
  Utilisateur: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
    </svg>
  ),
};