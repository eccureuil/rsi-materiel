import type { ReactNode } from 'react';

interface Props {
  ouvert: boolean;
  titre: string;
  surtitre?: string;
  onFermer: () => void;
  children: ReactNode;
  piedDePage?: ReactNode;
}

export default function Modal({ ouvert, titre, surtitre = 'Formulaire', onFermer, children, piedDePage }: Props) {
  if (!ouvert) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-asecna-bleu/75">{surtitre}</p>
            <h2 className="text-lg font-semibold text-slate-900">{titre}</h2>
          </div>
          <button
            type="button"
            onClick={onFermer}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[72vh] overflow-y-auto px-6 py-5">{children}</div>
        {piedDePage && (
          <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50/60 px-6 py-4">{piedDePage}</div>
        )}
      </div>
    </div>
  );
}