import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { obtenirHistoriqueMateriel } from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import Badge from '@/components/Badge';
import TimelineEvenement from '@/components/TimelineEvenement';
import EmptyState, { IconesEmpty } from '@/components/EmptyState';
import { SkeletonLigne } from '@/components/Skeleton';
import { Input } from '@/components/FormControls';
import { TYPES_EVENEMENT, type HistoriqueMateriel, type TypeEvenement } from '@/types/historique';

const LIBELLE_TYPE: Record<TypeEvenement, string> = {
  ACQUISITION: 'Acquisition',
  MOUVEMENT: 'Mouvement',
  INCIDENT: 'Panne',
  INTERVENTION_DEBUT: 'Intervention',
  PIECE_UTILISEE: 'Piece',
  INTERVENTION_FIN: 'Fin',
};

export default function HistoriqueMaterielPage() {
  const { code } = useParams<{ code: string }>();

  const [historique, setHistorique] = useState<HistoriqueMateriel | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [typesActifs, setTypesActifs] = useState<Set<TypeEvenement>>(new Set());
  const [du, setDu] = useState('');
  const [au, setAu] = useState('');

  const charger = useCallback(async () => {
    if (!code) return;
    setChargement(true);
    setErreur(null);
    try {
      const data = await obtenirHistoriqueMateriel(code, {
        types: typesActifs.size > 0 ? Array.from(typesActifs) : undefined,
        du: du || undefined,
        au: au || undefined,
        ordre: 'desc',
      });
      setHistorique(data);
    } catch (err) {
      setErreur(extraireMessageErreur(err));
    } finally {
      setChargement(false);
    }
  }, [code, typesActifs, du, au]);

  useEffect(() => { void charger(); }, [charger]);

  const basculerType = (t: TypeEvenement) => {
    setTypesActifs((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const reinitialiser = () => {
    setTypesActifs(new Set());
    setDu('');
    setAu('');
  };

  const filtresActifs = typesActifs.size > 0 || du !== '' || au !== '';
  const m = historique?.materiel;
  const s = historique?.synthese;

  const contenu = useMemo(() => {
    if (chargement) {
      return (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonLigne key={i} />)}
        </div>
      );
    }
    if (erreur) {
      return <p className="text-sm text-red-600">{erreur}</p>;
    }
    if (!historique || historique.evenements.length === 0) {
      return (
        <EmptyState
          icone={<IconesEmpty.Boite />}
          titre={filtresActifs ? 'Aucun evenement ne correspond aux filtres' : 'Aucun evenement enregistre'}
          description={
            filtresActifs
              ? 'Essayez d\'elargir la periode ou de retirer un type d\'evenement.'
              : 'L\'historique de ce materiel est vide pour le moment.'
          }
          ctaLabel={filtresActifs ? 'Reinitialiser les filtres' : undefined}
          ctaOnClick={filtresActifs ? reinitialiser : undefined}
          filtreActif={filtresActifs}
        />
      );
    }
    return (
      <ol className="relative space-y-3 border-l border-slate-200 pl-4">
        {historique.evenements.map((e, idx) => (
          <TimelineEvenement key={`${e.type_evenement}-${e.reference ?? idx}-${e.date_evenement}`} evenement={e} />
        ))}
      </ol>
    );
  }, [chargement, erreur, historique, filtresActifs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/materiels" className="btn-secondary">Retour</Link>
          <h1 className="text-2xl font-semibold text-slate-900">
            Historique {code ? `- ${code}` : ''}
          </h1>
        </div>
        {historique?.tronque && (
          <span className="text-xs text-amber-700">
            Historique tronque a {historique.evenements.length} evenements (sur {historique.total})
          </span>
        )}
      </div>

      {m && (
        <div className="card p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-slate-900">{m.marque} {m.modele}</p>
            <Badge valeur={m.statut_materiel} />
            <span className="text-sm text-slate-500">{m.type_categorie}</span>
          </div>
          <p className="text-sm text-slate-600">
            N° serie : {m.num_serie ?? '-'} - Localisation : {m.nom_service ?? '-'}
            {m.code_bureau ? ` (${m.code_bureau})` : ''} - {m.ville ?? '-'}
          </p>
        </div>
      )}

      {s && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <CarteSynth label="Mouvements" valeur={s.nb_mouvements} />
          <CarteSynth label="Pannes" valeur={s.nb_incidents} accent="text-amber-700" />
          <CarteSynth label="Pannes ouvertes" valeur={s.nb_incidents_ouverts} accent={s.nb_incidents_ouverts > 0 ? 'text-red-700' : undefined} />
          <CarteSynth label="Interventions" valeur={s.nb_interventions} accent="text-indigo-700" />
          <CarteSynth label="Pieces utilisees" valeur={s.nb_pieces_utilisees} accent="text-purple-700" />
          <CarteSynth
            label="Duree moyenne"
            valeur={s.duree_moyenne_reparation_heures === null ? '-' : `${s.duree_moyenne_reparation_heures} h`}
          />
          <CarteSynth
            label="Indispo totale"
            valeur={s.indisponibilite_totale_heures === null ? '-' : `${s.indisponibilite_totale_heures} h`}
          />
        </div>
      )}

      {s?.incident_ouvert && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
          Un incident est actuellement ouvert : <b>{s.incident_ouvert}</b>
          <Link to={`/pannes?q=${encodeURIComponent(s.incident_ouvert)}`} className="ml-2 underline">
            Voir
          </Link>
        </div>
      )}

      <div className="card p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Types d'evenement</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {TYPES_EVENEMENT.map((t) => {
            const actif = typesActifs.has(t);
            return (
              <button
                key={t}
                onClick={() => basculerType(t)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  actif ? 'bg-asecna-bleu text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {LIBELLE_TYPE[t]}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Du</label>
            <Input type="date" value={du} onChange={(e) => setDu(e.target.value)} className="max-w-xs" />
          </div>
          <div>
            <label className="label">Au</label>
            <Input type="date" value={au} onChange={(e) => setAu(e.target.value)} className="max-w-xs" />
          </div>
          {filtresActifs && (
            <button className="btn-secondary" onClick={reinitialiser}>Reinitialiser</button>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Fil de vie</h2>
        {contenu}
      </div>
    </div>
  );
}

function CarteSynth({ label, valeur, accent }: { label: string; valeur: string | number; accent?: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${accent ?? 'text-slate-900'}`}>{valeur}</p>
    </div>
  );
}