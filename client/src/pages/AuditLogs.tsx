import { useCallback, useEffect, useMemo, useState } from 'react';
import { listerAudit } from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useToast } from '@/components/Toast';
import { useDebounce } from '@/hooks/useDebounce';
import Pagination from '@/components/Pagination';
import { Input } from '@/components/FormControls';
import type { AuditLog } from '@/types/api';
import { SkeletonTableau } from '@/components/Skeleton';
import EmptyState, { IconesEmpty } from '@/components/EmptyState';

const LIMITE_AFFICHAGE_DETAILS = 200;

export default function AuditLogs() {
  const toast = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chargement, setChargement] = useState(false);

  const [filtreMatricule, setFiltreMatricule] = useState('');
  const [filtreAction, setFiltreAction] = useState('');
  const [logDetail, setLogDetail] = useState<AuditLog | null>(null);

  // Debounce : on ne recalcule le filtre qu'apres 300 ms d'inactivite.
  const filtreMatriculeDebounce = useDebounce(filtreMatricule, 300);
  const filtreActionDebounce = useDebounce(filtreAction, 300);

  // Chargement : on demande la page au serveur SANS filtre q,
  // le filtrage partiel se fait localement.
  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await listerAudit({ page, limit: 50 });
      setLogs(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      toast.erreur('Chargement impossible', extraireMessageErreur(err));
    } finally {
      setChargement(false);
    }
  }, [page, toast]);

  useEffect(() => { void charger(); }, [charger]);

  // Filtrage local, insensible a la casse, partiel sur chaque frappe.
  const logsFiltres = useMemo(() => {
    const m = filtreMatriculeDebounce.trim().toLowerCase();
    const a = filtreActionDebounce.trim().toLowerCase();
    if (!m && !a) return logs;
    return logs.filter((log) => {
      const okMatricule = !m || log.matricule_operateur.toLowerCase().includes(m);
      const okAction = !a || log.action_effectuee.toLowerCase().includes(a);
      return okMatricule && okAction;
    });
  }, [logs, filtreMatriculeDebounce, filtreActionDebounce]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Journal d'audit</h1>
        <p className="text-sm text-slate-500">
          {logsFiltres.length} / {logs.length} entree(s) affichee(s) - {total} au total
        </p>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <Input
          placeholder="Matricule operateur (ex. ADM)..."
          value={filtreMatricule}
          onChange={(e) => setFiltreMatricule(e.target.value)}
          className="max-w-xs"
        />
        <Input
          placeholder="Action (ex. CREATION)..."
          value={filtreAction}
          onChange={(e) => setFiltreAction(e.target.value)}
          className="max-w-sm"
        />
        {(filtreMatricule || filtreAction) && (
          <button
            className="btn-secondary"
            onClick={() => { setFiltreMatricule(''); setFiltreAction(''); }}
          >
            Effacer
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {chargement ? (
          <SkeletonTableau lignes={8} colonnes={5} />
        ) : logs.length === 0 ? (
          <EmptyState
            icone={<IconesEmpty.Boite />}
            titre="Aucune entree d'audit"
            description="Les actions des utilisateurs commenceront a apparaitre ici."
          />
        ) : logsFiltres.length === 0 ? (
          <EmptyState
            icone={<IconesEmpty.Recherche />}
            titre="Aucune entree ne correspond aux filtres"
            description="Aucun resultat sur cette page. Essayez un autre matricule, une autre action, ou changez de page."
            ctaLabel="Reinitialiser les filtres"
            ctaOnClick={() => { setFiltreMatricule(''); setFiltreAction(''); }}
            filtreActif
          />
        ) : (
          <p className="p-4 text-sm text-slate-500">
            Aucune entree ne correspond aux filtres sur cette page.
          </p>
        )}
        {!chargement && logsFiltres.length > 0 && (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Date / heure', 'Operateur', 'Action', 'Details', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {logsFiltres.map((log) => (
                <tr key={log.id_log} className="align-top hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{log.date_heure}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{log.prenom} {log.nom}</p>
                    <p className="text-xs text-slate-500">{log.matricule_operateur}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge bg-slate-100 text-slate-800">{log.action_effectuee}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">
                    {log.details_operation.length > LIMITE_AFFICHAGE_DETAILS
                      ? `${log.details_operation.slice(0, LIMITE_AFFICHAGE_DETAILS)}...`
                      : log.details_operation}
                  </td>
                  <td className="px-4 py-3">
                    <button className="btn-secondary" onClick={() => setLogDetail(log)}>Voir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {logDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setLogDetail(null)}>
          <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Detail de l'entree #{logDetail.id_log}</h2>
              <button className="text-slate-500 hover:text-slate-800" onClick={() => setLogDetail(null)}
                aria-label="Fermer">X</button>
            </div>
            <div className="space-y-3 px-6 py-4 text-sm">
              <p><span className="font-semibold">Date :</span> {logDetail.date_heure}</p>
              <p><span className="font-semibold">Operateur :</span> {logDetail.prenom} {logDetail.nom} ({logDetail.matricule_operateur})</p>
              <p><span className="font-semibold">Action :</span> {logDetail.action_effectuee}</p>
              <div>
                <p className="font-semibold">Details de l'operation :</p>
                <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-slate-50 p-3 text-xs text-slate-700">
{logDetail.details_operation}
                </pre>
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-200 px-6 py-3">
              <button className="btn-secondary" onClick={() => setLogDetail(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}