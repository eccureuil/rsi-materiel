import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  creerMateriel, listerLocalisations, listerMateriels, modifierMateriel, supprimerMateriel,
} from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import BoutonCreation from '@/components/BoutonCreation';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import Badge from '@/components/Badge';
import {
  Champ, ChampRecherche, FormGrid, IconeCategorie, IconeLocalisation, IconeStatut, Input,
  ResumeFiltres, SectionFormulaire, SelectFiltre, Textarea, type FiltreActif,
} from '@/components/FormControls';
import {
  peutDeclarerPanne, STATUTS_DECLARATION_PANNE,
  type Localisation, type Materiel, type MaterielInput, type MaterielUpdateInput,
  type StatutMateriel, type TypeCategorie,
} from '@/types/api';
import { useDebounce } from '@/hooks/useDebounce';
import { Link, useSearchParams } from 'react-router-dom';
import EmptyState, { IconesEmpty } from '@/components/EmptyState';
import { BoutonIcone, IconeAction, LienIcone } from '@/components/BoutonIcone';
import { SkeletonTableau } from '@/components/Skeleton';
import { EnteteTableau, Tableau } from '@/components/Tableau';

function genererCodeMateriel(materiels: Materiel[]): string {
  const prefixe = 'MAT';
  const existants = materiels
    .filter((m) => m.code_materiel.startsWith(`${prefixe}-`))
    .map((m) => {
      const numero = parseInt(m.code_materiel.slice(prefixe.length + 1), 10);
      return Number.isNaN(numero) ? 0 : numero;
    });
  const prochain = (existants.length > 0 ? Math.max(...existants) : 0) + 1;
  return `${prefixe}-${String(prochain).padStart(4, '0')}`;
}

function formaterLocalisation(
  nomService: string | undefined,
  codeBureau: string | null | undefined,
  ville: string | undefined,
): string {
  const libelle = nomService ?? 'Localisation inconnue';
  return `${libelle}${codeBureau ? ` (${codeBureau})` : ''}${ville ? ` - ${ville}` : ''}`;
}

const STATUTS: StatutMateriel[] = ['STOCK', 'SERVICE', 'PANNE', 'MAINTENANCE', 'REFORME'];
const CATEGORIES: TypeCategorie[] = ['BUREAUTIQUE', 'OPERATIONNEL'];

const LIBELLE_STATUT: Record<StatutMateriel, string> = {
  STOCK: 'En stock',
  SERVICE: 'En service',
  PANNE: 'En panne',
  MAINTENANCE: 'En maintenance',
  REFORME: 'Réformé',
};

const LIBELLE_CATEGORIE: Record<TypeCategorie, string> = {
  BUREAUTIQUE: 'Bureautique',
  OPERATIONNEL: 'Opérationnel',
};

interface Formulaire {
  code_materiel: string;
  num_serie: string;
  marque: string;
  modele: string;
  date_acquisition: string;
  caracteristiques: string;
  type_categorie: TypeCategorie;
  type_equipement: string;
  systeme_aviation: string;
  id_localisation_origine: string;
}
const FORM_VIDE: Formulaire = {
  code_materiel: '', num_serie: '', marque: '', modele: '',
  date_acquisition: new Date().toISOString().slice(0, 10),
  caracteristiques: '', type_categorie: 'BUREAUTIQUE',
  type_equipement: '', systeme_aviation: '', id_localisation_origine: '',
};

interface MenuActionsMateriel {
  code: string;
  top: number;
  left: number;
}

const LARGEUR_MENU_ACTIONS = 224;

