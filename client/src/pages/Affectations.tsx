import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  creerAffectation, genererBonAffectation, listerAffectations, listerLocalisations,
  obtenirMateriel, urlPdfBon, urlPdfBonNum,
} from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/Toast';
import BoutonCreation from '@/components/BoutonCreation';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import Badge from '@/components/Badge';
import { BoutonIcone, LienExterneIcone } from '@/components/BoutonIcone';
import EmptyState, { IconesEmpty } from '@/components/EmptyState';
import SelecteurMateriel from '@/components/SelecteurMateriel';
import { SkeletonTableau } from '@/components/Skeleton';
import { EnteteTableau, Tableau } from '@/components/Tableau';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Champ, ChampRecherche, IconeCategorie, Input, ResumeFiltres, SelectFiltre,
  Textarea, type FiltreActif,
} from '@/components/FormControls';
import {
  TYPES_MOUVEMENT,
  type Affectation, type BonDecharge, type Localisation,
  type Materiel, type TypeMouvement,
} from '@/types/api';

interface Formulaire {
  type_mouvement: TypeMouvement;
  id_localisation: string;
  agent_beneficiaire: string;
  motif_mouvement: string;
  generer_bon: boolean;
}
const FORM_VIDE: Formulaire = {
  type_mouvement: 'AFFECTATION',
  id_localisation: '',
  agent_beneficiaire: '',
  motif_mouvement: '',
  generer_bon: false,
};

const LIBELLE_TYPE: Record<TypeMouvement, string> = {
  AFFECTATION: 'Affectation',
  MUTATION: 'Mutation',
  RESTITUTION: 'Restitution',
};

function formatDateSansHeure(valeur: string): string {
  const [date] = valeur.split(' ');
  const [annee, mois, jour] = date.split('-');
  return annee && mois && jour ? `${jour}-${mois}-${annee}` : valeur;
}

function typeMouvementPourMateriel(materiel: Materiel | null, actuel: TypeMouvement): TypeMouvement {
  if (!materiel) return 'AFFECTATION';
  if (materiel.statut_materiel === 'STOCK') return 'AFFECTATION';
  if (materiel.statut_materiel === 'SERVICE') {
    return actuel === 'RESTITUTION' ? 'RESTITUTION' : 'MUTATION';
  }
  return actuel;
}

