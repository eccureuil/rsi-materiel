import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenirDashboard } from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import Alert from '@/components/Alert';
import Badge from '@/components/Badge';
import type {
  DashboardStats, DegreUrgence, StatutIncident, StatutMateriel, TypeCategorie,
} from '@/types/api';
import { SkeletonLigne } from '@/components/Skeleton';

const STATUTS_MATERIEL: StatutMateriel[] = ['STOCK', 'SERVICE', 'PANNE', 'MAINTENANCE', 'REFORME'];
const CATEGORIES: TypeCategorie[] = ['BUREAUTIQUE', 'OPERATIONNEL'];
const URGENCES: DegreUrgence[] = ['FAIBLE', 'MOYEN', 'URGENT', 'CRITIQUE'];
const STATUTS_INCIDENT: StatutIncident[] = ['DECLARE', 'PRISE_EN_CHARGE', 'EN_COURS', 'RESOLU', 'CLOTURE', 'REJETE'];

const LIBELLE_STATUT: Record<StatutMateriel, string> = {
  STOCK: 'En stock',
  SERVICE: 'En service',
  PANNE: 'En panne',
  MAINTENANCE: 'En maintenance',
  REFORME: 'Réformé',
};

const LIBELLE_INCIDENT: Record<StatutIncident, string> = {
  DECLARE: 'Déclaré',
  PRISE_EN_CHARGE: 'Pris en charge',
  EN_COURS: 'En cours',
  RESOLU: 'Résolu',
  CLOTURE: 'Clôturé',
  REJETE: 'Rejeté',
};

const LIBELLE_CATEGORIE: Record<TypeCategorie, string> = {
  BUREAUTIQUE: 'Bureautique',
  OPERATIONNEL: 'Opérationnel',
};

const LIBELLE_URGENCE: Record<DegreUrgence, string> = {
  FAIBLE: 'Faible',
  MOYEN: 'Moyen',
  URGENT: 'Urgent',
  CRITIQUE: 'Critique',
};

const COULEUR_STATUT: Record<StatutMateriel, { barre: string; bg: string; texte: string; hex: string }> = {
  STOCK:       { barre: 'bg-slate-400',   bg: 'bg-slate-100',   texte: 'text-slate-700',   hex: '#94a3b8' },
  SERVICE:     { barre: 'bg-emerald-500', bg: 'bg-emerald-100', texte: 'text-emerald-700', hex: '#10b981' },
  PANNE:       { barre: 'bg-red-500',     bg: 'bg-red-100',     texte: 'text-red-700',     hex: '#ef4444' },
  MAINTENANCE: { barre: 'bg-amber-500',   bg: 'bg-amber-100',   texte: 'text-amber-700',   hex: '#f59e0b' },
  REFORME:     { barre: 'bg-slate-600',   bg: 'bg-slate-200',   texte: 'text-slate-600',   hex: '#475569' },
};

const COULEUR_URGENCE: Record<DegreUrgence, { carte: string; puce: string }> = {
  FAIBLE:   { carte: 'bg-slate-50 text-slate-700 ring-slate-200',   puce: 'bg-slate-400' },
  MOYEN:    { carte: 'bg-blue-50 text-blue-700 ring-blue-200',      puce: 'bg-blue-500' },
  URGENT:   { carte: 'bg-amber-50 text-amber-800 ring-amber-200',   puce: 'bg-amber-500' },
  CRITIQUE: { carte: 'bg-red-50 text-red-700 ring-red-200',         puce: 'bg-red-500' },
};

