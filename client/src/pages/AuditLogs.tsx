import { useCallback, useEffect, useMemo, useState } from 'react';
import { listerAudit } from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useToast } from '@/components/Toast';
import { useDebounce } from '@/hooks/useDebounce';
import Pagination from '@/components/Pagination';
import { ChampRecherche, ResumeFiltres, type FiltreActif } from '@/components/FormControls';
import type { AuditLog } from '@/types/api';
import { SkeletonTableau } from '@/components/Skeleton';
import { BoutonIcone } from '@/components/BoutonIcone';
import EmptyState, { IconesEmpty } from '@/components/EmptyState';
import { EnteteTableau, Tableau } from '@/components/Tableau';

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

  const reinitialiserFiltres = () => {
    setFiltreMatricule('');
    setFiltreAction('');
  };

  const filtresResume: FiltreActif[] = [
    ...(filtreMatricule.trim() ? [{
      label: `Matricule : ${filtreMatricule.trim()}`,
      onSupprimer: () => setFiltreMatricule(''),
    }] : []),
    ...(filtreAction.trim() ? [{
      label: `Action : ${filtreAction.trim()}`,
      onSupprimer: () => setFiltreAction(''),
    }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Journal d'audit</h1>
        <p className="text-sm text-slate-500">
          {logsFiltres.length} / {logs.length} entree(s) affichee(s) - {total} au total
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <ChampRecherche
            label="Matricule opérateur"
            value={filtreMatricule}
            onChange={setFiltreMatricule}
            placeholder="Ex. ADM001…"
            enveloppeClassName="w-full sm:max-w-xs"
          />
          <ChampRecherche
            label="Action"
            value={filtreAction}
            onChange={setFiltreAction}
            placeholder="Ex. CREATION…"
            enveloppeClassName="w-full sm:max-w-sm"
          />
        </div>
        <ResumeFiltres
          filtres={filtresResume}
          total={logsFiltres.length}
          chargement={chargement}
          onToutEffacer={reinitialiserFiltres}
          unite="entrée(s)"
          libelleChargement="Recherche…"
        />
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
            ctaOnClick={reinitialiserFiltres}
            filtreActif
          />
        ) : null}
        {!chargement && logsFiltres.length > 0 && (
          <Tableau>
            <EnteteTableau colonnes={['Date / heure', 'Operateur', 'Action', 'Details', '']} />
            <tbody>
              {logsFiltres.map((log) => (
                <tr key={log.id_log}>
                  <td className="whitespace-nowrap text-xs text-slate-600">{log.date_heure}</td>
                  <td>
                    <p className="font-medium text-slate-900">{log.prenom} {log.nom}</p>
                    <p className="text-xs text-slate-500">{log.matricule_operateur}</p>
                  </td>
                  <td>
                    <span className="badge bg-slate-100 text-slate-800">{log.action_effectuee}</span>
                  </td>
                  <td className="text-xs text-slate-700">
                    {log.details_operation.length > LIMITE_AFFICHAGE_DETAILS
                      ? `${log.details_operation.slice(0, LIMITE_AFFICHAGE_DETAILS)}...`
                      : log.details_operation}
                  </td>
                  <td>
                    <BoutonIcone libelle="Voir le détail" icone="voir" onClick={() => setLogDetail(log)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
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
                <p className="mt-2 max-h-96 overflow-auto whitespace-pre-line rounded-md bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                  {logDetail.details_operation}
                </p>
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