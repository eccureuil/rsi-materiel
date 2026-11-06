export type TypeAlerte = 'erreur' | 'succes' | 'info';

interface Props { type: TypeAlerte; message: string; onFermer?: () => void; }

const styles: Record<TypeAlerte, string> = {
  erreur: 'bg-red-50 text-red-800 ring-red-200',
  succes: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  info: 'bg-blue-50 text-blue-800 ring-blue-200',
};

export default function Alert({ type, message, onFermer }: Props) {
  return (
    <div className={`flex items-start justify-between gap-3 rounded-md px-4 py-3 text-sm ring-1 ${styles[type]}`}>
      <span>{message}</span>
      {onFermer && <button onClick={onFermer} className="opacity-70 hover:opacity-100" aria-label="Fermer">✕</button>}
    </div>
  );
}