export default function Affectations() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chargement, setChargement] = useState(false);

  const [filtreCode, setFiltreCode] = useState('');
  const [filtreType, setFiltreType] = useState<'' | TypeMouvement>('');
  const filtreCodeDebounce = useDebounce(filtreCode, 300);

  const [modalOuvert, setModalOuvert] = useState(false);
  const [form, setForm] = useState<Formulaire>(FORM_VIDE);
  const [envoi, setEnvoi] = useState(false);

  const [materielSelectionne, setMaterielSelectionne] = useState<Materiel | null>(null);
  const [erreurMateriel, setErreurMateriel] = useState('');
  const [localisations, setLocalisations] = useState<Localisation[]>([]);

  const [bonGenere, setBonGenere] = useState<BonDecharge | null>(null);
  const [generationId, setGenerationId] = useState<number | null>(null);

  const statutMouvable = materielSelectionne !== null
    && (materielSelectionne.statut_materiel === 'STOCK' || materielSelectionne.statut_materiel === 'SERVICE');

  const typesMouvementDisponibles: TypeMouvement[] = !materielSelectionne
    ? TYPES_MOUVEMENT
    : materielSelectionne.statut_materiel === 'STOCK'
      ? ['AFFECTATION']
      : materielSelectionne.statut_materiel === 'SERVICE'
        ? ['MUTATION', 'RESTITUTION']
        : [];

  const messageStatut = materielSelectionne && !statutMouvable
    ? `Le matériel est en ${materielSelectionne.statut_materiel} : aucun mouvement n’est possible.`
    : '';
  const erreurMaterielAffichee = erreurMateriel || messageStatut;

  const localisationsDisponibles = useMemo(() => {
    if (!materielSelectionne || form.type_mouvement === 'RESTITUTION') return localisations;
    return localisations.filter((l) => l.id_localisation !== materielSelectionne.id_localisation);
  }, [localisations, materielSelectionne, form.type_mouvement]);

  const destinationInvalide = materielSelectionne !== null
    && form.type_mouvement !== 'RESTITUTION'
    && form.id_localisation !== ''
    && Number(form.id_localisation) === materielSelectionne.id_localisation;

  const choisirMateriel = (materiel: Materiel | null) => {
    setMaterielSelectionne(materiel);
    setErreurMateriel('');
    setForm((precedent) => ({
      ...precedent,
      type_mouvement: typeMouvementPourMateriel(materiel, precedent.type_mouvement),
      id_localisation: '',
    }));
  };

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await listerAffectations({
        code_materiel: filtreCodeDebounce.trim() || undefined,
        type_mouvement: filtreType || undefined,
        page, limit: 20,
      });
      setAffectations(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      toast.erreur('Chargement impossible', extraireMessageErreur(err));
    } finally {
      setChargement(false);
    }
  }, [filtreCodeDebounce, filtreType, page, toast]);

  useEffect(() => { void charger(); }, [charger]);

  const ouvrirCreation = useCallback(async (materielInitial: Materiel | null = null) => {
    setForm({
      ...FORM_VIDE,
      type_mouvement: typeMouvementPourMateriel(materielInitial, FORM_VIDE.type_mouvement),
    });
    setMaterielSelectionne(materielInitial);
    setErreurMateriel('');
    setModalOuvert(true);
    try {
      const l = await listerLocalisations();
      setLocalisations(l);
    } catch (err) {
      toast.erreur('References indisponibles', extraireMessageErreur(err));
    }
  }, [toast]);

  useEffect(() => {
    const code = searchParams.get('materiel');
    if (!code) return;

    let annule = false;

    const retirerParametre = () => {
      const parametres = new URLSearchParams(searchParams);
      parametres.delete('materiel');
      setSearchParams(parametres, { replace: true });
    };

    obtenirMateriel(code)
      .then((materiel) => {
        if (annule) return;
        void ouvrirCreation(materiel);
        retirerParametre();
      })
      .catch((err) => {
        if (annule) return;
        toast.erreur('Matériel introuvable', extraireMessageErreur(err));
        retirerParametre();
      });

    return () => {
      annule = true;
    };
  }, [searchParams, setSearchParams, ouvrirCreation, toast]);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (!materielSelectionne) {
      setErreurMateriel('Sélectionnez un matériel dans la liste des suggestions.');
      return;
    }
    if (!statutMouvable) return;
    setEnvoi(true);
    try {
      const res = await creerAffectation({
        code_materiel: materielSelectionne.code_materiel,
        type_mouvement: form.type_mouvement,
        id_localisation: Number(form.id_localisation),
        agent_beneficiaire: form.agent_beneficiaire.trim(),
        motif_mouvement: form.motif_mouvement.trim() || undefined,
        generer_bon: form.generer_bon,
      });
      if (res.bon) {
        toast.succes('Mouvement enregistre avec bon',
          `${form.type_mouvement} : ${materielSelectionne.code_materiel} - bon ${res.bon.num_bon}.`);
        setBonGenere(res.bon);
      } else {
        toast.succes('Mouvement enregistre',
          `${form.type_mouvement} : ${materielSelectionne.code_materiel} (sans bon).`);
      }
      setModalOuvert(false);
      await charger();
    } catch (err) {
      toast.erreur('Mouvement refuse', extraireMessageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  const genererBon = async (a: Affectation) => {
    setGenerationId(a.id_affectation);
    try {
      const bon = await genererBonAffectation(a.id_affectation);
      toast.succes('Bon de décharge généré', `Bon ${bon.num_bon} disponible pour ${a.code_materiel}.`);
      setBonGenere(bon);
      await charger();
    } catch (err) {
      toast.erreur('Génération impossible', extraireMessageErreur(err));
    } finally {
      setGenerationId(null);
    }
  };

  const urlPdf = bonGenere ? urlPdfBon(bonGenere) : null;
  const filtresActifs = filtreCode.trim() !== '' || filtreType !== '';

  const reinitialiserFiltres = () => {
    setFiltreCode('');
    setFiltreType('');
    setPage(1);
  };

  const filtresResume: FiltreActif[] = [
    ...(filtreCode.trim() ? [{
      label: `Code matériel : ${filtreCode.trim()}`,
      onSupprimer: () => { setFiltreCode(''); setPage(1); },
    }] : []),
    ...(filtreType ? [{
      label: `Type : ${LIBELLE_TYPE[filtreType]}`,
      onSupprimer: () => { setFiltreType(''); setPage(1); },
    }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Affectations et mouvements</h1>
        <BoutonCreation libelle="Nouveau mouvement" onClick={() => void ouvrirCreation()} />
      </div>

      <div className="card">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <ChampRecherche
            label="Code matériel"
            value={filtreCode}
            onChange={(valeur) => { setFiltreCode(valeur); setPage(1); }}
            placeholder="Rechercher un code…"
            enveloppeClassName="w-full sm:max-w-xs"
          />
          <SelectFiltre
            id="filtre-type"
            label="Type de mouvement"
            icone={<IconeCategorie />}
            value={filtreType}
            onChange={(valeur) => { setFiltreType(valeur as '' | TypeMouvement); setPage(1); }}
            enveloppeClassName="w-full sm:max-w-xs"
            options={[
              { value: '', label: 'Tous les types' },
              ...TYPES_MOUVEMENT.map((t) => ({ value: t, label: LIBELLE_TYPE[t] })),
            ]}
          />
        </div>
        <ResumeFiltres
          filtres={filtresResume}
          total={total}
          chargement={chargement}
          onToutEffacer={reinitialiserFiltres}
          libelleChargement="Recherche…"
        />
      </div>

      <div className="card overflow-hidden">
        {chargement ? (
          <SkeletonTableau lignes={6} colonnes={8} />
        ) : affectations.length === 0 ? (
          <EmptyState
            icone={filtresActifs ? <IconesEmpty.Recherche /> : <IconesEmpty.Boite />}
            titre={filtresActifs ? 'Aucun mouvement ne correspond' : 'Aucun mouvement enregistre'}
            description={
              filtresActifs
                ? 'Ajustez le code materiel ou le type de mouvement.'
                : 'Enregistrez la premiere affectation, mutation ou restitution.'
            }
            ctaLabel={filtresActifs ? undefined : '+ Nouveau mouvement'}
            ctaOnClick={filtresActifs ? reinitialiserFiltres : () => void ouvrirCreation()}
            filtreActif={filtresActifs}
          />
        ) : (
          <Tableau>
            <EnteteTableau colonnes={['Date', 'Materiel', 'Type', 'Origine', 'Destination', 'Recepteur', 'Motif', 'Bon']} />
            <tbody>
              {affectations.map((a) => (
                <tr key={a.id_affectation}>
                  <td className="text-xs text-slate-600">{formatDateSansHeure(a.date_mouvement)}</td>
                  <td>
                    <p className="font-medium">{a.code_materiel}</p>
                    <p className="text-xs text-slate-500">{a.marque} {a.modele}</p>
                  </td>
                  <td><Badge valeur={a.type_mouvement} /></td>
                  <td className="text-slate-700">
                    {a.origine_nom_service
                      ? <>
                          {a.origine_nom_service}
                          {a.origine_code_bureau ? ` (${a.origine_code_bureau})` : ''}
                          {a.origine_ville ? <span className="block text-xs text-slate-500">{a.origine_ville}</span> : null}
                        </>
                      : <span className="text-slate-400">-</span>}
                  </td>
                  <td className="text-slate-700">
                    {a.nom_service}
                    {a.code_bureau ? ` (${a.code_bureau})` : ''}
                    {a.ville ? <span className="block text-xs text-slate-500">{a.ville}</span> : null}
                  </td>
                  <td>{a.agent_beneficiaire}</td>
                  <td className="max-w-xs truncate text-xs text-slate-600">{a.motif_mouvement ?? '-'}</td>
                  <td>
                    {a.num_bon ? (
                      <div className="flex flex-col items-start gap-1">
                        <LienExterneIcone
                          href={urlPdfBonNum(a.num_bon, true)}
                          target="_blank"
                          rel="noopener noreferrer"
                          libelle={`Télécharger le bon ${a.num_bon}`}
                          icone="telecharger"
                        />
                        <span className="font-mono text-[10px] text-slate-400">{a.num_bon}</span>
                      </div>
                    ) : (
                      <BoutonIcone
                        libelle={generationId === a.id_affectation ? 'Génération du bon en cours' : `Générer le bon de ${a.code_materiel}`}
                        icone={generationId === a.id_affectation ? 'chargement' : 'generer'}
                        variante="primaire"
                        disabled={generationId === a.id_affectation}
                        onClick={() => void genererBon(a)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {/* Modal creation */}
      <Modal ouvert={modalOuvert} titre="Nouveau mouvement"
        onFermer={() => setModalOuvert(false)}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOuvert(false)}>Annuler</button>
            <button type="submit" form="form-affectation" className="btn-primary" disabled={envoi || destinationInvalide || (materielSelectionne !== null && !statutMouvable)}>
              {envoi ? 'Envoi...' : 'Enregistrer'}
            </button>
          </>
        }>
        <form id="form-affectation" onSubmit={soumettre} className="space-y-5">
          <Champ
            label="Matériel"
            requis
            aide="Recherchez par code, marque, modèle ou n° de série, puis sélectionnez le matériel."
          >
            <SelecteurMateriel
              value={materielSelectionne}
              onChange={choisirMateriel}
              erreur={erreurMaterielAffichee}
            />
          </Champ>

          <Champ
            label="Type de mouvement"
            requis
            aide={
              materielSelectionne?.statut_materiel === 'STOCK'
                ? 'Matériel en stock : une affectation est possible.'
                : materielSelectionne?.statut_materiel === 'SERVICE'
                  ? 'Matériel en service : une mutation ou une restitution est possible.'
                  : undefined
            }
          >
            <SelectFiltre
              required
              value={form.type_mouvement}
              onChange={(valeur) => setForm({ ...form, type_mouvement: valeur as TypeMouvement, id_localisation: '' })}
              placeholder={materielSelectionne && !statutMouvable ? 'Aucun mouvement possible' : 'Sélectionner…'}
              disabled={!materielSelectionne || !statutMouvable}
              options={typesMouvementDisponibles.map((t) => ({ value: t, label: t }))}
            />
          </Champ>
          <p className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs leading-relaxed text-slate-500">
            AFFECTATION : Stock → Service · MUTATION : Service → autre localisation · RESTITUTION : Service → Stock.
          </p>

          <Champ
            label="Localisation destination"
            requis
            aide={
              materielSelectionne && form.type_mouvement !== 'RESTITUTION'
                ? 'La destination doit être différente de la localisation actuelle.'
                : undefined
            }
          >
            <SelectFiltre
              required
              value={form.id_localisation}
              onChange={(valeur) => setForm({ ...form, id_localisation: valeur })}
              placeholder="- Choisir -"
              disabled={!materielSelectionne || !statutMouvable}
              options={[
                { value: '', label: '- Choisir -' },
                ...localisationsDisponibles.map((l) => ({
                  value: String(l.id_localisation),
                  label: `${l.nom_service}${l.code_bureau ? ` - ${l.code_bureau}` : ''} (${l.ville})`,
                })),
              ]}
            />
          </Champ>
          <Champ label="Agent récepteur" requis>
            <Input required maxLength={100} value={form.agent_beneficiaire}
              onChange={(e) => setForm({ ...form, agent_beneficiaire: e.target.value })} />
          </Champ>
          <Champ label="Motif" optionnel aide="1000 caractères maximum.">
            <Textarea rows={3} maxLength={1000} value={form.motif_mouvement}
              onChange={(e) => setForm({ ...form, motif_mouvement: e.target.value })} />
          </Champ>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50">
            <input type="checkbox" className="case" checked={form.generer_bon}
              onChange={(e) => setForm({ ...form, generer_bon: e.target.checked })} />
            <span>Générer un bon de décharge</span>
            <span className="ml-auto text-[10px] font-medium uppercase tracking-[0.1em] text-slate-400">Optionnel</span>
          </label>
        </form>
      </Modal>

      {/* Modal recap bon genere */}
      <Modal ouvert={bonGenere !== null}
        titre={bonGenere ? `Bon de decharge ${bonGenere.num_bon}` : ''}
        onFermer={() => setBonGenere(null)}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={() => setBonGenere(null)}>Fermer</button>
            {urlPdf && (
              <a href={urlPdf} target="_blank" rel="noopener noreferrer" className="btn-primary">
                Telecharger le PDF
              </a>
            )}
          </>
        }>
        {bonGenere && (
          <div className="space-y-3 text-sm">
            <p><span className="font-semibold">Numero :</span> {bonGenere.num_bon}</p>
            <p><span className="font-semibold">Type :</span> {bonGenere.type_mouvement}</p>
            <p><span className="font-semibold">Date :</span> {formatDateSansHeure(bonGenere.date_mouvement)}</p>
            <p><span className="font-semibold">Récepteur :</span> {bonGenere.agent_beneficiaire}</p>
            <p><span className="font-semibold">Materiel :</span> {bonGenere.code_materiel} - {bonGenere.marque} {bonGenere.modele}</p>
            <p><span className="font-semibold">Destination :</span> {bonGenere.destination.nom_service} ({bonGenere.destination.ville})</p>
            {bonGenere.origine && (
              <p><span className="font-semibold">Origine :</span> {bonGenere.origine.nom_service} ({bonGenere.origine.ville})</p>
            )}
            {bonGenere.motif_mouvement && (
              <p><span className="font-semibold">Motif :</span> {bonGenere.motif_mouvement}</p>
            )}
            {!urlPdf && (
              <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800 ring-1 ring-amber-200">
                Le PDF n&apos;est pas encore disponible.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}