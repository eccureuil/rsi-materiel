import { useCallback, useEffect, useState } from 'react';
import { listerAudit } from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useToast } from '@/components/Toast';
import Pagination from '@/components/Pagination';
import { Input } from '@/components/FormControls';
import type { AuditLog } from '@/types/api';

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

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await listerAudit({
        matricule: filtreMatricule.trim() || undefined,
        action: filtreAction.trim() || undefined,
        page, limit: 50,
      });
      setLogs(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      toast.erreur('Chargement impossible', extraireMessageErreur(err));
    } finally {
      setChargement(false);
    }
  }, [filtreMatricule, filtreAction, page, toast]);

  useEffect(() => { void charger(); }, [charger]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Journal d’audit</h1>
        <p className="text-sm text-slate-500">{total} entrée(s)</p>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <Input
          placeholder="Matricule opérateur…"
          value={filtreMatricule}
          onChange={(e) => { setFiltreMatricule(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <Input
          placeholder="Action (ex. CREATION_MATERIELS)…"
          value={filtreAction}
          onChange={(e) => { setFiltreAction(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
      </div>

      <div className="card overflow-hidden">
        {chargement && <p className="p-4 text-sm text-slate-500">Chargement…</p>}
        {!chargement && logs.length === 0 && (
          <p className="p-4 text-sm text-slate-500">Aucune entrée d’audit.</p>
        )}
        {!chargement && logs.length > 0 && (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Date / heure', 'Opérateur', 'Action', 'Détails', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {logs.map((log) => (
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
                      ? `${log.details_operation.slice(0, LIMITE_AFFICHAGE_DETAILS)}…`
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
              <h2 className="text-lg font-semibold text-slate-900">Détail de l’entrée #{logDetail.id_log}</h2>
              <button className="text-slate-500 hover:text-slate-800" onClick={() => setLogDetail(null)}
                aria-label="Fermer">✕</button>
            </div>
            <div className="space-y-3 px-6 py-4 text-sm">
              <p><span className="font-semibold">Date :</span> {logDetail.date_heure}</p>
              <p><span className="font-semibold">Opérateur :</span> {logDetail.prenom} {logDetail.nom} ({logDetail.matricule_operateur})</p>
              <p><span className="font-semibold">Action :</span> {logDetail.action_effectuee}</p>
              <div>
                <p className="font-semibold">Détails de l’opération :</p>
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