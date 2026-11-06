interface Props { page: number; totalPages: number; onChange: (p: number) => void; }

export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 text-sm text-slate-600">
      <p>Page {page} sur {totalPages}</p>
      <div className="flex gap-2">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1} className="btn-secondary">Précédent</button>
        <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="btn-secondary">Suivant</button>
      </div>
    </div>
  );
}