import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';

export type TypeToast = 'succes' | 'erreur' | 'avertissement' | 'info';

export interface ToastItem {
  id: number;
  type: TypeToast;
  titre: string;
  message?: string;
  duree: number;
}

interface ToastContextValue {
  succes: (titre: string, message?: string) => void;
  erreur: (titre: string, message?: string) => void;
  avertissement: (titre: string, message?: string) => void;
  info: (titre: string, message?: string) => void;
  retirer: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let compteur = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, number>>(new Map());

  const retirer = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t !== undefined) {
      window.clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const ajouter = useCallback((type: TypeToast, titre: string, message?: string, duree = 5000) => {
    const id = ++compteur;
    setToasts((prev) => [...prev, { id, type, titre, message, duree }]);
    if (duree > 0) {
      const t = window.setTimeout(() => retirer(id), duree);
      timers.current.set(id, t);
    }
  }, [retirer]);

  useEffect(() => {
    const m = timers.current;
    return () => {
      m.forEach((t) => window.clearTimeout(t));
      m.clear();
    };
  }, []);

  const api = useMemo<ToastContextValue>(() => ({
    succes: (t, m) => ajouter('succes', t, m),
    erreur: (t, m) => ajouter('erreur', t, m, 8000),
    avertissement: (t, m) => ajouter('avertissement', t, m, 6000),
    info: (t, m) => ajouter('info', t, m),
    retirer,
  }), [ajouter, retirer]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 top-4 z-60 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        {toasts.map((t) => (
          <ToastCarte key={t.id} toast={t} onFermer={() => retirer(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans <ToastProvider>');
  return ctx;
}

// ---------- Carte de toast ----------

const CONFIG: Record<TypeToast, {
  icone: ReactNode;
  anneau: string; fond: string; texteTitre: string; texteMsg: string;
}> = {
  succes: {
    icone: <IconeCoche />,
    anneau: 'ring-emerald-200',
    fond: 'bg-white',
    texteTitre: 'text-emerald-900',
    texteMsg: 'text-emerald-800/80',
  },
  erreur: {
    icone: <IconeCroix />,
    anneau: 'ring-red-200',
    fond: 'bg-white',
    texteTitre: 'text-red-900',
    texteMsg: 'text-red-800/80',
  },
  avertissement: {
    icone: <IconeAlerte />,
    anneau: 'ring-amber-200',
    fond: 'bg-white',
    texteTitre: 'text-amber-900',
    texteMsg: 'text-amber-800/80',
  },
  info: {
    icone: <IconeInfo />,
    anneau: 'ring-blue-200',
    fond: 'bg-white',
    texteTitre: 'text-blue-900',
    texteMsg: 'text-blue-800/80',
  },
};

const COULEUR_BARRE: Record<TypeToast, string> = {
  succes: 'bg-emerald-500',
  erreur: 'bg-red-500',
  avertissement: 'bg-amber-500',
  info: 'bg-blue-500',
};

function ToastCarte({ toast, onFermer }: { toast: ToastItem; onFermer: () => void }) {
  const c = CONFIG[toast.type];
  return (
    <div
      role="status"
      className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-lg ${c.fond} shadow-lg ring-1 ${c.anneau} animate-[slideIn_180ms_ease-out]`}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${COULEUR_BARRE[toast.type]}`} />
      <div className="flex items-start gap-3 px-4 py-3 pl-5">
        <div className="mt-0.5 shrink-0">{c.icone}</div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${c.texteTitre}`}>{toast.titre}</p>
          {toast.message && (
            <p className={`mt-0.5 text-xs leading-relaxed ${c.texteMsg}`}>{toast.message}</p>
          )}
        </div>
        <button
          onClick={onFermer}
          className="ml-2 shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Fermer la notification"
        >
          <IconeFermer />
        </button>
      </div>
    </div>
  );
}

// ---------- Icônes ----------

function IconeCoche() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}
function IconeCroix() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-700">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </span>
  );
}
function IconeAlerte() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M12 8v5M12 17h.01" />
      </svg>
    </span>
  );
}
function IconeInfo() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M12 16v-5M12 8h.01" />
      </svg>
    </span>
  );
}
function IconeFermer() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}