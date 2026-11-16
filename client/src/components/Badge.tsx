const libelles: Record<string, string> = {
  STOCK: 'En stock',
  SERVICE: 'En service',
  PANNE: 'En panne',
  MAINTENANCE: 'En maintenance',
  REFORME: 'Réformé',
};

const couleurs: Record<string, string> = {
  STOCK: 'bg-slate-100 text-slate-700',
  SERVICE: 'bg-emerald-100 text-emerald-800',
  PANNE: 'bg-red-100 text-red-800',
  MAINTENANCE: 'bg-amber-100 text-amber-800',
  REFORME: 'bg-slate-200 text-slate-600',
  DECLARE: 'bg-blue-100 text-blue-800',
  PRISE_EN_CHARGE: 'bg-indigo-100 text-indigo-800',
  EN_COURS: 'bg-amber-100 text-amber-800',
  RESOLU: 'bg-emerald-100 text-emerald-800',
  CLOTURE: 'bg-slate-200 text-slate-600',
  REJETE: 'bg-red-100 text-red-800',
  FAIBLE: 'bg-slate-100 text-slate-700',
  MOYEN: 'bg-blue-100 text-blue-800',
  URGENT: 'bg-amber-100 text-amber-800',
  CRITIQUE: 'bg-red-100 text-red-800',
  CORRECTIVE: 'bg-indigo-100 text-indigo-800',
  PREVENTIVE: 'bg-emerald-100 text-emerald-800',
};

export default function Badge({ valeur }: { valeur: string }) {
  return (
    <span className={`badge ${couleurs[valeur] ?? 'bg-slate-100 text-slate-700'}`}>
      {libelles[valeur] ?? valeur.replace(/_/g, ' ')}
    </span>
  );
}