import type { ReactNode } from 'react';

export function Tableau({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={`tableau ${className}`}>{children}</table>
    </div>
  );
}

export function EnteteTableau({ colonnes }: { colonnes: string[] }) {
  return (
    <thead>
      <tr>
        {colonnes.map((colonne, index) => (
          <th key={`${colonne}-${index}`} scope="col">
            {colonne}
          </th>
        ))}
      </tr>
    </thead>
  );
}
