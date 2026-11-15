import {
  cloneElement, isValidElement, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactElement,
  type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';

type ChampProps = {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  requis?: boolean;
  optionnel?: boolean;
  aide?: ReactNode;
  className?: string;
};

type ProprietesControle = {
  id?: string;
  'aria-describedby'?: string;
};

export function Champ({
  label,
  htmlFor,
  children,
  requis = false,
  optionnel = false,
  aide,
  className = '',
}: ChampProps) {
  const idGenere = useId();
  const aideId = `${idGenere}-aide`;
  const controle = isValidElement<ProprietesControle>(children) ? children : null;
  const champId = htmlFor ?? controle?.props.id ?? idGenere;
  const descriptions = [controle?.props['aria-describedby'], aide ? aideId : undefined]
    .filter(Boolean)
    .join(' ');

  const contenu = controle
    ? cloneElement(controle as ReactElement<ProprietesControle>, {
        id: controle.props.id ?? champId,
        ...(descriptions ? { 'aria-describedby': descriptions } : {}),
      })
    : children;

  return (
    <div className={`min-w-0 ${className}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={champId} className="label">
          {label}
          {requis && (
            <>
              <span className="text-rose-500" aria-hidden="true">*</span>
              <span className="sr-only">(obligatoire)</span>
            </>
          )}
        </label>
        {optionnel && (
          <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            Optionnel
          </span>
        )}
      </div>
      {contenu}
      {aide && (
        <p id={aideId} className="mt-1.5 text-xs leading-relaxed text-slate-500">
          {aide}
        </p>
      )}
    </div>
  );
}

export function FormGrid({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>{children}</div>;
}

export function SectionFormulaire({
  titre,
  description,
  children,
  className = '',
}: {
  titre?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`form-panel ${className}`}>
      {(titre || description) && (
        <div className="mb-4 border-b border-slate-200 pb-3">
          {titre && <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">{titre}</h3>}
          {description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ''}`} />;
}

type ChampRechercheProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string;
  onChange: (valeur: string) => void;
  label?: string;
  enveloppeClassName?: string;
};

export function ChampRecherche({
  value,
  onChange,
  label,
  enveloppeClassName = '',
  className = '',
  placeholder = 'Rechercher…',
  id,
  ...props
}: ChampRechercheProps) {
  const idGenere = useId();
  const champId = id ?? idGenere;

  return (
    <div className={enveloppeClassName}>
      {label && (
        <label
          htmlFor={champId}
          className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400"
        >
          <IconeRecherche taille={12} />
          {label}
        </label>
      )}
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
          <IconeRecherche />
        </span>
        <input
          {...props}
          id={champId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={props['aria-label'] ?? label ?? placeholder}
          className={`h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-asecna-bleu focus:bg-white focus:ring-4 focus:ring-asecna-bleu/10 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl text-slate-400 transition-colors hover:text-slate-700"
            aria-label="Effacer la recherche"
          >
            <IconeFermer />
          </button>
        )}
      </div>
    </div>
  );
}

type ChampFiltreProps = {
  label: string;
  icone?: ReactNode;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
};

export function ChampFiltre({ label, icone, htmlFor, className = '', children }: ChampFiltreProps) {
  return (
    <div className={className}>
      {htmlFor ? (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400"
        >
          {icone}
          {label}
        </label>
      ) : (
        <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {icone}
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

export interface OptionSelectFiltre {
  value: string;
  label: string;
}

type SelectFiltreProps = {
  id?: string;
  value: string;
  onChange: (valeur: string) => void;
  options: OptionSelectFiltre[];
  label?: string;
  icone?: ReactNode;
  placeholder?: string;
  enveloppeClassName?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  'aria-describedby'?: string;
};

export function SelectFiltre({
  id,
  value,
  onChange,
  options,
  label,
  icone,
  placeholder = 'Sélectionner…',
  enveloppeClassName = '',
  className = '',
  disabled = false,
  required = false,
  'aria-describedby': ariaDescribedby,
}: SelectFiltreProps) {
  const [ouvert, setOuvert] = useState(false);
  const [indexActif, setIndexActif] = useState(-1);
  const [invalide, setInvalide] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);
  const boutonRef = useRef<HTMLButtonElement>(null);
  const idGenere = useId();
  const champId = id ?? idGenere;
  const listeId = `${champId}-liste`;
  const selection = options.find((option) => option.value === value);

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

  const ouvrir = () => {
    const indexSelection = options.findIndex((option) => option.value === value);
    setIndexActif(indexSelection >= 0 ? indexSelection : 0);
    setOuvert(true);
  };

  const choisir = (option: OptionSelectFiltre) => {
    onChange(option.value);
    setInvalide(false);
    setOuvert(false);
    boutonRef.current?.focus();
  };

  const gererClavier = (evenement: KeyboardEvent<HTMLButtonElement>) => {
    if (options.length === 0) return;

    if (evenement.key === 'ArrowDown' || evenement.key === 'ArrowUp') {
      evenement.preventDefault();
      if (!ouvert) {
        ouvrir();
        return;
      }
      const delta = evenement.key === 'ArrowDown' ? 1 : -1;
      setIndexActif((index) => (index + delta + options.length) % options.length);
      return;
    }

    if (evenement.key === 'Enter' || evenement.key === ' ') {
      evenement.preventDefault();
      if (!ouvert) {
        ouvrir();
        return;
      }
      const option = options[indexActif];
      if (option) choisir(option);
      return;
    }

    if (evenement.key === 'Escape') {
      setOuvert(false);
      return;
    }

    if (evenement.key === 'Home') {
      evenement.preventDefault();
      setIndexActif(0);
      return;
    }

    if (evenement.key === 'End') {
      evenement.preventDefault();
      setIndexActif(options.length - 1);
    }
  };

  const selecteur = (
    <div
      ref={conteneurRef}
      className="relative"
      onBlur={(evenement) => {
        if (!evenement.currentTarget.contains(evenement.relatedTarget as Node)) setOuvert(false);
      }}
    >
      <button
        ref={boutonRef}
        id={champId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        aria-controls={listeId}
        aria-activedescendant={ouvert && indexActif >= 0 ? `${champId}-option-${indexActif}` : undefined}
        aria-label={label}
        aria-describedby={ariaDescribedby}
        aria-required={required || undefined}
        aria-invalid={invalide || undefined}
        disabled={disabled}
        onClick={() => (ouvert ? setOuvert(false) : ouvrir())}
        onKeyDown={gererClavier}
        className={`flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-left text-sm shadow-sm outline-none transition focus:border-asecna-bleu focus:bg-white focus:ring-4 focus:ring-asecna-bleu/10 aria-[invalid=true]:border-red-300 aria-[invalid=true]:bg-red-50/40 aria-[invalid=true]:focus:border-red-400 aria-[invalid=true]:focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60 ${
          ouvert ? 'border-asecna-bleu bg-white ring-4 ring-asecna-bleu/10' : ''
        } ${selection ? 'text-slate-800' : 'text-slate-400'} ${className}`}
      >
        <span className="truncate">{selection?.label ?? placeholder}</span>
        <span className={`shrink-0 text-slate-400 transition-transform ${ouvert ? 'rotate-180' : ''}`}>
          <IconeChevron />
        </span>
      </button>
      {required && (
        <select
          required
          value={value}
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none absolute h-px w-px opacity-0"
          onChange={(evenement) => onChange(evenement.target.value)}
          onInvalid={(evenement) => {
            evenement.preventDefault();
            setInvalide(true);
            boutonRef.current?.focus();
          }}
        >
          {options.map((option, index) => (
            <option key={`${option.value}-${index}`} value={option.value}>{option.label}</option>
          ))}
        </select>
      )}

      {ouvert && (
        <ul
          id={listeId}
          role="listbox"
          aria-labelledby={champId}
          className="absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 ring-1 ring-black/5"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-400">Aucune option disponible</li>
          ) : options.map((option, index) => {
            const selectionne = option.value === value;
            const actif = index === indexActif;
            return (
              <li
                key={`${option.value}-${index}`}
                id={`${champId}-option-${index}`}
                role="option"
                aria-selected={selectionne}
                onMouseDown={(evenement) => evenement.preventDefault()}
                onMouseEnter={() => setIndexActif(index)}
                onClick={() => choisir(option)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  selectionne
                    ? 'bg-asecna-bleu/5 font-semibold text-asecna-bleu'
                    : actif
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {selectionne && <IconeCoche />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  if (!label) return <div className={enveloppeClassName}>{selecteur}</div>;

  return (
    <ChampFiltre label={label} icone={icone} htmlFor={champId} className={enveloppeClassName}>
      {selecteur}
    </ChampFiltre>
  );
}

export interface FiltreActif {
  label: string;
  onSupprimer: () => void;
}

type ResumeFiltresProps = {
  filtres: FiltreActif[];
  total: number;
  onToutEffacer: () => void;
  chargement?: boolean;
  unite?: string;
  libelleChargement?: string;
};

export function ResumeFiltres({
  filtres,
  total,
  onToutEffacer,
  chargement = false,
  unite = 'résultat(s)',
  libelleChargement = 'Chargement…',
}: ResumeFiltresProps) {
  if (filtres.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-b-lg border-t border-slate-100 bg-slate-50/70 px-4 py-2.5">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        <IconeFiltre />
        Filtres actifs
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-asecna-bleu px-1 text-[9px] font-bold text-white">
          {filtres.length}
        </span>
      </span>
      {filtres.map((filtre, index) => (
        <PuceFiltre key={`${filtre.label}-${index}`} label={filtre.label} onSupprimer={filtre.onSupprimer} />
      ))}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-[11px] text-slate-500">
          {chargement ? libelleChargement : `${total} ${unite}`}
        </span>
        <button
          type="button"
          onClick={onToutEffacer}
          className="text-[11px] font-semibold text-asecna-bleu hover:underline"
        >
          Tout effacer
        </button>
      </div>
    </div>
  );
}

export function InputMotDePasse(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`input pr-11 ${props.className ?? ''}`}
      />
      <button
        type="button"
        onClick={() => setVisible((valeur) => !valeur)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-400 transition-colors hover:text-asecna-bleu focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-asecna-bleu/40 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        aria-pressed={visible}
        disabled={props.disabled}
      >
        {visible ? <IconeOeilBarre /> : <IconeOeil />}
      </button>
    </div>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input min-h-24 resize-y ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`input selecteur pr-10 ${props.className ?? ''}`} />;
}

function IconeOeil() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconeOeilBarre() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.06 4.19" />
      <path d="M6.61 6.61C3.8 8.36 2 12 2 12s3.5 7 10 7a10.9 10.9 0 0 0 5.39-1.39" />
    </svg>
  );
}

function PuceFiltre({ label, onSupprimer }: FiltreActif) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white py-1 pl-2.5 pr-1 text-[11px] font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onSupprimer}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Retirer le filtre ${label}`}
      >
        <IconeFermer taille={11} />
      </button>
    </span>
  );
}

function IconeRecherche({ taille = 17 }: { taille?: number }) {
  return (
    <svg aria-hidden="true" width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function IconeFermer({ taille = 14 }: { taille?: number }) {
  return (
    <svg aria-hidden="true" width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function IconeChevron() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconeCoche() {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

function IconeFiltre() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16l-6.5 7.5V19l-3 2v-8.5z" />
    </svg>
  );
}

export function IconeCategorie() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.6 13.4 12 22l-8.6-8.6a2 2 0 0 1 0-2.8l8-8a2 2 0 0 1 1.4-.6H19a2 2 0 0 1 2 2v6.2a2 2 0 0 1-.4 1.2z" />
      <circle cx="16" cy="8" r="1" />
    </svg>
  );
}

export function IconeStatut() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l2.5 2.5" />
    </svg>
  );
}

export function IconeLocalisation() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function IconeUtilisateur() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function IconeUrgence() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 4.3 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function IconeCalendrier() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function IconeMaintenance() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2.5-.7-.7-2.5z" />
    </svg>
  );
}

export function IconeAlerte() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}