const COULEUR_CATEGORIE: Record<TypeCategorie, { fond: string; texte: string; barre: string }> = {
  BUREAUTIQUE: { fond: 'bg-sky-50', texte: 'text-sky-700', barre: 'bg-sky-500' },
  OPERATIONNEL: { fond: 'bg-violet-50', texte: 'text-violet-700', barre: 'bg-violet-500' },
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
    : '-';

  const totalMateriels = stats?.materiels.total ?? 0;
  const localisations = stats?.materiels.par_localisation ?? [];
  const topLocalisations = [...localisations]
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const maxLocalisation = Math.max(1, ...topLocalisations.map((l) => l.total));
  const totalIncidents = stats
    ? Object.values(stats.incidents.par_statut).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-2xl bg-linear-to-br from-asecna-bleu via-asecna-clair to-[#0b5f9e] px-6 py-5 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-asecna-or/20 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
              Vue d'ensemble
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Tableau de bord</h1>
            <p className="mt-1 text-sm capitalize text-white/70">{dateFormatter.format(new Date())}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80 ring-1 ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Mis à jour à {heureMaj}
            </span>
            <button
              type="button"
              onClick={() => void charger()}
              disabled={chargement}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white ring-1 ring-white/15 transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconeRafraichir className={chargement ? 'animate-spin' : ''} />
              {chargement ? 'Actualisation…' : 'Actualiser'}
            </button>
          </div>
        </div>
      </header>

      {erreur && <Alert type="erreur" message={erreur} onFermer={() => setErreur(null)} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CarteKPI to="/materiels" titre="Matériels" valeur={totalMateriels}
          sousTitre="dans l'inventaire"
          accent="bg-asecna-bleu" doux="bg-asecna-bleu/10" texte="text-asecna-bleu"
          icone={<IconeOrdinateur />} chargement={chargement} />
        <CarteKPI to="/materiels?statut_materiel=SERVICE" titre="En service"
          valeur={stats?.materiels.par_statut.SERVICE ?? 0}
          sousTitre={`sur ${totalMateriels} matériel(s)`}
          accent="bg-emerald-500" doux="bg-emerald-50" texte="text-emerald-600"
          icone={<IconeCoche />} chargement={chargement} />
        <CarteKPI to="/pannes?statut_incident=DECLARE" titre="Incidents ouverts"
          valeur={stats?.incidents.ouverts ?? 0}
          sousTitre="à traiter"
          accent="bg-amber-500" doux="bg-amber-50" texte="text-amber-600"
          icone={<IconeAlerte />} chargement={chargement} />
        <CarteKPI to="/stock?sous_seuil=true" titre="Pièces en alerte"
          valeur={stats?.stock.en_alerte ?? 0}
          sousTitre={`${stats?.stock.en_rupture ?? 0} en rupture`}
          accent="bg-red-500" doux="bg-red-50" texte="text-red-600"
          icone={<IconeBoite />} chargement={chargement} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="card overflow-hidden lg:col-span-2">
          <EnTeteSection
            icone={<IconeRepartition />}
            titre="Répartition des matériels"
            sousTitre="Par statut et par catégorie"
            accent="bg-asecna-bleu/10 text-asecna-bleu"
            action={<Link to="/materiels" className="text-xs font-semibold text-asecna-bleu hover:underline">
              {totalMateriels} au total
            </Link>}
          />
          <div className="p-5">
            {chargement || !stats ? (
              <Squelette lignes={5} />
            ) : totalMateriels === 0 ? (
              <p className="text-sm text-slate-500">Aucun matériel enregistré.</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-[10.5rem_1fr] md:items-center">
                <DonutMateriels parStatut={stats.materiels.par_statut} total={totalMateriels} />
                <div>
                  <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {STATUTS_MATERIEL.map((s) => {
                      const n = stats.materiels.par_statut[s];
                      const pct = Math.round((n / totalMateriels) * 100);
                      const c = COULEUR_STATUT[s];
                      return (
                        <li key={s}>
                          <Link to={`/materiels?statut_materiel=${s}`}
                            className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.barre}`} />
                            <span className="flex-1 text-xs font-medium text-slate-600 group-hover:text-slate-900">
                              {LIBELLE_STATUT[s]}
                            </span>
                            <span className="text-xs font-semibold text-slate-900">{n}</span>
                            <span className={`w-9 text-right text-[11px] font-semibold ${c.texte}`}>{pct}%</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Par catégorie
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {CATEGORIES.map((c) => {
                        const n = stats.materiels.par_categorie[c];
                        const pct = Math.round((n / totalMateriels) * 100);
                        const couleur = COULEUR_CATEGORIE[c];
                        return (
                          <Link key={c} to={`/materiels?type_categorie=${c}`}
                            className={`group rounded-xl p-3 ring-1 ring-slate-100 transition hover:ring-slate-200 ${couleur.fond}`}>
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-[10px] font-semibold uppercase tracking-wide ${couleur.texte}`}>
                                {LIBELLE_CATEGORIE[c]}
                              </p>
                              <span className={`h-1.5 w-1.5 rounded-full ${couleur.barre}`} />
                            </div>
                            <p className="mt-1 text-xl font-bold text-slate-900">{n}</p>
                            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/70">
                              <div className={`h-full rounded-full ${couleur.barre}`}
                                style={{ width: `${pct}%` }} />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="card overflow-hidden">
          <EnTeteSection
            icone={<IconeAlerte />}
            titre="Incidents ouverts"
            sousTitre="Priorités et statuts"
            accent="bg-amber-50 text-amber-600"
            action={<Link to="/pannes?statut_incident=DECLARE" className="text-xs font-semibold text-asecna-bleu hover:underline">
              {stats?.incidents.ouverts ?? 0} ouvert(s)
            </Link>}
          />
          <div className="p-5">
            {chargement || !stats ? (
              <Squelette lignes={4} />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {URGENCES.map((u) => {
                    const c = COULEUR_URGENCE[u];
                    return (
                      <Link key={u} to={`/pannes?degre_urgence=${u}`}
                        className={`rounded-xl p-3 ring-1 transition hover:-translate-y-0.5 ${c.carte}`}>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${c.puce}`} />
                          <p className="text-[10px] font-semibold uppercase tracking-wide">
                            {LIBELLE_URGENCE[u]}
                          </p>
                        </div>
                        <p className="mt-1 text-2xl font-bold">
                          {stats.incidents.ouverts_par_urgence[u]}
                        </p>
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Tous les statuts
                  </p>
                  <ul className="space-y-0.5">
                    {STATUTS_INCIDENT.map((s) => {
                      const n = stats.incidents.par_statut[s];
                      const pct = totalIncidents === 0 ? 0 : Math.round((n / totalIncidents) * 100);
                      return (
                        <li key={s}>
                          <Link to={`/pannes?statut_incident=${s}`}
                            className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                            <span className="flex-1 text-xs text-slate-600 group-hover:text-slate-900">
                              {LIBELLE_INCIDENT[s]}
                            </span>
                            <span className="text-xs font-semibold text-slate-900">{n}</span>
                            <span className="w-8 text-right text-[11px] text-slate-400">{pct}%</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="card overflow-hidden lg:col-span-2">
          <EnTeteSection
            icone={<IconeLocalisation />}
            titre="Matériels par localisation"
            sousTitre="Top 6 des services les plus équipés"
            accent="bg-sky-50 text-sky-600"
            action={<span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
              Top 6
            </span>}
          />
          <div className="p-5">
            {chargement || !stats ? (
              <Squelette lignes={3} />
            ) : topLocalisations.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune localisation enregistrée.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {topLocalisations.map((loc, index) => {
                    const pct = totalMateriels === 0 ? 0 : Math.round((loc.total / totalMateriels) * 100);
                    const largeur = Math.round((loc.total / maxLocalisation) * 100);
                    return (
                      <Link key={loc.id_localisation} to={`/materiels?id_localisation=${loc.id_localisation}`}
                        className="group rounded-xl border border-slate-100 bg-slate-50/40 p-3 transition hover:border-asecna-bleu/20 hover:bg-white hover:shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                                index === 0 ? 'bg-asecna-bleu text-white' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {index + 1}
                              </span>
                              <p className="truncate text-xs font-semibold text-slate-800 group-hover:text-asecna-bleu">
                                {loc.nom_service}
                              </p>
                            </div>
                            <p className="mt-1 truncate text-[10px] text-slate-400">
                              {loc.ville}{loc.code_bureau ? ` · ${loc.code_bureau}` : ''}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-lg font-bold leading-none text-slate-900">{loc.total}</p>
                            <p className="mt-1 text-[10px] font-medium text-slate-400">{pct}%</p>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-asecna-bleu to-asecna-clair transition-all group-hover:from-asecna-or group-hover:to-amber-400"
                            style={{ width: `${largeur}%` }}
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>

                <Link to="/localisations"
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 py-2 text-xs font-semibold text-asecna-bleu transition-colors hover:border-asecna-bleu/30 hover:bg-slate-50">
                  Voir plus de localisations
                  <IconeFleche />
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="card flex flex-col overflow-hidden">
          <EnTeteSection
            icone={<IconeIntervention />}
            titre="Interventions"
            sousTitre="Activité de maintenance"
            accent="bg-indigo-50 text-indigo-600"
          />
          <div className="flex flex-1 flex-col p-5">
            {chargement || !stats ? (
              <Squelette lignes={3} />
            ) : (
              <>
                <ul className="space-y-1">
                  <LigneStatLien to="/interventions?terminee=false" label="En cours"
                    valeur={stats.interventions.en_cours} accent="text-indigo-600" puce="bg-indigo-500" />
                  <LigneStatLien to="/interventions?terminee=true" label="Terminées (30 j)"
                    valeur={stats.interventions.terminees_30_jours} accent="text-emerald-600" puce="bg-emerald-500" />
                  <LigneStatLien to="/interventions?mes_interventions=true&terminee=false"
                    label="Mes interventions en cours"
                    valeur={stats.interventions.mes_en_cours} accent="text-slate-900" puce="bg-asecna-bleu" />
                  <LigneStat
                    label="Durée moyenne"
                    valeur={stats.interventions.duree_moyenne_heures === null
                      ? '-'
                      : `${stats.interventions.duree_moyenne_heures.toFixed(1)} h`}
                    accent="text-slate-900"
                  />
                </ul>
                <div className="mt-auto pt-4">
                  <div className="rounded-xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">Charge actuelle</p>
                    <p className="mt-1 text-xs text-indigo-700">
                      {stats.interventions.en_cours} intervention(s) en cours,
                      dont {stats.interventions.mes_en_cours} assignée(s) à vous.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="card overflow-hidden lg:col-span-2">
          <EnTeteSection
            icone={<IconePrioritaire />}
            titre="Incidents prioritaires"
            sousTitre="Les urgences à traiter en premier"
            accent="bg-red-50 text-red-600"
            action={<Link to="/pannes?degre_urgence=CRITIQUE" className="text-xs font-semibold text-asecna-bleu hover:underline">
              Voir les urgences
            </Link>}
          />
          <div className="p-5">
            {chargement || !stats ? (
              <Squelette lignes={4} />
            ) : stats.incidents.recents_prioritaires.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun incident prioritaire.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {stats.incidents.recents_prioritaires.map((i) => (
                  <li key={i.num_incident}>
                    <Link to={`/pannes?q=${encodeURIComponent(i.num_incident)}`}
                      className="group flex flex-wrap items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-slate-50">
                      <span className={`h-9 w-1 shrink-0 rounded-full ${COULEUR_URGENCE[i.degre_urgence].puce}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{i.num_incident}</p>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500">
                            {i.code_materiel}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {i.marque ?? 'Inconnu'} {i.modele ?? ''} · {i.nom_service} · {i.date_declaration}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge valeur={i.degre_urgence} />
                        <Badge valeur={i.statut_incident} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="card flex flex-col overflow-hidden">
          <EnTeteSection
            icone={<IconeBoite />}
            titre="Stock de pièces"
            sousTitre="Alertes de réapprovisionnement"
            accent="bg-rose-50 text-rose-600"
            action={<Link to="/stock" className="text-xs font-semibold text-asecna-bleu hover:underline">
              Gérer
            </Link>}
          />
          <div className="flex flex-1 flex-col p-5">
            {chargement || !stats ? (
              <Squelette lignes={3} />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Réf." valeur={stats.stock.total_references} accent="text-slate-900" />
                  <MiniStat label="Alerte" valeur={stats.stock.en_alerte} accent="text-amber-600" />
                  <MiniStat label="Rupture" valeur={stats.stock.en_rupture} accent="text-red-600" />
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Pièces à réapprovisionner
                  </p>
                  {stats.stock.pieces_en_alerte.length === 0 ? (
                    <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 ring-1 ring-emerald-100">
                      Toutes les pièces sont au-dessus du seuil.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {stats.stock.pieces_en_alerte.slice(0, 4).map((p) => {
                        const rupture = p.quantite_en_stock === 0;
                        return (
                          <li key={p.ref_piece}>
                            <Link to={`/stock?q=${encodeURIComponent(p.ref_piece)}`}
                              className="block rounded-lg bg-slate-50 p-2.5 ring-1 ring-slate-100 transition hover:bg-slate-100">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-xs font-semibold text-slate-800">{p.ref_piece}</p>
                                <span className={`badge shrink-0 ${rupture
                                  ? 'bg-red-600 text-white'
                                  : 'bg-amber-500 text-white'}`}>
                                  {rupture ? 'Rupture' : 'Sous seuil'}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-[11px] text-slate-500">{p.designation}</p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                Stock : {p.quantite_en_stock} · Seuil : {p.seuil_minimum}
                              </p>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <Link to="/stock?sous_seuil=true"
                  className="mt-auto pt-4 text-xs font-semibold text-asecna-bleu hover:underline">
                  Voir toutes les alertes
                </Link>
              </>
            )}
          </div>
        </section>
      </div>

      <section className="card overflow-hidden">
        <EnTeteSection
          icone={<IconeGraphique />}
          titre="Incidents par mois"
          sousTitre="6 derniers mois"
          accent="bg-slate-100 text-slate-600"
        />
        <div className="p-5">
          {chargement || !stats ? (
            <Squelette lignes={3} />
          ) : stats.incidents.par_mois.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune donnée mensuelle.</p>
          ) : (
            <GraphiqueBarres data={stats.incidents.par_mois} />
          )}
        </div>
      </section>
    </div>
  );
}

// ---------- Sous-composants ----------

interface EnTeteSectionProps {
  icone: React.ReactNode;
  titre: string;
  sousTitre?: string;
  action?: React.ReactNode;
  accent?: string;
}

function EnTeteSection({
  icone, titre, sousTitre, action, accent = 'bg-slate-100 text-slate-600',
}: EnTeteSectionProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
          {icone}
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{titre}</h2>
          {sousTitre && <p className="text-xs text-slate-500">{sousTitre}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}

interface CarteKPIProps {
  to: string;
  titre: string;
  valeur: number;
  sousTitre: string;
  accent: string;
  doux: string;
  texte: string;
  icone: React.ReactNode;
  chargement: boolean;
}

function CarteKPI({
  to, titre, valeur, sousTitre, accent, doux, texte, icone, chargement,
}: CarteKPIProps) {
  return (
    <Link to={to}
      className="card group relative overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <span className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <div className="flex items-start justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${doux} ${texte}`}>
          {icone}
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-300 transition-colors group-hover:bg-slate-100 group-hover:text-slate-500">
          <IconeFleche />
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
        {chargement ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-slate-100 align-middle" /> : valeur}
      </p>
      <p className="mt-0.5 text-sm font-medium text-slate-700">{titre}</p>
      <p className="mt-0.5 text-xs text-slate-400">{sousTitre}</p>
    </Link>
  );
}

function DonutMateriels({ parStatut, total }: { parStatut: Record<StatutMateriel, number>; total: number }) {
  const degrade = construireDegrade(parStatut, total);
  return (
    <div className="relative mx-auto h-40 w-40">
      <div className="absolute inset-0 rounded-full shadow-inner ring-1 ring-slate-100" style={{ background: degrade }} />
      <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-white shadow-sm">
        <span className="text-2xl font-bold text-slate-900">{total}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">matériels</span>
      </div>
    </div>
  );
}

function construireDegrade(parStatut: Record<StatutMateriel, number>, total: number): string {
  if (total === 0) return 'conic-gradient(#e2e8f0 0% 100%)';
  let depart = 0;
  const segments: string[] = [];
  for (const s of STATUTS_MATERIEL) {
    const part = (parStatut[s] / total) * 100;
    if (part <= 0) continue;
    const fin = depart + part;
    segments.push(`${COULEUR_STATUT[s].hex} ${depart}% ${fin}%`);
    depart = fin;
  }
  return segments.length > 0 ? `conic-gradient(${segments.join(', ')})` : 'conic-gradient(#e2e8f0 0% 100%)';
}

function LigneStat({
  label, valeur, accent, puce,
}: { label: string; valeur: string | number; accent: string; puce?: string }) {
  return (
    <li className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-50">
      <span className="flex items-center gap-2 text-sm text-slate-600">
        {puce && <span className={`h-2 w-2 rounded-full ${puce}`} />}
        {label}
      </span>
      <span className={`text-base font-semibold ${accent}`}>{valeur}</span>
    </li>
  );
}

function LigneStatLien({
  to, label, valeur, accent, puce,
}: { to: string; label: string; valeur: string | number; accent: string; puce?: string }) {
  return (
    <li>
      <Link to={to} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-50">
        <span className="flex items-center gap-2 text-sm text-slate-600">
          {puce && <span className={`h-2 w-2 rounded-full ${puce}`} />}
          {label}
        </span>
        <span className={`text-base font-semibold ${accent}`}>{valeur}</span>
      </Link>
    </li>
  );
}

function MiniStat({ label, valeur, accent }: { label: string; valeur: number; accent: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2.5 text-center ring-1 ring-slate-100">
      <p className={`text-lg font-bold leading-tight ${accent}`}>{valeur}</p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function Squelette({ lignes }: { lignes: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lignes }).map((_, idx) => (
        <SkeletonLigne key={idx} largeur="w-full" />
      ))}
    </div>
  );
}

function GraphiqueBarres({ data }: { data: { mois: string; total: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <div className="flex h-48 items-end gap-2 overflow-x-auto pb-1">
      {data.map((d) => {
        const h = Math.round((d.total / max) * 100);
        return (
          <div key={d.mois} className="group flex min-w-10 flex-1 flex-col items-center gap-1"
            title={`${d.mois} : ${d.total}`}>
            <span className="text-[10px] font-semibold text-slate-500">{d.total}</span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-md bg-linear-to-t from-asecna-bleu to-asecna-clair transition-all group-hover:from-asecna-or group-hover:to-amber-400"
                style={{ height: `${h}%`, minHeight: d.total > 0 ? 6 : 2 }}
              />
            </div>
            <span className="text-[10px] text-slate-500">{formaterMois(d.mois)}</span>
          </div>
        );
      })}
    </div>
  );
}

function formaterMois(mois: string): string {
  const [, m] = mois.split('-');
  const date = new Date(2024, Number(m) - 1, 1);
  return new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date);
}

function IconeFleche() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  );
}

function IconeRafraichir({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function IconeRepartition() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}

function IconeIntervention() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function IconePrioritaire() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
    </svg>
  );
}

function IconeGraphique() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <path d="M18 17V9M13 17V5M8 17v-4" />
    </svg>
  );
}

function IconeOrdinateur() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="14" rx="2" /><path d="M2 20h20" />
    </svg>
  );
}

function IconeCoche() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6 9 17l-5-5" />
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

function IconeBoite() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  );
}

function IconeLocalisation() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
