import { useCallback, useEffect, useMemo, useState } from 'react';
import { obtenirDashboard } from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import Alert from '@/components/Alert';
import Badge from '@/components/Badge';
import type {
  DashboardStats, DegreUrgence, StatutIncident, StatutMateriel, TypeCategorie,
} from '@/types/api';

const STATUTS_MATERIEL: StatutMateriel[] = ['STOCK', 'SERVICE', 'PANNE', 'MAINTENANCE', 'REFORME'];
const CATEGORIES: TypeCategorie[] = ['BUREAUTIQUE', 'OPERATIONNEL'];
const URGENCES: DegreUrgence[] = ['FAIBLE', 'MOYEN', 'URGENT', 'CRITIQUE'];
const STATUTS_INCIDENT: StatutIncident[] = ['DECLARE', 'PRISE_EN_CHARGE', 'EN_COURS', 'RESOLU', 'CLOTURE', 'REJETE'];

const COULEUR_STATUT: Record<StatutMateriel, { barre: string; bg: string; texte: string }> = {
  STOCK:       { barre: 'bg-slate-400',   bg: 'bg-slate-100',   texte: 'text-slate-700' },
  SERVICE:     { barre: 'bg-emerald-500', bg: 'bg-emerald-100', texte: 'text-emerald-700' },
  PANNE:       { barre: 'bg-red-500',     bg: 'bg-red-100',     texte: 'text-red-700' },
  MAINTENANCE: { barre: 'bg-amber-500',   bg: 'bg-amber-100',   texte: 'text-amber-700' },
  REFORME:     { barre: 'bg-slate-600',   bg: 'bg-slate-200',   texte: 'text-slate-600' },
};