export default function InventaireMateriels() {
  const toast = useToast();
  const { confirmer } = useConfirm();

  const [materiels, setMateriels] = useState<Materiel[]>([]);
  const [localisations, setLocalisations] = useState<Localisation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chargement, setChargement] = useState(false);

  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const qDebounce = useDebounce(q, 300);
  const [filtreCategorie, setFiltreCategorie] = useState(searchParams.get('type_categorie') ?? '');
  const [filtreStatut, setFiltreStatut] = useState(searchParams.get('statut_materiel') ?? '');
  const [filtreLocalisation, setFiltreLocalisation] = useState(searchParams.get('id_localisation') ?? '');

  const [modalOuvert, setModalOuvert] = useState(false);
  const [modeEdition, setModeEdition] = useState<string | null>(null);
  const [materielEdite, setMaterielEdite] = useState<Materiel | null>(null);
  const [form, setForm] = useState<Formulaire>(FORM_VIDE);
  const [envoi, setEnvoi] = useState(false);
  const [menuActions, setMenuActions] = useState<MenuActionsMateriel | null>(null);
  const filtresActifs = q.trim() !== '' || filtreCategorie !== ''
    || filtreStatut !== '' || filtreLocalisation !== '';
  const localisationActive = localisations.find(
    (l) => String(l.id_localisation) === filtreLocalisation,
  );
  const libelleLocalisation = localisationActive
    ? `${localisationActive.nom_service}${localisationActive.code_bureau ? ` (${localisationActive.code_bureau})` : ''}`
    : `#${filtreLocalisation}`;
  const libelleCategorie = filtreCategorie
    ? LIBELLE_CATEGORIE[filtreCategorie as TypeCategorie] ?? filtreCategorie
    : '';
  const libelleStatut = filtreStatut
    ? LIBELLE_STATUT[filtreStatut as StatutMateriel] ?? filtreStatut
    : '';

  useEffect(() => {
    if (!menuActions) return;

    const fermerExterieur = (evenement: MouseEvent) => {
      if (!(evenement.target instanceof Element) || !evenement.target.closest('[data-menu-actions]')) {
        setMenuActions(null);
      }
    };
    const fermer = () => setMenuActions(null);

    document.addEventListener('mousedown', fermerExterieur);
    window.addEventListener('scroll', fermer, true);
    window.addEventListener('resize', fermer);

    return () => {
      document.removeEventListener('mousedown', fermerExterieur);
      window.removeEventListener('scroll', fermer, true);
      window.removeEventListener('resize', fermer);
    };
  }, [menuActions]);

  const basculerMenuActions = (code: string, bouton: HTMLButtonElement) => {
    setMenuActions((actuel) => {
      if (actuel?.code === code) return null;
      const zone = bouton.getBoundingClientRect();
      const hauteurEstimee = 104;
      const top = zone.bottom + 6 + hauteurEstimee > window.innerHeight
        ? Math.max(8, zone.top - hauteurEstimee - 6)
        : zone.bottom + 6;
      return {
        code,
        top,
        left: Math.max(8, Math.min(
          zone.right - LARGEUR_MENU_ACTIONS,
          window.innerWidth - LARGEUR_MENU_ACTIONS - 8,
        )),
      };
    });
  };

  const reinitialiserFiltres = () => {
    setQ('');
    setFiltreCategorie('');
    setFiltreStatut('');
    setFiltreLocalisation('');
    setPage(1);
  };

  const filtresResume: FiltreActif[] = [
    ...(q.trim() ? [{
      label: `Recherche : « ${q.trim()} »`,
      onSupprimer: () => { setQ(''); setPage(1); },
    }] : []),
    ...(filtreCategorie ? [{
      label: `Catégorie : ${libelleCategorie}`,
      onSupprimer: () => { setFiltreCategorie(''); setPage(1); },
    }] : []),
    ...(filtreStatut ? [{
      label: `Statut : ${libelleStatut}`,
      onSupprimer: () => { setFiltreStatut(''); setPage(1); },
    }] : []),
    ...(filtreLocalisation ? [{
      label: `Localisation actuelle : ${libelleLocalisation}`,
      onSupprimer: () => { setFiltreLocalisation(''); setPage(1); },
    }] : []),
  ];

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await listerMateriels({
        q: qDebounce.trim() || undefined,
        type_categorie: filtreCategorie || undefined,
        statut_materiel: filtreStatut || undefined,
        id_localisation: filtreLocalisation ? Number(filtreLocalisation) : undefined,
        page, limit: 20,
      });
      setMateriels(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      toast.erreur('Chargement impossible', extraireMessageErreur(err));
    } finally {
      setChargement(false);
    }
  }, [qDebounce, filtreCategorie, filtreStatut, filtreLocalisation, page, toast]);

  useEffect(() => { void charger(); }, [charger]);
  useEffect(() => {
    listerLocalisations()
      .then(setLocalisations)
      .catch((err) => toast.erreur('Localisations indisponibles', extraireMessageErreur(err)));
  }, [toast]);

  const ouvrirCreation = () => {
    setModeEdition(null);
    setMaterielEdite(null);
    const codeAuto = genererCodeMateriel(materiels);
    setForm({ ...FORM_VIDE, code_materiel: codeAuto, type_categorie: 'BUREAUTIQUE' });
    setModalOuvert(true);
  };

  const ouvrirEdition = (m: Materiel) => {
    setModeEdition(m.code_materiel);
    setMaterielEdite(m);
    setForm({
      code_materiel: m.code_materiel,
      num_serie: m.num_serie ?? '',
      marque: m.marque ?? '',
      modele: m.modele ?? '',
      date_acquisition: m.date_acquisition,
      caracteristiques: m.caracteristiques ?? '',
      type_categorie: m.type_categorie,
      type_equipement: m.type_equipement ?? '',
      systeme_aviation: m.systeme_aviation ?? '',
      id_localisation_origine: String(m.id_localisation_origine),
    });
    setModalOuvert(true);
  };

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    try {
      const base: MaterielUpdateInput = {
        num_serie: form.num_serie || undefined,
        marque: form.marque || undefined,
        modele: form.modele || undefined,
        date_acquisition: form.date_acquisition,
        caracteristiques: form.caracteristiques || undefined,
        type_categorie: form.type_categorie,
        type_equipement: form.type_equipement || undefined,
        systeme_aviation: form.systeme_aviation || undefined,
      };
      if (modeEdition) {
        await modifierMateriel(modeEdition, base);
        toast.succes('Matériel modifié', `La fiche ${modeEdition} a été mise à jour.`);
      } else {
        const input: MaterielInput = {
          ...base,
          code_materiel: form.code_materiel,
          id_localisation_origine: Number(form.id_localisation_origine),
        };
        await creerMateriel(input);
        toast.succes('Matériel créé', `${form.code_materiel} a été ajouté à l’inventaire.`);
      }
      setModalOuvert(false);
      await charger();
    } catch (err) {
      toast.erreur('Enregistrement refusé', extraireMessageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  const supprimer = async (code: string) => {
    const ok = await confirmer({
      titre: 'Supprimer ce matériel ?',
      message: `Le matériel ${code} sera définitivement supprimé. Cette action est irréversible.`,
      libelleConfirmer: 'Supprimer',
      ton: 'danger',
    });
    if (!ok) return;
    try {
      await supprimerMateriel(code);
      toast.succes('Matériel supprimé', `${code} a été retiré de l’inventaire.`);
      await charger();
    } catch (err) {
      toast.erreur('Suppression impossible', extraireMessageErreur(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Inventaire des matériels</h1>
        <BoutonCreation libelle="Nouveau matériel" onClick={ouvrirCreation} />
      </div>

      <div className="card">
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.35fr)] xl:items-end">
          <ChampRecherche
            id="filtre-recherche"
            label="Recherche"
            value={q}
            onChange={(valeur) => { setQ(valeur); setPage(1); }}
            placeholder="Code, marque ou modèle…"
          />

          <SelectFiltre
            id="filtre-categorie"
            label="Catégorie"
            icone={<IconeCategorie />}
            value={filtreCategorie}
            onChange={(valeur) => { setFiltreCategorie(valeur); setPage(1); }}
            options={[
              { value: '', label: 'Toutes catégories' },
              ...CATEGORIES.map((c) => ({ value: c, label: LIBELLE_CATEGORIE[c] })),
            ]}
          />

          <SelectFiltre
            id="filtre-statut"
            label="Statut"
            icone={<IconeStatut />}
            value={filtreStatut}
            onChange={(valeur) => { setFiltreStatut(valeur); setPage(1); }}
            options={[
              { value: '', label: 'Tous statuts' },
              ...STATUTS.map((s) => ({ value: s, label: LIBELLE_STATUT[s] })),
            ]}
          />

          <SelectFiltre
            id="filtre-localisation"
            label="Localisation actuelle"
            icone={<IconeLocalisation />}
            value={filtreLocalisation}
            onChange={(valeur) => { setFiltreLocalisation(valeur); setPage(1); }}
            options={[
              { value: '', label: 'Toutes les localisations' },
              ...localisations.map((l) => ({
                value: String(l.id_localisation),
                label: `${l.nom_service} — ${l.ville}`,
              })),
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
        ) : materiels.length === 0 ? (
          <EmptyState
            icone={filtresActifs ? <IconesEmpty.Recherche /> : <IconesEmpty.Boite />}
            titre={filtresActifs ? 'Aucun materiel ne correspond a vos filtres' : 'Aucun materiel dans l\'inventaire'}
            description={
              filtresActifs
                ? 'Essayez d\'elargir la recherche ou de retirer un filtre.'
                : 'Ajoutez votre premier materiel pour demarrer l\'inventaire.'
            }
            ctaLabel={filtresActifs ? undefined : '+ Nouveau materiel'}
            ctaOnClick={filtresActifs ? reinitialiserFiltres : ouvrirCreation}
            filtreActif={filtresActifs}
          />
        ) : (
          <Tableau>
            <EnteteTableau colonnes={['Code', 'Catégorie', 'Marque / Modèle', 'Statut', 'Localisation actuelle', 'Actions']} />
            <tbody>
              {materiels.map((m) => (
                <tr key={m.code_materiel}>
                  <td className="font-medium">{m.code_materiel}</td>
                  <td>{m.type_categorie}</td>
                  <td>{m.marque} {m.modele}</td>
                  <td><Badge valeur={m.statut_materiel} /></td>
                  <td>
                    {m.nom_service ?? `#${m.id_localisation}`}{m.code_bureau ? ` (${m.code_bureau})` : ''}
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <LienIcone to={`/materiels/${m.code_materiel}/historique`} libelle="Voir l'historique" icone="historique" />
                      <BoutonIcone libelle="Modifier le matériel" icone="modifier" onClick={() => ouvrirEdition(m)} />
                      <BoutonIcone libelle="Supprimer le matériel" icone="supprimer" variante="danger" onClick={() => void supprimer(m.code_materiel)} />
                      <div className="relative" data-menu-actions>
                        <BoutonIcone
                          libelle="Plus d’actions"
                          icone="options"
                          onClick={(evenement) => basculerMenuActions(m.code_materiel, evenement.currentTarget)}
                        />
                        {menuActions?.code === m.code_materiel && (
                          <div
                            role="menu"
                            className="fixed z-50 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
                            style={{ top: menuActions.top, left: menuActions.left }}
                          >
                            <Link
                              role="menuitem"
                              to={`/affectations?materiel=${encodeURIComponent(m.code_materiel)}`}
                              onClick={() => setMenuActions(null)}
                              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                            >
                              <span className="text-asecna-bleu"><IconeAction nom="mouvement" /></span>
                              Mouvement
                            </Link>
                            {peutDeclarerPanne(m.statut_materiel) ? (
                              <Link
                                role="menuitem"
                                to={`/pannes?materiel=${encodeURIComponent(m.code_materiel)}`}
                                onClick={() => setMenuActions(null)}
                                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                              >
                                <span className="text-amber-600"><IconeAction nom="declarationPanne" /></span>
                                Déclarer une panne
                              </Link>
                            ) : (
                              <span
                                role="menuitem"
                                aria-disabled="true"
                                title={`Statuts autorisés : ${STATUTS_DECLARATION_PANNE.join(', ')}.`}
                                className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400"
                              >
                                <span className="text-slate-300"><IconeAction nom="declarationPanne" /></span>
                                Déclarer une panne
                                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide">
                                  Indisponible
                                </span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </div>

      <p className="text-sm text-slate-600">{total} matériel(s) au total.</p>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal ouvert={modalOuvert} titre={modeEdition ? `Modifier ${modeEdition}` : 'Nouveau matériel'}
        onFermer={() => setModalOuvert(false)}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOuvert(false)}>Annuler</button>
            <button type="submit" form="form-materiel" className="btn-primary" disabled={envoi}>
              {envoi ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </>
        }>
        <form id="form-materiel" onSubmit={soumettre} className="space-y-5">
          <SectionFormulaire
            titre="Identification"
            description="Références uniques et caractéristiques techniques du matériel."
          >
            <FormGrid>
              <Champ label="Code matériel" aide="Généré automatiquement à la création.">
                <Input
                  required
                  value={form.code_materiel}
                  readOnly
                  disabled
                  className="font-mono"
                />
              </Champ>
              <Champ label="N° série">
                <Input value={form.num_serie} onChange={(e) => setForm({ ...form, num_serie: e.target.value })} />
              </Champ>
              <Champ label="Marque">
                <Input
                  autoFocus
                  value={form.marque}
                  onChange={(e) => setForm({ ...form, marque: e.target.value })}
                />
              </Champ>
              <Champ label="Modèle">
                <Input value={form.modele} onChange={(e) => setForm({ ...form, modele: e.target.value })} />
              </Champ>
              <Champ label="Catégorie" requis>
                <SelectFiltre
                  required
                  value={form.type_categorie}
                  disabled={!!modeEdition}
                  onChange={(valeur) => {
                    const nouvelle = valeur as TypeCategorie;
                    setForm({
                      ...form,
                      type_categorie: nouvelle,
                      type_equipement: nouvelle === 'BUREAUTIQUE' ? form.type_equipement : '',
                      systeme_aviation: nouvelle === 'OPERATIONNEL' ? form.systeme_aviation : '',
                    });
                  }}
                  options={CATEGORIES.map((c) => ({ value: c, label: LIBELLE_CATEGORIE[c] }))}
                />
              </Champ>
              {form.type_categorie === 'BUREAUTIQUE' ? (
                <Champ label="Type d'équipement" optionnel>
                  <Input
                    value={form.type_equipement}
                    onChange={(e) => setForm({ ...form, type_equipement: e.target.value })}
                    placeholder="Ex. Ordinateur portable, imprimante..."
                  />
                </Champ>
              ) : (
                <Champ label="Système aviation" optionnel>
                  <Input
                    value={form.systeme_aviation}
                    onChange={(e) => setForm({ ...form, systeme_aviation: e.target.value })}
                    placeholder="Ex. Système de suivi de vol, radar..."
                  />
                </Champ>
              )}
            </FormGrid>
            <div className="mt-4">
              <Champ label="Caractéristiques" optionnel>
                <Textarea rows={3} value={form.caracteristiques}
                  onChange={(e) => setForm({ ...form, caracteristiques: e.target.value })} />
              </Champ>
            </div>
          </SectionFormulaire>

          <SectionFormulaire
            titre="Suivi"
            description="Le statut et la localisation actuelle évoluent via le workflow. La localisation d'origine est figée à la création."
          >
            <FormGrid>
              {modeEdition ? (
                <Champ
                  label="Statut"
                  aide="Le statut est en lecture seule : il évolue via le workflow."
                >
                  <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-100/70 px-3">
                    {materielEdite ? <Badge valeur={materielEdite.statut_materiel} /> : null}
                  </div>
                </Champ>
              ) : (
                <Champ
                  label="Statut"
                  aide="Le statut initial est toujours STOCK ; il évolue ensuite via le workflow."
                >
                  <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-100/70 px-3">
                    <Badge valeur="STOCK" />
                  </div>
                </Champ>
              )}
              <Champ label="Date d’acquisition" requis>
                <Input type="date" required value={form.date_acquisition}
                  onChange={(e) => setForm({ ...form, date_acquisition: e.target.value })} />
              </Champ>
              {modeEdition ? (
                <>
                  <Champ
                    label="Localisation actuelle"
                    aide="Elle évolue via les affectations, mutations et restitutions."
                  >
                    <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-100/70 px-3 text-sm text-slate-700">
                      {materielEdite
                        ? formaterLocalisation(
                            materielEdite.nom_service,
                            materielEdite.code_bureau,
                            materielEdite.ville,
                          )
                        : '—'}
                    </div>
                  </Champ>
                  <Champ
                    label="Localisation d'origine"
                    aide="Elle est figée à la création du matériel."
                  >
                    <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-100/70 px-3 text-sm text-slate-700">
                      {materielEdite
                        ? formaterLocalisation(
                            materielEdite.origine_nom_service,
                            materielEdite.origine_code_bureau,
                            materielEdite.origine_ville,
                          )
                        : '—'}
                    </div>
                  </Champ>
                </>
              ) : (
                <Champ
                  label="Localisation d'origine"
                  requis
                  className="sm:col-span-2"
                  aide="Localisation initiale du matériel avant tout mouvement."
                >
                  <SelectFiltre
                    required
                    value={form.id_localisation_origine}
                    onChange={(valeur) => setForm({ ...form, id_localisation_origine: valeur })}
                    placeholder="— Choisir —"
                    options={[
                      { value: '', label: '— Choisir —' },
                      ...localisations.map((l) => ({
                        value: String(l.id_localisation),
                        label: `${l.nom_service}${l.code_bureau ? ` — ${l.code_bureau}` : ''} (${l.ville})`,
                      })),
                    ]}
                  />
                </Champ>
              )}
            </FormGrid>
          </SectionFormulaire>
        </form>
      </Modal>
    </div>
  );
}
