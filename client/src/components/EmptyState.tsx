import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import BoutonCreation from '@/components/BoutonCreation';

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
    <div
      role="status"
      aria-live="polite"
      className="rsi-fade-in relative flex flex-col items-center justify-center overflow-hidden px-6 py-16 text-center"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,51,102,0.06),transparent_55%)]"
      />

      <div className="relative flex flex-col items-center">
        <span
          className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
            filtreActif
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${filtreActif ? 'bg-amber-500' : 'bg-slate-400'}`} />
          {filtreActif ? 'Aucun résultat' : 'Aucune donnée'}
        </span>

        {icone && (
          <div
            className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${
              filtreActif
                ? 'bg-asecna-bleu/5 text-asecna-bleu ring-1 ring-asecna-bleu/15'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {icone}
          </div>
        )}

        <h3 className="text-base font-semibold text-slate-900">{titre}</h3>
        {description && (
          <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {filtreActif && ctaOnClick && (
            <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={ctaOnClick}>
              <IconeReinitialiser />
              Réinitialiser les filtres
            </button>
          )}
          {!filtreActif && ctaLabel && ctaOnClick && (
            ctaLabel.trim().startsWith('+') ? (
              <BoutonCreation libelle={ctaLabel.replace(/^\+\s*/, '')} onClick={ctaOnClick} />
            ) : (
              <button type="button" className="btn-primary" onClick={ctaOnClick}>
                {ctaLabel}
              </button>
            )
          )}
          {lienLabel && lienTo && (
            <Link to={lienTo} className="btn-primary">
              {lienLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function IconeReinitialiser() {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
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