const COULEUR_URGENCE: Record<DegreUrgence, string> = {
  FAIBLE:   'bg-slate-100 text-slate-700 ring-slate-300',
  MOYEN:    'bg-blue-100 text-blue-700 ring-blue-300',
  URGENT:   'bg-amber-100 text-amber-800 ring-amber-300',
  CRITIQUE: 'bg-red-100 text-red-800 ring-red-300',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true); setErreur(null);
    try {
      const data = await obtenirDashboard();
      setStats(data);
    } catch (err) {
      setErreur(extraireMessageErreur(err));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }),
    [],
  );

  const heureMaj = stats?.genere_le
    ? new Date(stats.genere_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tableau de bord</h1>
          <p className="mt-1 text-sm capitalize text-slate-500">{dateFormatter.format(new Date())}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>Dernière mise à jour : {heureMaj}</span>
          <button className="btn-secondary" onClick={() => void charger()} disabled={chargement}>
            {chargement ? 'Actualisation…' : 'Rafraîchir'}
          </button>
        </div>
      </div>

      {erreur && <Alert type="erreur" message={erreur} onFermer={() => setErreur(null)} />}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CarteKPI titre="Matériels" valeur={stats?.materiels.total ?? 0}
          sousTitre="dans l’inventaire"
          couleur="from-asecna-bleu to-asecna-clair"
          icone={<IconeOrdinateur />} chargement={chargement} />
        <CarteKPI titre="Incidents ouverts" valeur={stats?.incidents.ouverts ?? 0}
          sousTitre="à traiter"
          couleur="from-amber-500 to-amber-400"
          icone={<IconeAlerte />} chargement={chargement} />
        <CarteKPI titre="Interventions en cours" valeur={stats?.interventions.en_cours ?? 0}
          sousTitre={`${stats?.interventions.mes_en_cours ?? 0} miennes`}
          couleur="from-indigo-600 to-indigo-500"
          icone={<IconeOutil />} chargement={chargement} />
        <CarteKPI titre="Pièces en alerte" valeur={stats?.stock.en_alerte ?? 0}
          sousTitre={`${stats?.stock.en_rupture ?? 0} en rupture`}
          couleur="from-red-600 to-red-500"
          icone={<IconeBoite />} chargement={chargement} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Répartition matériels */}
        <section className="card p-5 lg:col-span-2">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Répartition des matériels</h2>
            <span className="text-sm text-slate-500">{stats?.materiels.total ?? 0} total</span>
          </header>

          {chargement || !stats ? (
            <Squelette lignes={5} />
          ) : stats.materiels.total === 0 ? (
            <p className="text-sm text-slate-500">Aucun matériel enregistré.</p>
          ) : (
            <>
              <div className="mb-5 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                {STATUTS_MATERIEL.map((s) => {
                  const pct = (stats.materiels.par_statut[s] / stats.materiels.total) * 100;
                  if (pct === 0) return null;
                  return (
                    <div key={s} className={`${COULEUR_STATUT[s].barre} transition-all`}
                      style={{ width: `${pct}%` }}
                      title={`${s} : ${stats.materiels.par_statut[s]}`} />
                  );
                })}
              </div>

              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {STATUTS_MATERIEL.map((s) => {
                  const n = stats.materiels.par_statut[s];
                  const pct = stats.materiels.total === 0 ? 0 : Math.round((n / stats.materiels.total) * 100);
                  const c = COULEUR_STATUT[s];
                  return (
                    <li key={s} className="flex items-center gap-3 rounded-md p-2 hover:bg-slate-50">
                      <span className={`h-3 w-3 rounded-full ${c.barre}`} />
                      <span className="flex-1 text-sm font-medium text-slate-700">{s}</span>
                      <span className="text-sm text-slate-500">{n}</span>
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${c.bg} ${c.texte}`}>
                        {pct}%
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Par catégorie
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIES.map((c) => (
                    <div key={c} className="rounded-md bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">{c}</p>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {stats.materiels.par_categorie[c]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>

        {/* Urgences + statuts incidents */}
        <section className="card p-5">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Incidents ouverts</h2>
            <span className="text-sm text-slate-500">{stats?.incidents.ouverts ?? 0}</span>
          </header>
          {chargement || !stats ? (
            <Squelette lignes={4} />
          ) : (
            <>
              <ul className="space-y-2">
                {URGENCES.map((u) => (
                  <li key={u} className={`flex items-center justify-between rounded-md px-3 py-2 ring-1 ${COULEUR_URGENCE[u]}`}>
                    <span className="text-sm font-medium">{u}</span>
                    <span className="text-lg font-bold">{stats.incidents.ouverts_par_urgence[u]}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tous statuts
                </p>
                <ul className="space-y-1 text-sm">
                  {STATUTS_INCIDENT.map((s) => (
                    <li key={s} className="flex items-center justify-between py-1">
                      <span className="text-slate-600">{s.replace(/_/g, ' ')}</span>
                      <span className="font-semibold text-slate-900">{stats.incidents.par_statut[s]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Évolution mensuelle */}
      <section className="card p-5">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Incidents par mois</h2>
          <span className="text-sm text-slate-500">12 derniers mois</span>
        </header>
        {chargement || !stats ? (
          <Squelette lignes={3} />
        ) : stats.incidents.par_mois.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune donnée mensuelle.</p>
        ) : (
          <GraphiqueBarres data={stats.incidents.par_mois} />
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Interventions */}
        <section className="card p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Interventions</h2>
          {chargement || !stats ? (
            <Squelette lignes={3} />
          ) : (
            <ul className="space-y-3 text-sm">
              <LigneStat label="En cours" valeur={stats.interventions.en_cours} accent="text-indigo-600" />
              <LigneStat label="Terminées (30 j)" valeur={stats.interventions.terminees_30_jours} accent="text-emerald-600" />
              <LigneStat label="Mes interventions en cours" valeur={stats.interventions.mes_en_cours} accent="text-slate-900" />
              <LigneStat
                label="Durée moyenne"
                valeur={stats.interventions.duree_moyenne_heures === null
                  ? '—'
                  : `${stats.interventions.duree_moyenne_heures.toFixed(1)} h`}
                accent="text-slate-900"
              />
            </ul>
          )}
        </section>

        {/* Incidents prioritaires */}
        <section className="card p-5 lg:col-span-2">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Incidents prioritaires</h2>
            <span className="text-sm text-slate-500">{stats?.incidents.recents_prioritaires.length ?? 0}</span>
          </header>
          {chargement || !stats ? (
            <Squelette lignes={4} />
          ) : stats.incidents.recents_prioritaires.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun incident prioritaire.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.incidents.recents_prioritaires.map((i) => (
                <li key={i.num_incident} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {i.num_incident} — {i.code_materiel}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {i.marque ?? 'INCONNU'} {i.modele ?? ''} · {i.nom_service} · {i.date_declaration}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge valeur={i.degre_urgence} />
                    <Badge valeur={i.statut_incident} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Stock */}
      <section className="card p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Stock de pièces</h2>
          <div className="flex gap-4 text-sm">
            <span className="text-slate-500">Références : <b className="text-slate-900">{stats?.stock.total_references ?? 0}</b></span>
            <span className="text-amber-700">En alerte : <b>{stats?.stock.en_alerte ?? 0}</b></span>
            <span className="text-red-700">En rupture : <b>{stats?.stock.en_rupture ?? 0}</b></span>
          </div>
        </header>

        {chargement || !stats ? (
          <Squelette lignes={3} />
        ) : stats.stock.pieces_en_alerte.length === 0 ? (
          <p className="text-sm text-slate-500">Toutes les pièces sont au-dessus du seuil.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.stock.pieces_en_alerte.map((p) => {
              const rupture = p.quantite_en_stock === 0;
              return (
                <div key={p.ref_piece}
                  className={`rounded-md p-3 ring-1 ${
                    rupture ? 'bg-red-50 ring-red-200' : 'bg-amber-50 ring-amber-200'
                  }`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{p.ref_piece}</p>
                    <span className={`badge ${rupture ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
                      {rupture ? 'Rupture' : 'Sous seuil'}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-600">{p.designation}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Stock : {p.quantite_en_stock} · Seuil : {p.seuil_minimum}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------- Sous-composants ----------

interface CarteKPIProps {
  titre: string;
  valeur: number;
  sousTitre: string;
  couleur: string;
  icone: React.ReactNode;
  chargement: boolean;
}

function CarteKPI({ titre, valeur, sousTitre, couleur, icone, chargement }: CarteKPIProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${couleur} p-5 text-white shadow-sm`}>
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5" />
      <div className="relative">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium opacity-90">
          {icone}<span>{titre}</span>
        </div>
        <p className="text-3xl font-bold leading-tight">
          {chargement ? <span className="opacity-50">—</span> : valeur}
        </p>
        <p className="mt-1 text-xs opacity-80">{sousTitre}</p>
      </div>
    </div>
  );
}

function LigneStat({ label, valeur, accent }: { label: string; valeur: string | number; accent: string }) {
  return (
    <li className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <span className="text-slate-600">{label}</span>
      <span className={`text-base font-semibold ${accent}`}>{valeur}</span>
    </li>
  );
}

function Squelette({ lignes }: { lignes: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lignes }).map((_, idx) => (
        <div key={idx} className="h-8 animate-pulse rounded-md bg-slate-100" />
      ))}
    </div>
  );
}

function GraphiqueBarres({ data }: { data: { mois: string; total: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <div className="flex h-40 items-end gap-2 overflow-x-auto">
      {data.map((d) => {
        const h = Math.round((d.total / max) * 100);
        return (
          <div key={d.mois} className="flex min-w-[36px] flex-1 flex-col items-center gap-1"
            title={`${d.mois} : ${d.total}`}>
            <span className="text-[10px] font-medium text-slate-500">{d.total}</span>
            <div className="flex w-full flex-1 items-end">
              <div className="w-full rounded-t bg-asecna-bleu/80 transition-all"
                style={{ height: `${h}%`, minHeight: d.total > 0 ? 4 : 0 }} />
            </div>
            <span className="text-[10px] text-slate-500">{d.mois}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Icônes ----------

function IconeOrdinateur() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="14" rx="2" /><path d="M2 20h20" />
    </svg>
  );
}
function IconeAlerte() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  );
}
function IconeOutil() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a4 4 0 1 0 5 5l-9.4 9.4a2 2 0 1 1-2.8-2.8z" />
    </svg>
  );
}
function IconeBoite() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  );
}