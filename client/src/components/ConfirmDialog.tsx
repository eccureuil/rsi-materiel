import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type TonConfirmation = 'danger' | 'primaire' | 'avertissement';

export interface OptionsConfirmation {
  titre: string;
  message: string;
  libelleConfirmer?: string;
  libelleAnnuler?: string;
  ton?: TonConfirmation;
}

interface ConfirmContextValue {
  confirmer: (options: OptionsConfirmation) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

interface Etat extends OptionsConfirmation {
  resoudre: (ok: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<Etat | null>(null);

  const confirmer = useCallback((options: OptionsConfirmation) => {
    return new Promise<boolean>((resolve) => {
      setEtat({ ...options, resoudre: resolve });
    });
  }, []);

  const fermer = (ok: boolean) => {
    if (etat) {
      etat.resoudre(ok);
      setEtat(null);
    }
  };

  const api = useMemo<ConfirmContextValue>(() => ({ confirmer }), [confirmer]);

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      {etat && <Dialogue etat={etat} onFermer={fermer} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm doit être utilisé dans <ConfirmProvider>');
  return ctx;
}

function Dialogue({ etat, onFermer }: { etat: Etat; onFermer: (ok: boolean) => void }) {
  const boutonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    boutonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFermer]);

  const ton: TonConfirmation = etat.ton ?? 'primaire';
  const classesBouton: Record<TonConfirmation, string> = {
    danger: 'btn-danger',
    primaire: 'btn-primary',
    avertissement: 'btn-warning',
  };
  const classesIcone: Record<TonConfirmation, string> = {
    danger: 'bg-red-100 text-red-600',
    primaire: 'bg-blue-100 text-blue-600',
    avertissement: 'bg-amber-100 text-amber-600',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-titre"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4"
      onClick={() => onFermer(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
      >
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${classesIcone[ton]}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 9v4M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 id="confirm-titre" className="text-base font-semibold text-slate-900">{etat.titre}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{etat.message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => onFermer(false)}>
            {etat.libelleAnnuler ?? 'Annuler'}
          </button>
          <button ref={boutonRef} className={classesBouton[ton]} onClick={() => onFermer(true)}>
            {etat.libelleConfirmer ?? 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}