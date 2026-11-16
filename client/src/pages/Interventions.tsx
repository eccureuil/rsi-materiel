import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  imputerPiece, listerImputations, listerInterventions, listerPieces,
  modifierIntervention, obtenirIntervention, supprimerImputation, terminerIntervention,
} from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import Badge from '@/components/Badge';
import {
  Champ, ChampFiltre, IconeMaintenance, IconeStatut, IconeUtilisateur, Input, ResumeFiltres,
  SectionFormulaire, Select, SelectFiltre, Textarea, type FiltreActif,
} from '@/components/FormControls';
import type {
  Imputation, Intervention, Piece, StatutMateriel, TypeMaintenance,
} from '@/types/api';
import { useSearchParams } from 'react-router-dom';
import { SkeletonTableau } from '@/components/Skeleton';
import { BoutonIcone } from '@/components/BoutonIcone';
import EmptyState, { IconesEmpty } from '@/components/EmptyState';
import { EnteteTableau, Tableau } from '@/components/Tableau';

const TYPES_MAINT: TypeMaintenance[] = ['CORRECTIVE', 'PREVENTIVE'];
const STATUTS_FINAUX: StatutMateriel[] = ['SERVICE', 'PANNE', 'REFORME'];

const LIBELLE_TYPE: Record<TypeMaintenance, string> = {
  CORRECTIVE: 'Corrective',
  PREVENTIVE: 'Préventive',
};

function formatDateHeure(valeur: string | null): string {
  if (!valeur) return '—';
  const [date, heure] = valeur.split(' ');
  const [annee, mois, jour] = date.split('-');
  if (!annee || !mois || !jour) return valeur;
  return `${jour}-${mois}-${annee}${heure ? ` ${heure.slice(0, 5)}` : ''}`;
}

function formatDuree(debut: string, fin: string | null): string {
  const dateDebut = new Date(debut.replace(' ', 'T'));
  const dateFin = fin ? new Date(fin.replace(' ', 'T')) : new Date();
  const difference = dateFin.getTime() - dateDebut.getTime();
  if (!Number.isFinite(difference) || difference < 0) return '—';
  const minutesTotales = Math.floor(difference / 60000);
  const jours = Math.floor(minutesTotales / 1440);
  const heures = Math.floor((minutesTotales % 1440) / 60);
  const minutes = minutesTotales % 60;
  if (jours > 0) return `${jours} j ${heures} h`;
  if (heures > 0) return `${heures} h ${String(minutes).padStart(2, '0')} min`;
  return `${minutes} min`;
}

function initiales(prenom: string, nom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}

function CarteInfo({ label, valeur }: { label: string; valeur: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-800">{valeur}</div>
    </div>
  );
}

function BlocTexte({ titre, contenu }: { titre: string; contenu: string | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{titre}</p>
      <p className={`mt-1.5 whitespace-pre-line text-sm leading-relaxed ${contenu ? 'text-slate-700' : 'italic text-slate-400'}`}>
        {contenu || 'Non renseigné'}
      </p>
    </div>
  );
}

