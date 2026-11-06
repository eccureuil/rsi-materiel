import type { ReactNode } from 'react';

interface Props {
  ouvert: boolean;
  titre: string;
  onFermer: () => void;
  children: ReactNode;
  piedDePage?: ReactNode;
}

export default function Modal({ ouvert, titre, onFermer, children, piedDePage }: Props) {
  if (!ouvert) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{titre}</h2>
          <button onClick={onFermer} className="text-slate-500 hover:text-slate-800" aria-label="Fermer">✕</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">{children}</div>
        {piedDePage && (
          <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">{piedDePage}</div>
        )}
      </div>
    </div>
  );
}