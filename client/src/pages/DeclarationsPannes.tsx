import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  cloturerIncident, declarerIncident, intervenirIncident,
  listerIncidents, obtenirIncident, obtenirMateriel, rejeterIncident,
} from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import BoutonCreation from '@/components/BoutonCreation';
import { useDebounce } from '@/hooks/useDebounce';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import Badge from '@/components/Badge';
import EmptyState, { IconesEmpty } from '@/components/EmptyState';
import SelecteurMateriel from '@/components/SelecteurMateriel';
import { BoutonIcone } from '@/components/BoutonIcone';
import { SkeletonTableau } from '@/components/Skeleton';
import { EnteteTableau, Tableau } from '@/components/Tableau';
import {
  Champ, ChampRecherche, FormGrid, IconeStatut, IconeUrgence, ResumeFiltres,
  SectionFormulaire, SelectFiltre, Textarea, type FiltreActif,
} from '@/components/FormControls';
import {
  peutDeclarerPanne, STATUTS_DECLARATION_PANNE,
  type DegreUrgence, type Incident, type Materiel, type StatutMateriel,
} from '@/types/api';

const URGENCES: DegreUrgence[] = ['FAIBLE', 'MOYEN', 'URGENT', 'CRITIQUE'];
const URGENCES_OPERATIONNEL: DegreUrgence[] = ['URGENT', 'CRITIQUE'];
const STATUTS = ['DECLARE', 'PRISE_EN_CHARGE', 'EN_COURS', 'RESOLU', 'CLOTURE', 'REJETE'];
const STATUTS_OUVERTS = ['DECLARE', 'PRISE_EN_CHARGE', 'EN_COURS'];

const LIBELLE_STATUT: Record<string, string> = {
  DECLARE: 'Déclaré',
  PRISE_EN_CHARGE: 'Pris en charge',
  EN_COURS: 'En cours',
  RESOLU: 'Résolu',
  CLOTURE: 'Clôturé',
  REJETE: 'Rejeté',
};

const LIBELLE_URGENCE: Record<DegreUrgence, string> = {
  FAIBLE: 'Faible',
  MOYEN: 'Moyen',
  URGENT: 'Urgent',
  CRITIQUE: 'Critique',
};

const LIBELLE_STATUT_MATERIEL: Record<StatutMateriel, string> = {
  STOCK: 'En stock',
  SERVICE: 'En service',
  PANNE: 'En panne',
  MAINTENANCE: 'En maintenance',
  REFORME: 'Réformé',
};

function formatDateSansHeure(valeur: string): string {
  const [date] = valeur.split(' ');
  const [annee, mois, jour] = date.split('-');
  return annee && mois && jour ? `${jour}-${mois}-${annee}` : valeur;
}

