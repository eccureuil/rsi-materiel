import { useCallback, useEffect, useState, type FormEvent } from 'react';
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
import { Champ, Input, Select, Textarea } from '@/components/FormControls';
import type {
  Imputation, Intervention, Piece, StatutMateriel, TypeMaintenance,
} from '@/types/api';
import { useSearchParams } from 'react-router-dom';
import { SkeletonTableau } from '@/components/Skeleton';
import EmptyState, { IconesEmpty } from '@/components/EmptyState';

const TYPES_MAINT: TypeMaintenance[] = ['CORRECTIVE', 'PREVENTIVE'];
const STATUTS_FINAUX: StatutMateriel[] = ['SERVICE', 'PANNE', 'REFORME'];

export default function Interventions() {
  const { user, hasRole } = useAuth();
  const toast = useToast();
  const { confirmer } = useConfirm();
  const estCadre = hasRole('CADRE_MAINTENANCE');

  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chargement, setChargement] = useState(false);

  const [searchParams] = useSearchParams();
  const [filtreType, setFiltreType] = useState(searchParams.get('type_maintenance') ?? '');
  const [filtreTerminee, setFiltreTerminee] = useState(searchParams.get('terminee') ?? '');
  const [mesInterventions, setMesInterventions] = useState(searchParams.get('mes_interventions') === 'true');
  const filtresActifs = filtreType !== '' || filtreTerminee !== '' || mesInterventions;

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

      <div className="card flex flex-wrap gap-3 p-4">
        <Select value={filtreType}
          onChange={(e) => { setFiltreType(e.target.value); setPage(1); }} className="max-w-xs">
          <option value="">Tous types</option>
          {TYPES_MAINT.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select value={filtreTerminee}
          onChange={(e) => { setFiltreTerminee(e.target.value); setPage(1); }} className="max-w-xs">
          <option value="">Toutes</option>
          <option value="true">Terminées</option>
          <option value="false">En cours</option>
        </Select>
        {estCadre && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={mesInterventions}
              onChange={(e) => { setMesInterventions(e.target.checked); setPage(1); }} />
            Mes interventions
          </label>
        )}
      </div>

      <div className="card overflow-hidden">
        {chargement ? (
          <SkeletonTableau lignes={5} colonnes={7} />
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
            ctaOnClick={filtresActifs ? () => { setFiltreType(''); setFiltreTerminee(''); setMesInterventions(false); } : undefined}
            filtreActif={filtresActifs}
          />
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['N°', 'Incident', 'Type', 'Intervenants', 'Début', 'Fin', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {interventions.map((i) => (
                <tr key={i.num_intervention} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{i.num_intervention}</td>
                  <td className="px-4 py-3">{i.num_incident}</td>
                  <td className="px-4 py-3"><Badge valeur={i.type_maintenance} /></td>
                  <td className="px-4 py-3">
                    {(i.intervenants ?? []).map((x) => `${x.prenom} ${x.nom}`).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{i.date_debut}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{i.date_fin ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button className="btn-secondary" onClick={() => void ouvrirFiche(i.num_intervention)}>
                      Voir la fiche
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal ouvert={fiche !== null}
        titre={fiche ? `Fiche ${fiche.num_intervention}` : ''}
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p><span className="font-semibold">Incident :</span> {fiche.num_incident}</p>
              <p><span className="font-semibold">Type :</span> {fiche.type_maintenance}</p>
              <p><span className="font-semibold">Début :</span> {fiche.date_debut}</p>
              <p><span className="font-semibold">Fin :</span> {fiche.date_fin ?? '—'}</p>
            </div>

            <div>
              <p className="mb-1 text-sm font-semibold text-slate-700">Intervenants</p>
              <ul className="list-disc pl-5 text-sm text-slate-700">
                {(fiche.intervenants ?? []).map((x) => (
                  <li key={x.matricule_cadre}>
                    {x.prenom} {x.nom} — {x.specialite} ({x.matricule_cadre})
                  </li>
                ))}
              </ul>
            </div>

            {peutAgir(fiche) ? (
              <div className="space-y-3">
                <Champ label="Diagnostic">
                  <Textarea rows={3} value={diagEdit} onChange={(e) => setDiagEdit(e.target.value)} />
                </Champ>
                <Champ label="Travaux réalisés">
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
              <div className="space-y-2 text-sm">
                <p><span className="font-semibold">Diagnostic :</span> {fiche.diagnostic ?? '—'}</p>
                <p><span className="font-semibold">Travaux réalisés :</span> {fiche.travaux_realises ?? '—'}</p>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Pièces imputées</p>
              {imputations.length === 0 && <p className="text-sm text-slate-500">Aucune pièce imputée.</p>}
              {imputations.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="py-2">Référence</th>
                      <th className="py-2">Désignation</th>
                      <th className="py-2">Quantité</th>
                      <th className="py-2">Date</th>
                      {peutAgir(fiche) && <th className="py-2">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {imputations.map((imp) => (
                      <tr key={imp.id_imputation} className="border-b border-slate-100">
                        <td className="py-2">{imp.ref_piece}</td>
                        <td className="py-2">{imp.designation ?? '—'}</td>
                        <td className="py-2">{imp.quantite_utilisee}</td>
                        <td className="py-2 text-xs text-slate-600">{imp.date_imputation}</td>
                        {peutAgir(fiche) && (
                          <td className="py-2">
                            <button className="btn-danger" onClick={() => void retirerImputation(imp.id_imputation)}>
                              Retirer
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {peutAgir(fiche) && (
                <form onSubmit={imputer} className="mt-3 flex flex-wrap items-end gap-3 rounded-md bg-slate-50 p-3">
                  <Champ label="Pièce">
                    <Select required value={imputRef} onChange={(e) => setImputRef(e.target.value)}>
                      <option value="">— Choisir —</option>
                      {pieces.map((p) => (
                        <option key={p.ref_piece} value={p.ref_piece}>
                          {p.ref_piece} — {p.designation} (stock : {p.quantite_en_stock})
                        </option>
                      ))}
                    </Select>
                  </Champ>
                  <Champ label="Quantité">
                    <Input type="number" min={1} max={pieceSelectionnee?.quantite_en_stock ?? undefined}
                      value={imputQte} onChange={(e) => setImputQte(Number(e.target.value))} />
                  </Champ>
                  <button type="submit" className="btn-primary" disabled={envoi || !imputRef}>Imputer</button>
                </form>
              )}
            </div>
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
        <form id="form-terminer" onSubmit={terminer} className="space-y-4">
          <Champ label="Diagnostic (optionnel)">
            <Textarea rows={3} value={termDiag} onChange={(e) => setTermDiag(e.target.value)} />
          </Champ>
          <Champ label="Travaux réalisés *">
            <Textarea required rows={3} value={termTravaux} onChange={(e) => setTermTravaux(e.target.value)} />
          </Champ>
          <Champ label="Statut final du matériel *">
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