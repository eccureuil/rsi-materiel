// Squelettes de chargement reutilisables. CSS pur, pas de lib JS.

interface Props {
  className?: string;
}

export function Skeleton({ className = '' }: Props) {
  return <div className={`rsi-skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonLigne({ largeur = 'w-full' }: { largeur?: string }) {
  return <Skeleton className={`h-4 ${largeur}`} />;
}

export function SkeletonCarte({ hauteur = 'h-32' }: { hauteur?: string }) {
  return (
    <div className={`card p-5 ${hauteur}`}>
      <Skeleton className="mb-3 h-4 w-1/3" />
      <Skeleton className="mb-2 h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonTableau({ lignes = 5, colonnes = 4 }: { lignes?: number; colonnes?: number }) {
  return (
    <div className="space-y-3 p-4">
      <div className="flex gap-3">
        {Array.from({ length: colonnes }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: lignes }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: colonnes }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}