function formatDateAvecHeure(valeur: string): string {
  const [date, heure] = valeur.split(' ');
  const dateFormatee = formatDateSansHeure(date);
  return heure ? `${dateFormatee} ${heure}` : dateFormatee;
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

export default function DeclarationsPannes() {
  const { user, hasRole } = useAuth();
  const toast = useToast();
  const { confirmer } = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const estCadre = hasRole('CADRE_MAINTENANCE');

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chargement, setChargement] = useState(false);

  const [filtreStatut, setFiltreStatut] = useState(() => {
    const valeur = searchParams.get('statut_incident') ?? '';
    return STATUTS.includes(valeur) ? valeur : '';
  });
  const [filtreUrgence, setFiltreUrgence] = useState(() => {
    const valeur = searchParams.get('degre_urgence') ?? '';
    return URGENCES.includes(valeur as DegreUrgence) ? valeur : '';
  });
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const qDebounce = useDebounce(q, 300);

  const [modalDeclaration, setModalDeclaration] = useState(false);
  const [modalRejet, setModalRejet] = useState<Incident | null>(null);
  const [detailIncident, setDetailIncident] = useState<Incident | null>(null);
  const [detailNum, setDetailNum] = useState<string | null>(null);
  const [chargementDetail, setChargementDetail] = useState(false);
  const [materielSelectionne, setMaterielSelectionne] = useState<Materiel | null>(null);
  const [erreurMateriel, setErreurMateriel] = useState('');
  const [formSymptomes, setFormSymptomes] = useState('');
  const [formUrgence, setFormUrgence] = useState<DegreUrgence>('MOYEN');
  const [formMotif, setFormMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const estOperationnel = materielSelectionne?.type_categorie === 'OPERATIONNEL';
  const urgencesDisponibles = estOperationnel ? URGENCES_OPERATIONNEL : URGENCES;
  const materielDeclarable = !materielSelectionne
    || peutDeclarerPanne(materielSelectionne.statut_materiel);
  const messageStatutMateriel = materielSelectionne && !materielDeclarable
    ? `Déclaration impossible pour le statut « ${LIBELLE_STATUT_MATERIEL[materielSelectionne.statut_materiel]} ».`
    : '';

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await listerIncidents({
        q: qDebounce.trim() || undefined,
        statut_incident: filtreStatut || undefined,
        degre_urgence: filtreUrgence || undefined,
        page, limit: 20,
      });
      setIncidents(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      toast.erreur('Chargement impossible', extraireMessageErreur(err));
    } finally {
      setChargement(false);
    }
  }, [qDebounce, filtreStatut, filtreUrgence, page, toast]);

  useEffect(() => { void charger(); }, [charger]);

  useEffect(() => {
    const statut = searchParams.get('statut_incident') ?? '';
    const urgence = searchParams.get('degre_urgence') ?? '';
    setFiltreStatut(STATUTS.includes(statut) ? statut : '');
    setFiltreUrgence(URGENCES.includes(urgence as DegreUrgence) ? urgence : '');
    setQ(searchParams.get('q') ?? '');
    setPage(1);
  }, [searchParams]);

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
        setMaterielSelectionne(materiel);
        setErreurMateriel('');
        setFormSymptomes('');
        setFormUrgence('MOYEN');
        setModalDeclaration(true);
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
  }, [searchParams, setSearchParams, toast]);

  useEffect(() => {
    if (estOperationnel && !URGENCES_OPERATIONNEL.includes(formUrgence)) {
      setFormUrgence('URGENT');
    }
  }, [estOperationnel, formUrgence]);

  // Le serveur renvoie `intervenants: string[]` directement dans la liste.
  const estDejaIntervenant = (inc: Incident): boolean => {
    if (!user) return false;
    return (inc.intervenants ?? []).includes(user.matricule);
  };

  const ouvrirDeclaration = () => {
    setErreurMateriel('');
    setModalDeclaration(true);
  };

  const fermerDeclaration = () => {
    setModalDeclaration(false);
    setErreurMateriel('');
  };

  const declarer = async (e: FormEvent) => {
    e.preventDefault();
    if (!materielSelectionne) {
      setErreurMateriel('Sélectionnez un matériel dans la liste des suggestions.');
      return;
    }
    if (!peutDeclarerPanne(materielSelectionne.statut_materiel)) {
      setErreurMateriel(messageStatutMateriel);
      return;
    }
    setErreurMateriel('');
    setEnvoi(true);
    try {
      await declarerIncident({
        code_materiel: materielSelectionne.code_materiel,
        symptomes: formSymptomes,
        degre_urgence: formUrgence,
      });
      toast.succes('Panne declaree', `Un incident a ete cree pour ${materielSelectionne.code_materiel}.`);
      setModalDeclaration(false);
      setMaterielSelectionne(null); setFormSymptomes(''); setFormUrgence('MOYEN');
      await charger();
    } catch (err) { toast.erreur('Declaration refusee', extraireMessageErreur(err)); }
    finally { setEnvoi(false); }
  };

  const ouvrirDetail = async (incident: Incident) => {
    setDetailIncident(incident);
    setDetailNum(incident.num_incident);
    setChargementDetail(true);
    try {
      setDetailIncident(await obtenirIncident(incident.num_incident));
    } catch (err) {
      toast.erreur('Détail indisponible', extraireMessageErreur(err));
    } finally {
      setChargementDetail(false);
    }
  };

  const fermerDetail = () => {
    setDetailIncident(null);
    setDetailNum(null);
    setChargementDetail(false);
  };

  const intervenir = async (num: string) => {
    try {
      await intervenirIncident(num);
      toast.succes('Incident pris en charge', `Vous etes intervenant sur ${num}.`);
      await charger();
    } catch (err) { toast.erreur('Action impossible', extraireMessageErreur(err)); }
  };

  const cloturer = async (num: string) => {
    const ok = await confirmer({
      titre: 'Cloturer cet incident ?',
      message: `L'incident ${num} sera definitivement cloture.`,
      libelleConfirmer: 'Cloturer',
      ton: 'primaire',
    });
    if (!ok) return;
    try {
      await cloturerIncident(num);
      toast.succes('Incident cloture', `${num} est desormais cloture.`);
      await charger();
    } catch (err) { toast.erreur('Cloture impossible', extraireMessageErreur(err)); }
  };

  const rejeter = async (e: FormEvent) => {
    e.preventDefault();
    if (!modalRejet) return;
    setEnvoi(true);
    try {
      await rejeterIncident(modalRejet.num_incident, formMotif);
      toast.avertissement('Incident rejete', `${modalRejet.num_incident} a ete rejete.`);
      setModalRejet(null); setFormMotif('');
      await charger();
    } catch (err) { toast.erreur('Rejet impossible', extraireMessageErreur(err)); }
    finally { setEnvoi(false); }
  };

  const filtresActifs = q.trim() !== '' || filtreStatut !== '' || filtreUrgence !== '';

  const reinitialiserFiltres = () => {
    setQ('');
    setFiltreStatut('');
    setFiltreUrgence('');
    setPage(1);
  };

  const filtresResume: FiltreActif[] = [
    ...(q.trim() ? [{
      label: `Recherche : « ${q.trim()} »`,
      onSupprimer: () => { setQ(''); setPage(1); },
    }] : []),
    ...(filtreStatut ? [{
      label: `Statut : ${LIBELLE_STATUT[filtreStatut] ?? filtreStatut}`,
      onSupprimer: () => { setFiltreStatut(''); setPage(1); },
    }] : []),
    ...(filtreUrgence ? [{
      label: `Urgence : ${LIBELLE_URGENCE[filtreUrgence as DegreUrgence] ?? filtreUrgence}`,
      onSupprimer: () => { setFiltreUrgence(''); setPage(1); },
    }] : []),
  ];

  const fichesDetail = detailIncident?.fiches
    ?? (detailIncident?.fiche ? [detailIncident.fiche] : []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Declarations de pannes</h1>
        <BoutonCreation libelle="Déclarer une panne" onClick={ouvrirDeclaration} />
      </div>

      <div className="card">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <ChampRecherche
            label="Recherche"
            value={q}
            onChange={(valeur) => { setQ(valeur); setPage(1); }}
            placeholder="N° incident, matériel…"
            enveloppeClassName="w-full sm:max-w-xs"
          />
          <SelectFiltre
            id="filtre-statut"
            label="Statut"
            icone={<IconeStatut />}
            value={filtreStatut}
            onChange={(valeur) => { setFiltreStatut(valeur); setPage(1); }}
            enveloppeClassName="w-full sm:max-w-xs"
            options={[
              { value: '', label: 'Tous statuts' },
              ...STATUTS.map((s) => ({ value: s, label: LIBELLE_STATUT[s] ?? s })),
            ]}
          />
          <SelectFiltre
            id="filtre-urgence"
            label="Urgence"
            icone={<IconeUrgence />}
            value={filtreUrgence}
            onChange={(valeur) => { setFiltreUrgence(valeur); setPage(1); }}
            enveloppeClassName="w-full sm:max-w-xs"
            options={[
              { value: '', label: 'Toutes urgences' },
              ...URGENCES.map((u) => ({ value: u, label: LIBELLE_URGENCE[u] })),
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
          <SkeletonTableau lignes={6} colonnes={6} />
        ) : incidents.length === 0 ? (
          <EmptyState
            icone={filtresActifs ? <IconesEmpty.Recherche /> : <IconesEmpty.Alerte />}
            titre={filtresActifs ? 'Aucun incident ne correspond aux filtres' : 'Aucune panne declaree'}
            description={
              filtresActifs
                ? 'Ajustez les filtres pour elargir la recherche.'
                : 'Toutes les pannes du parc apparaitront ici. Declarez la premiere.'
            }
            ctaLabel={filtresActifs ? 'Reinitialiser les filtres' : '+ Declarer une panne'}
            ctaOnClick={
              filtresActifs
                ? reinitialiserFiltres
                : ouvrirDeclaration
            }
            filtreActif={filtresActifs}
          />
        ) : (
          <Tableau>
            <EnteteTableau colonnes={['N°', 'Materiel', 'Urgence', 'Statut', 'Declare le', 'Actions']} />
            <tbody>
              {incidents.map((inc) => {
                const ouvert = STATUTS_OUVERTS.includes(inc.statut_incident);
                const interventionOuverte = inc.intervention_ouverte === true;
                const dejaIntervenant = interventionOuverte && estDejaIntervenant(inc);
                return (
                  <tr key={inc.num_incident}>
                    <td className="font-medium">{inc.num_incident}</td>
                    <td>{inc.code_materiel}</td>
                    <td><Badge valeur={inc.degre_urgence} /></td>
                    <td><Badge valeur={inc.statut_incident} /></td>
                    <td className="text-xs text-slate-600">{formatDateSansHeure(inc.date_declaration)}</td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        <BoutonIcone
                          libelle="Détails de la déclaration"
                          icone="detail"
                          variante="secondaire"
                          onClick={() => void ouvrirDetail(inc)}
                        />
                        {estCadre && ouvert && !dejaIntervenant && (
                          <BoutonIcone
                            libelle={
                              interventionOuverte
                                ? 'Rejoindre l’intervention'
                                : inc.num_intervention
                                  ? 'Nouvelle intervention'
                                  : 'Intervenir sur l’incident'
                            }
                            icone="intervenir"
                            variante="primaire"
                            onClick={() => void intervenir(inc.num_incident)}
                          />
                        )}
                        {estCadre && ouvert && dejaIntervenant && (
                          <span className="badge bg-emerald-100 text-emerald-800">Vous intervenez</span>
                        )}
                        {inc.statut_incident === 'DECLARE' && (
                          <BoutonIcone
                            libelle="Rejeter la déclaration"
                            icone="rejeter"
                            variante="avertissement"
                            onClick={() => { setModalRejet(inc); setFormMotif(''); }}
                          />
                        )}
                        {inc.statut_incident === 'RESOLU' && (
                          <BoutonIcone
                            libelle="Clôturer l’incident"
                            icone="cloturer"
                            variante="succes"
                            onClick={() => void cloturer(inc.num_incident)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal
        ouvert={detailNum !== null}
        surtitre="Déclaration de panne"
        titre={detailIncident ? `Incident ${detailIncident.num_incident}` : `Incident ${detailNum ?? ''}`}
        onFermer={fermerDetail}
        piedDePage={
          <button type="button" className="btn-secondary" onClick={fermerDetail}>Fermer</button>
        }
      >
        {detailIncident ? (
          <div className="space-y-5">
            <SectionFormulaire
              titre="Informations générales"
              description="Déclarant, statut et niveau d'urgence de la panne."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <CarteInfo label="Statut" valeur={<Badge valeur={detailIncident.statut_incident} />} />
                <CarteInfo label="Urgence" valeur={<Badge valeur={detailIncident.degre_urgence} />} />
                <CarteInfo label="Déclaré le" valeur={formatDateAvecHeure(detailIncident.date_declaration)} />
                <CarteInfo
                  label="Déclarant"
                  valeur={
                    `${detailIncident.declarant_prenom ?? ''} ${detailIncident.declarant_nom ?? ''}`.trim()
                    || detailIncident.matricule_declarant
                    || 'Non renseigné'
                  }
                />
              </div>
            </SectionFormulaire>

            <SectionFormulaire titre="Matériel concerné">
              <div className="grid gap-3 sm:grid-cols-2">
                <CarteInfo label="Code matériel" valeur={detailIncident.code_materiel} />
                <CarteInfo
                  label="Marque / modèle"
                  valeur={
                    [detailIncident.marque, detailIncident.modele].filter(Boolean).join(' ')
                    || 'Non renseigné'
                  }
                />
                <CarteInfo label="Catégorie" valeur={detailIncident.type_categorie ?? 'Non renseignée'} />
                <CarteInfo label="Localisation" valeur={detailIncident.nom_service ?? 'Non renseignée'} />
              </div>
            </SectionFormulaire>

            <SectionFormulaire titre="Symptômes déclarés">
              <BlocTexte titre="Description" contenu={detailIncident.symptomes} />
            </SectionFormulaire>

            {detailIncident.motif_rejet && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-500">
                  Motif du rejet
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-rose-800">
                  {detailIncident.motif_rejet}
                </p>
              </div>
            )}

            <SectionFormulaire
              titre="Interventions"
              description={
                chargementDetail
                  ? 'Chargement du dossier complet…'
                  : fichesDetail.length > 0
                    ? `${fichesDetail.length} fiche(s) d’intervention`
                    : 'Aucune fiche d’intervention associée.'
              }
            >
              {chargementDetail ? (
                <p className="text-sm text-slate-500">Chargement du dossier complet…</p>
              ) : fichesDetail.length > 0 ? (
                <div className="space-y-4">
                  {fichesDetail.map((intervention) => (
                    <div
                      key={intervention.num_intervention}
                      className="space-y-4 rounded-xl border border-slate-200 bg-white p-3.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">
                          {intervention.num_intervention}
                        </p>
                        <span className={`badge ${intervention.date_fin ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-800'}`}>
                          {intervention.date_fin ? 'Terminée' : 'En cours'}
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <CarteInfo label="Type" valeur={intervention.type_maintenance} />
                        <CarteInfo
                          label="État final du matériel"
                          valeur={
                            intervention.statut_final_materiel
                              ? <Badge valeur={intervention.statut_final_materiel} />
                              : '—'
                          }
                        />
                        <CarteInfo label="Début" valeur={formatDateAvecHeure(intervention.date_debut)} />
                        <CarteInfo
                          label="Fin"
                          valeur={
                            intervention.date_fin
                              ? formatDateAvecHeure(intervention.date_fin)
                              : 'En cours'
                          }
                        />
                      </div>
                      {(intervention.intervenants ?? []).length > 0 && (
                        <div>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Intervenants
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {(intervention.intervenants ?? []).map((intervenant) => (
                              <div
                                key={intervenant.matricule_cadre}
                                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
                              >
                                <p className="text-sm font-medium text-slate-800">
                                  {intervenant.prenom} {intervenant.nom}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {intervenant.specialite} · {intervenant.matricule_cadre}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Comptes rendus
                        </p>
                        {(intervention.comptes_rendus ?? []).length === 0 ? (
                          <p className="text-sm italic text-slate-400">Aucun compte rendu.</p>
                        ) : (
                          <div className="space-y-2">
                            {(intervention.comptes_rendus ?? []).map((compte) => (
                              <div
                                key={compte.id_compte_rendu}
                                className="rounded-xl border border-slate-200 bg-white p-3.5"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-xs text-slate-500">
                                    {formatDateAvecHeure(compte.date_saisie)}
                                    {compte.auteur ? ` · ${compte.auteur}` : ''}
                                  </p>
                                  {compte.est_final && (
                                    <span className="badge bg-emerald-100 text-emerald-800">Final</span>
                                  )}
                                </div>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                  <BlocTexte titre="Diagnostic" contenu={compte.diagnostic} />
                                  <BlocTexte titre="Travaux réalisés" contenu={compte.travaux_realises} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic text-slate-400">
                  Aucune intervention n’a encore été enregistrée pour cet incident.
                </p>
              )}
            </SectionFormulaire>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Chargement…</p>
        )}
      </Modal>

      <Modal ouvert={modalDeclaration} titre="Declarer une panne"
        onFermer={fermerDeclaration}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={fermerDeclaration}>Annuler</button>
            <button
              type="submit"
              form="form-declaration"
              className="btn-primary"
              disabled={envoi || !materielSelectionne || !materielDeclarable}
            >
              {envoi ? 'Envoi...' : 'Declarer'}
            </button>
          </>
        }>
        <form id="form-declaration" onSubmit={declarer} className="space-y-5">
          <SectionFormulaire
            titre="Déclaration"
            description="Précisez le matériel concerné et la boucle de signalement pour la maintenance."
          >
            <FormGrid>
              <Champ
                label="Code matériel"
                requis
                aide={`Recherchez par code, marque, modèle ou n° de série. Statuts autorisés : ${STATUTS_DECLARATION_PANNE.join(', ')}.`}
              >
                <SelecteurMateriel
                  value={materielSelectionne}
                  onChange={(materiel) => {
                    setMaterielSelectionne(materiel);
                    setErreurMateriel('');
                  }}
                  erreur={erreurMateriel || messageStatutMateriel}
                />
              </Champ>
              <Champ label="Degré d'urgence">
                <SelectFiltre
                  value={formUrgence}
                  onChange={(valeur) => setFormUrgence(valeur as DegreUrgence)}
                  options={urgencesDisponibles.map((u) => ({ value: u, label: LIBELLE_URGENCE[u] }))}
                />
              </Champ>
            </FormGrid>
            <div className="mt-4">
              <Champ label="Symptômes" requis aide="Décrivez le problème en 5 caractères minimum.">
                <Textarea required minLength={5} rows={4} value={formSymptomes}
                  onChange={(e) => setFormSymptomes(e.target.value)} />
              </Champ>
            </div>
          </SectionFormulaire>
        </form>
      </Modal>

      <Modal ouvert={modalRejet !== null} titre={`Rejeter ${modalRejet?.num_incident ?? ''}`}
        onFermer={() => setModalRejet(null)}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalRejet(null)}>Annuler</button>
            <button type="submit" form="form-rejet" className="btn-danger" disabled={envoi}>
              {envoi ? 'Envoi...' : 'Rejeter'}
            </button>
          </>
        }>
        <form id="form-rejet" onSubmit={rejeter} className="space-y-5">
          <SectionFormulaire
            titre="Motif de rejet"
            description="Indiquez la raison précise qui justifie le refus de cette déclaration."
          >
            <Champ label="Motif du rejet" requis aide="Expliquez pourquoi cette déclaration est rejetée.">
              <Textarea required rows={4} value={formMotif} onChange={(e) => setFormMotif(e.target.value)} />
            </Champ>
          </SectionFormulaire>
        </form>
      </Modal>
    </div>
  );
}