export default function Interventions() {
  const { user, hasRole } = useAuth();
  const toast = useToast();
  const { confirmer } = useConfirm();
  const estCadre = hasRole('CADRE_MAINTENANCE');

  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chargement, setChargement] = useState(false);

  const [searchParams] = useSearchParams();
  const [filtreType, setFiltreType] = useState(searchParams.get('type_maintenance') ?? '');
  const [filtreTerminee, setFiltreTerminee] = useState(searchParams.get('terminee') ?? '');
  const [mesInterventions, setMesInterventions] = useState(searchParams.get('mes_interventions') === 'true');
  const filtresActifs = filtreType !== '' || filtreTerminee !== '' || mesInterventions;

  const reinitialiserFiltres = () => {
    setFiltreType('');
    setFiltreTerminee('');
    setMesInterventions(false);
    setPage(1);
  };

  const libelleTerminee = filtreTerminee === 'true' ? 'Terminées'
    : filtreTerminee === 'false' ? 'En cours' : '';

  const filtresResume: FiltreActif[] = [
    ...(filtreType ? [{
      label: `Type : ${LIBELLE_TYPE[filtreType as TypeMaintenance] ?? filtreType}`,
      onSupprimer: () => { setFiltreType(''); setPage(1); },
    }] : []),
    ...(libelleTerminee ? [{
      label: `État : ${libelleTerminee}`,
      onSupprimer: () => { setFiltreTerminee(''); setPage(1); },
    }] : []),
    ...(mesInterventions ? [{
      label: 'Mes interventions uniquement',
      onSupprimer: () => { setMesInterventions(false); setPage(1); },
    }] : []),
  ];

  const [fiche, setFiche] = useState<Intervention | null>(null);
  const [imputations, setImputations] = useState<Imputation[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);

  const [diagEdit, setDiagEdit] = useState('');
  const [travauxEdit, setTravauxEdit] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const [modalTerminer, setModalTerminer] = useState(false);
  const [termTravaux, setTermTravaux] = useState('');
  const [termStatut, setTermStatut] = useState<StatutMateriel>('SERVICE');
  const [termDiag, setTermDiag] = useState('');

  const [imputRef, setImputRef] = useState('');
  const [imputQte, setImputQte] = useState(1);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await listerInterventions({
        type_maintenance: filtreType || undefined,
        terminee: filtreTerminee === '' ? undefined : filtreTerminee === 'true',
        mes_interventions: mesInterventions || undefined,
        page, limit: 20,
      });
      setInterventions(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) { toast.erreur('Chargement impossible', extraireMessageErreur(err)); }
    finally { setChargement(false); }
  }, [filtreType, filtreTerminee, mesInterventions, page, toast]);

  useEffect(() => { void charger(); }, [charger]);

  const ouvrirFiche = async (num: string) => {
    try {
      const [i, imps] = await Promise.all([obtenirIntervention(num), listerImputations(num)]);
      setFiche(i);
      setImputations(imps ?? []);
      setDiagEdit(i.diagnostic ?? '');
      setTravauxEdit(i.travaux_realises ?? '');
      const p = await listerPieces({ limit: 100 });
      setPieces(p.items ?? []);
      setImputRef(''); setImputQte(1);
    } catch (err) { toast.erreur('Fiche indisponible', extraireMessageErreur(err)); }
  };

  const fermerFiche = () => {
    setFiche(null); setImputations([]); setDiagEdit(''); setTravauxEdit('');
  };

  const estIntervenantCourant = (i: Intervention): boolean => {
    if (!user) return false;
    return (i.intervenants ?? []).some((x) => x.matricule_cadre === user.matricule);
  };

  const peutAgir = (i: Intervention): boolean =>
    estCadre && i.date_fin === null && estIntervenantCourant(i);

  const enregistrerDiagTravaux = async () => {
    if (!fiche) return;
    setEnvoi(true);
    try {
      await modifierIntervention(fiche.num_intervention, {
        diagnostic: diagEdit || undefined,
        travaux_realises: travauxEdit || undefined,
      });
      toast.succes('Fiche mise à jour', `Diagnostic et travaux enregistrés pour ${fiche.num_intervention}.`);
      await ouvrirFiche(fiche.num_intervention);
      await charger();
    } catch (err) { toast.erreur('Enregistrement refusé', extraireMessageErreur(err)); }
    finally { setEnvoi(false); }
  };

  const ouvrirModalTerminer = () => {
    if (!fiche) return;
    setTermTravaux(fiche.travaux_realises ?? '');
    setTermDiag(fiche.diagnostic ?? '');
    setTermStatut('SERVICE');
    setModalTerminer(true);
  };

  const terminer = async (e: FormEvent) => {
    e.preventDefault();
    if (!fiche) return;
    setEnvoi(true);
    try {
      await terminerIntervention(fiche.num_intervention, {
        travaux_realises: termTravaux,
        statut_final_materiel: termStatut,
        diagnostic: termDiag || undefined,
      });
      toast.succes('Intervention terminée', `${fiche.num_intervention} clôturée, matériel en ${termStatut}.`);
      setModalTerminer(false);
      await charger();
      await ouvrirFiche(fiche.num_intervention);
    } catch (err) { toast.erreur('Terminaison impossible', extraireMessageErreur(err)); }
    finally { setEnvoi(false); }
  };

  const imputer = async (e: FormEvent) => {
    e.preventDefault();
    if (!fiche || !imputRef) return;
    setEnvoi(true);
    try {
      await imputerPiece(fiche.num_intervention, imputRef, imputQte);
      toast.succes('Pièce imputée', `${imputQte} × ${imputRef} sur ${fiche.num_intervention}.`);
      setImputRef(''); setImputQte(1);
      await ouvrirFiche(fiche.num_intervention);
    } catch (err) { toast.erreur('Imputation refusée', extraireMessageErreur(err)); }
    finally { setEnvoi(false); }
  };

  const retirerImputation = async (id: number) => {
    if (!fiche) return;
    const ok = await confirmer({
      titre: 'Retirer cette imputation ?',
      message: 'La quantité sera restituée au stock de la pièce.',
      libelleConfirmer: 'Retirer',
      ton: 'danger',
    });
    if (!ok) return;
    try {
      await supprimerImputation(fiche.num_intervention, id);
      toast.info('Imputation retirée', 'Le stock a été restitué.');
      await ouvrirFiche(fiche.num_intervention);
    } catch (err) { toast.erreur('Retrait impossible', extraireMessageErreur(err)); }
  };

  const pieceSelectionnee = pieces.find((p) => p.ref_piece === imputRef);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Interventions</h1>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <SelectFiltre
            id="filtre-type"
            label="Type de maintenance"
            icone={<IconeMaintenance />}
            value={filtreType}
            onChange={(valeur) => { setFiltreType(valeur); setPage(1); }}
            enveloppeClassName="w-full sm:max-w-xs"
            options={[
              { value: '', label: 'Tous les types' },
              ...TYPES_MAINT.map((t) => ({ value: t, label: LIBELLE_TYPE[t] })),
            ]}
          />
          <SelectFiltre
            id="filtre-terminee"
            label="État"
            icone={<IconeStatut />}
            value={filtreTerminee}
            onChange={(valeur) => { setFiltreTerminee(valeur); setPage(1); }}
            enveloppeClassName="w-full sm:max-w-xs"
            options={[
              { value: '', label: 'Toutes' },
              { value: 'true', label: 'Terminées' },
              { value: 'false', label: 'En cours' },
            ]}
          />
          {estCadre && (
            <ChampFiltre label="Périmètre" icone={<IconeUtilisateur />} className="w-full sm:w-auto">
              <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={mesInterventions}
                  onChange={(e) => { setMesInterventions(e.target.checked); setPage(1); }}
                  className="case"
                />
                Mes interventions
              </label>
            </ChampFiltre>
          )}
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
          <SkeletonTableau lignes={5} colonnes={6} />
        ) : interventions.length === 0 ? (
          <EmptyState
            icone={filtresActifs ? <IconesEmpty.Recherche /> : <IconesEmpty.Outil />}
            titre={filtresActifs ? 'Aucune intervention ne correspond' : 'Aucune intervention en cours'}
            description={
              filtresActifs
                ? 'Essayez d\'elargir vos criteres.'
                : 'Les interventions apparaitront ici des qu\'un cadre prendra en charge une panne.'
            }
            ctaLabel={filtresActifs ? undefined : 'Voir les declarations de pannes'}
            lienTo={filtresActifs ? undefined : '/pannes'}
            ctaOnClick={filtresActifs ? reinitialiserFiltres : undefined}
            filtreActif={filtresActifs}
          />
        ) : (
          <Tableau>
            <EnteteTableau colonnes={['N°', 'Incident', 'Type', 'Début', 'Fin', 'Actions']} />
            <tbody>
              {interventions.map((i) => (
                <tr key={i.num_intervention}>
                  <td className="font-medium">{i.num_intervention}</td>
                  <td>{i.num_incident}</td>
                  <td><Badge valeur={i.type_maintenance} /></td>
                  <td className="text-xs text-slate-600">{formatDateHeure(i.date_debut)}</td>
                  <td className="text-xs text-slate-600">{i.date_fin ? formatDateHeure(i.date_fin) : '—'}</td>
                  <td>
                    <BoutonIcone
                      libelle={i.date_fin === null ? 'Voir la fiche de l’intervention en cours' : 'Voir la fiche d’intervention'}
                      icone="voir"
                      className={i.date_fin === null ? 'bouton-en-cours' : undefined}
                      onClick={() => void ouvrirFiche(i.num_intervention)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal ouvert={fiche !== null}
        surtitre="Suivi maintenance"
        titre="Fiche d’intervention"
        onFermer={fermerFiche}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={fermerFiche}>Fermer</button>
            {fiche && peutAgir(fiche) && (
              <button type="button" className="btn-warning" onClick={ouvrirModalTerminer}>
                Terminer l’intervention
              </button>
            )}
          </>
        }>
        {fiche && (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-2xl bg-linear-to-br from-asecna-bleu to-asecna-clair p-5 text-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                    Intervention {fiche.date_fin ? 'terminée' : 'en cours'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold">{fiche.num_intervention}</h3>
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-white/20">
                      {LIBELLE_TYPE[fiche.type_maintenance]}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        fiche.date_fin
                          ? 'bg-emerald-400/15 text-emerald-100 ring-emerald-300/30'
                          : 'bg-amber-400/15 text-amber-100 ring-amber-300/30'
                      }`}
                    >
                      {fiche.date_fin ? 'Terminée' : 'En cours'}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-3 text-right ring-1 ring-inset ring-white/15">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
                    {fiche.date_fin ? 'Durée' : 'Durée écoulée'}
                  </p>
                  <p className="mt-1 text-lg font-semibold">{formatDuree(fiche.date_debut, fiche.date_fin)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <CarteInfo label="Début" valeur={formatDateHeure(fiche.date_debut)} />
              <CarteInfo label="Fin" valeur={fiche.date_fin ? formatDateHeure(fiche.date_fin) : 'En cours'} />
              <CarteInfo label="Incident" valeur={fiche.num_incident} />
              <CarteInfo label="Matériel" valeur={fiche.code_materiel ?? '—'} />
            </div>

            <SectionFormulaire
              titre="Intervenants"
              description={`${(fiche.intervenants ?? []).length} cadre(s) affecté(s)`}
            >
              {(fiche.intervenants ?? []).length === 0 ? (
                <p className="text-sm italic text-slate-400">Aucun intervenant affecté.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {(fiche.intervenants ?? []).map((x) => (
                    <div key={x.matricule_cadre} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-asecna-bleu/10 text-xs font-semibold text-asecna-bleu">
                        {initiales(x.prenom, x.nom)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{x.prenom} {x.nom}</p>
                        <p className="truncate text-xs text-slate-500">{x.specialite} · {x.matricule_cadre}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionFormulaire>

            <SectionFormulaire titre="Compte rendu">
              {peutAgir(fiche) ? (
                <div className="space-y-3">
                  <Champ label="Diagnostic" optionnel>
                    <Textarea rows={3} value={diagEdit} onChange={(e) => setDiagEdit(e.target.value)} />
                  </Champ>
                  <Champ label="Travaux réalisés" optionnel>
                    <Textarea rows={3} value={travauxEdit} onChange={(e) => setTravauxEdit(e.target.value)} />
                  </Champ>
                  <div className="flex justify-end">
                    <button type="button" className="btn-primary" disabled={envoi}
                      onClick={() => void enregistrerDiagTravaux()}>
                      {envoi ? 'Enregistrement…' : 'Enregistrer diagnostic/travaux'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <BlocTexte titre="Diagnostic" contenu={fiche.diagnostic} />
                  <BlocTexte titre="Travaux réalisés" contenu={fiche.travaux_realises} />
                </div>
              )}
            </SectionFormulaire>

            <SectionFormulaire
              titre="Pièces imputées"
              description={`${imputations.length} imputation(s)`}
            >
              {imputations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-slate-600">Aucune pièce imputée</p>
                  <p className="mt-1 text-xs text-slate-400">Les pièces utilisées apparaîtront ici.</p>
                </div>
              ) : (
                <Tableau>
                  <EnteteTableau
                    colonnes={
                      peutAgir(fiche)
                        ? ['Référence', 'Désignation', 'Quantité', 'Date', 'Actions']
                        : ['Référence', 'Désignation', 'Quantité', 'Date']
                    }
                  />
                  <tbody>
                    {imputations.map((imp) => (
                      <tr key={imp.id_imputation}>
                        <td>{imp.ref_piece}</td>
                        <td>{imp.designation ?? '—'}</td>
                        <td>{imp.quantite_utilisee}</td>
                        <td className="text-xs text-slate-600">{formatDateHeure(imp.date_imputation)}</td>
                        {peutAgir(fiche) && (
                          <td>
                            <BoutonIcone libelle="Retirer la pièce imputée" icone="retirer" variante="danger" onClick={() => void retirerImputation(imp.id_imputation)} />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Tableau>
              )}

              {peutAgir(fiche) && (
                <form onSubmit={imputer} className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-white p-3.5 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-end">
                  <Champ label="Pièce" requis>
                    <Select required value={imputRef} onChange={(e) => setImputRef(e.target.value)}>
                      <option value="">— Choisir —</option>
                      {pieces.map((p) => (
                        <option key={p.ref_piece} value={p.ref_piece}>
                          {p.ref_piece} — {p.designation} (stock : {p.quantite_en_stock})
                        </option>
                      ))}
                    </Select>
                  </Champ>
                  <Champ label="Quantité" requis>
                    <Input type="number" min={1} max={pieceSelectionnee?.quantite_en_stock ?? undefined}
                      value={imputQte} onChange={(e) => setImputQte(Number(e.target.value))} />
                  </Champ>
                  <button type="submit" className="btn-primary h-11" disabled={envoi || !imputRef}>Imputer</button>
                </form>
              )}
            </SectionFormulaire>
          </div>
        )}
      </Modal>

      <Modal ouvert={modalTerminer} titre="Terminer l’intervention"
        onFermer={() => setModalTerminer(false)}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalTerminer(false)}>Annuler</button>
            <button type="submit" form="form-terminer" className="btn-success" disabled={envoi}>
              {envoi ? 'Envoi…' : 'Terminer'}
            </button>
          </>
        }>
        <form id="form-terminer" onSubmit={terminer} className="space-y-5">
          <Champ label="Diagnostic" optionnel>
            <Textarea rows={3} value={termDiag} onChange={(e) => setTermDiag(e.target.value)} />
          </Champ>
          <Champ label="Travaux réalisés" requis>
            <Textarea required rows={3} value={termTravaux} onChange={(e) => setTermTravaux(e.target.value)} />
          </Champ>
          <Champ label="Statut final du matériel" requis>
            <Select required value={termStatut}
              onChange={(e) => setTermStatut(e.target.value as StatutMateriel)}>
              {STATUTS_FINAUX.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Champ>
        </form>
      </Modal>
    </div>
  );
}