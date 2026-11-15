import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { listerMateriels } from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import Badge from '@/components/Badge';
import { useDebounce } from '@/hooks/useDebounce';
import type { Materiel } from '@/types/api';

interface Props {
  value: Materiel | null;
  onChange: (materiel: Materiel | null) => void;
  erreur?: string;
  disabled?: boolean;
  id?: string;
  'aria-describedby'?: string;
}

function libelleMateriel(materiel: Materiel): string {
  const modele = [materiel.marque, materiel.modele].filter(Boolean).join(' ');
  return modele || 'Modèle non renseigné';
}

function localisationMateriel(materiel: Materiel): string {
  const service = materiel.nom_service ?? '';
  const bureau = materiel.code_bureau ? ` (${materiel.code_bureau})` : '';
  const ville = materiel.ville ? ` · ${materiel.ville}` : '';
  return `${service}${bureau}${ville}`.trim();
}

export default function SelecteurMateriel({
  value,
  onChange,
  erreur,
  disabled = false,
  id,
  'aria-describedby': ariaDescribedby,
}: Props) {
  const idGenere = useId();
  const champId = id ?? idGenere;
  const listeId = `${champId}-liste`;
  const erreurId = `${champId}-erreur`;

  const [texte, setTexte] = useState(value?.code_materiel ?? '');
  const [suggestions, setSuggestions] = useState<Materiel[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreurRecherche, setErreurRecherche] = useState('');
  const [ouvert, setOuvert] = useState(false);
  const [indexActif, setIndexActif] = useState(-1);

  const conteneurRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const clicInterneRef = useRef(false);
  const recherche = useDebounce(texte.trim(), 300);

  useEffect(() => {
    if (!ouvert || disabled || recherche.length < 2) {
      setChargement(false);
      if (recherche.length < 2) {
        setSuggestions([]);
        setErreurRecherche('');
        setIndexActif(-1);
      }
      return;
    }

    let ignore = false;
    setChargement(true);
    setErreurRecherche('');

    listerMateriels({ q: recherche, limit: 10 })
      .then((res) => {
        if (ignore) return;
        setSuggestions(res.items);
        setIndexActif(res.items.length > 0 ? 0 : -1);
      })
      .catch((erreurRechercheApi) => {
        if (ignore) return;
        setSuggestions([]);
        setIndexActif(-1);
        setErreurRecherche(extraireMessageErreur(erreurRechercheApi));
      })
      .finally(() => {
        if (!ignore) setChargement(false);
      });

    return () => {
      ignore = true;
    };
  }, [recherche, ouvert, disabled]);

  useEffect(() => {
    if (!ouvert) return;

    const fermerSiExterieur = (evenement: MouseEvent) => {
      if (!conteneurRef.current?.contains(evenement.target as Node)) setOuvert(false);
    };

    document.addEventListener('mousedown', fermerSiExterieur);
    return () => document.removeEventListener('mousedown', fermerSiExterieur);
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert || indexActif < 0) return;
    document.getElementById(`${champId}-option-${indexActif}`)?.scrollIntoView({ block: 'nearest' });
  }, [champId, indexActif, ouvert]);

  const choisir = (materiel: Materiel) => {
    onChange(materiel);
    setTexte(materiel.code_materiel);
    setOuvert(false);
    setIndexActif(-1);
  };

  const vider = () => {
    onChange(null);
    setTexte('');
    setSuggestions([]);
    setIndexActif(-1);
    setOuvert(false);
    inputRef.current?.focus();
  };

  const finaliserSaisie = () => {
    setOuvert(false);
    if (value || texte.trim().length < 2) return;

    const exact = suggestions.find(
      (materiel) => materiel.code_materiel.toLowerCase() === texte.trim().toLowerCase(),
    );
    if (exact) choisir(exact);
  };

  const gererClavier = (evenement: KeyboardEvent<HTMLInputElement>) => {
    if (evenement.key === 'ArrowDown' || evenement.key === 'ArrowUp') {
      evenement.preventDefault();
      if (!ouvert) {
        setOuvert(true);
        return;
      }
      if (suggestions.length === 0) return;
      const delta = evenement.key === 'ArrowDown' ? 1 : -1;
      setIndexActif((index) => {
        const depart = index < 0 ? (delta > 0 ? -1 : 0) : index;
        return (depart + delta + suggestions.length) % suggestions.length;
      });
      return;
    }

    if (evenement.key === 'Enter') {
      if (ouvert && indexActif >= 0 && suggestions[indexActif]) {
        evenement.preventDefault();
        choisir(suggestions[indexActif]);
      }
      return;
    }

    if (evenement.key === 'Escape') {
      setOuvert(false);
      return;
    }

    if (evenement.key === 'Home' && ouvert) {
      evenement.preventDefault();
      setIndexActif(0);
      return;
    }

    if (evenement.key === 'End' && ouvert) {
      evenement.preventDefault();
      setIndexActif(suggestions.length - 1);
    }
  };

  const descriptions = [ariaDescribedby, erreur ? erreurId : undefined].filter(Boolean).join(' ');

  return (
    <div
      ref={conteneurRef}
      onMouseDown={() => {
        clicInterneRef.current = true;
        window.setTimeout(() => {
          clicInterneRef.current = false;
        }, 0);
      }}
    >
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
          <IconeRecherche />
        </span>
        <input
          ref={inputRef}
          id={champId}
          type="text"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={ouvert}
          aria-controls={listeId}
          aria-autocomplete="list"
          aria-activedescendant={ouvert && indexActif >= 0 ? `${champId}-option-${indexActif}` : undefined}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={descriptions || undefined}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={texte}
          placeholder="Ex. MAT-0001, Dell Latitude…"
          onChange={(evenement) => {
            setTexte(evenement.target.value);
            setOuvert(true);
            if (value) onChange(null);
          }}
          onFocus={() => {
            if (!disabled) setOuvert(true);
          }}
          onBlur={(evenement) => {
            if (clicInterneRef.current || conteneurRef.current?.contains(evenement.relatedTarget as Node)) {
              return;
            }
            finaliserSaisie();
          }}
          onKeyDown={gererClavier}
          className={`h-11 w-full rounded-xl border bg-slate-50/50 pl-10 pr-10 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
            erreur
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'border-slate-200 focus:border-asecna-bleu focus:ring-asecna-bleu/10'
          }`}
        />
        {texte && !disabled && (
          <button
            type="button"
            onMouseDown={(evenement) => evenement.preventDefault()}
            onClick={vider}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl text-slate-400 transition-colors hover:text-slate-700"
            aria-label="Effacer le matériel sélectionné"
          >
            <IconeFermer />
          </button>
        )}

        {ouvert && (
          <ul
            id={listeId}
            role="listbox"
            aria-label="Matériels correspondants"
            className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 ring-1 ring-black/5"
          >
            {recherche.length < 2 ? (
              <li className="px-3 py-2 text-sm text-slate-400">
                Saisissez au moins 2 caractères pour rechercher un matériel.
              </li>
            ) : chargement ? (
              <li className="px-3 py-2 text-sm text-slate-400">Recherche…</li>
            ) : erreurRecherche ? (
              <li className="px-3 py-2 text-sm text-rose-600">{erreurRecherche}</li>
            ) : suggestions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">
                Aucun matériel ne correspond à « {texte.trim()} ».
              </li>
            ) : (
              suggestions.map((materiel, index) => {
                const selectionne = value?.code_materiel === materiel.code_materiel;
                const actif = index === indexActif;
                return (
                  <li
                    key={materiel.code_materiel}
                    id={`${champId}-option-${index}`}
                    role="option"
                    aria-selected={selectionne}
                    onMouseDown={(evenement) => evenement.preventDefault()}
                    onMouseEnter={() => setIndexActif(index)}
                    onClick={() => choisir(materiel)}
                    className={`flex cursor-pointer items-start justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      selectionne
                        ? 'bg-asecna-bleu/5 text-asecna-bleu'
                        : actif
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{materiel.code_materiel}</span>
                        <Badge valeur={materiel.statut_materiel} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {libelleMateriel(materiel)}
                        {materiel.num_serie ? ` · N° série ${materiel.num_serie}` : ''}
                        {localisationMateriel(materiel) ? ` · ${localisationMateriel(materiel)}` : ''}
                      </p>
                    </div>
                    {selectionne && <IconeCoche />}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>

      {value && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-slate-900">{value.code_materiel}</span>
                <Badge valeur={value.statut_materiel} />
              </div>
              <p className="mt-1 text-sm text-slate-700">{libelleMateriel(value)}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {value.type_categorie === 'BUREAUTIQUE' ? 'Bureautique' : 'Opérationnel'}
                {localisationMateriel(value) ? ` · ${localisationMateriel(value)}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={vider}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              Modifier
            </button>
          </div>
        </div>
      )}

      {erreur && (
        <p id={erreurId} role="alert" className="mt-1.5 text-xs text-rose-600">
          {erreur}
        </p>
      )}
    </div>
  );
}

function IconeRecherche() {
  return (
    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function IconeFermer() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function IconeCoche() {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-1 shrink-0">
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}
