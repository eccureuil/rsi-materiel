import type { ReactNode } from 'react';

export interface Colonne<T> {
  cle: string;
  entete: string;
  rendu?: (item: T) => ReactNode;
  className?: string;
}

interface Props<T> {
  colonnes: Colonne<T>[];
  donnees: T[];
  cleLigne: (item: T) => string | number;
  chargement?: boolean;
  videMessage?: string;
}

export default function DataTable<T>({
  colonnes, donnees, cleLigne, chargement = false, videMessage = 'Aucun élément.',
}: Props<T>) {
  if (chargement) return <p className="text-sm text-slate-500">Chargement…</p>;
  if (donnees.length === 0) return <p className="text-sm text-slate-500">{videMessage}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {colonnes.map((c) => (
              <th key={c.cle} className={`px-4 py-3 text-left font-semibold text-slate-600 ${c.className ?? ''}`}>
                {c.entete}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {donnees.map((item) => (
            <tr key={cleLigne(item)} className="hover:bg-slate-50">
              {colonnes.map((c) => (
                <td key={c.cle} className={`px-4 py-3 text-slate-700 ${c.className ?? ''}`}>
                  {c.rendu ? c.rendu(item) : String((item as Record<string, unknown>)[c.cle] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}