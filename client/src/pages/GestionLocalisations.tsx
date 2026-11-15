import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  creerLocalisation, listerLocalisations, listerMateriels, modifierLocalisation, supprimerLocalisation,
} from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import BoutonCreation from '@/components/BoutonCreation';
import Modal from '@/components/Modal';
import { Champ, ChampRecherche, Input } from '@/components/FormControls';
import Badge from '@/components/Badge';
import type { Localisation, LocalisationInput, Materiel } from '@/types/api';
import { SkeletonTableau } from '@/components/Skeleton';
import { BoutonIcone } from '@/components/BoutonIcone';
import EmptyState, { IconesEmpty } from '@/components/EmptyState';
import { EnteteTableau, Tableau } from '@/components/Tableau';

interface Formulaire { nom_service: string; code_bureau: string; ville: string; }
const FORM_VIDE: Formulaire = { nom_service: '', code_bureau: '', ville: '' };

async function listerMaterielsLocalisation(idLocalisation: number): Promise<Materiel[]> {
  const materiels: Materiel[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const resultat = await listerMateriels({ id_localisation: idLocalisation, page, limit: 100 });
    materiels.push(...resultat.items);
    totalPages = resultat.totalPages;
    page += 1;
  } while (page <= totalPages);

  return materiels;
}

export default function GestionLocalisations() {
  const toast = useToast();
  const { confirmer } = useConfirm();

  const [localisations, setLocalisations] = useState<Localisation[]>([]);
  const [chargement, setChargement] = useState(false);
  const [recherche, setRecherche] = useState('');

  const [modalOuvert, setModalOuvert] = useState(false);
  const [modeEdition, setModeEdition] = useState<number | null>(null);
  const [form, setForm] = useState<Formulaire>(FORM_VIDE);
  const [envoi, setEnvoi] = useState(false);
  const [detailLocalisation, setDetailLocalisation] = useState<Localisation | null>(null);
  const [materielsLocalisation, setMaterielsLocalisation] = useState<Materiel[]>([]);
  const [chargementMateriels, setChargementMateriels] = useState(false);
  const requeteDetail = useRef(0);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setLocalisations(await listerLocalisations());
    } catch (err) {
      toast.erreur('Chargement impossible', extraireMessageErreur(err));
    } finally {
      setChargement(false);
    }
  }, [toast]);

  useEffect(() => { void charger(); }, [charger]);

  const ouvrirCreation = () => {
    setModeEdition(null); setForm(FORM_VIDE); setModalOuvert(true);
  };
  const ouvrirEdition = (l: Localisation) => {
    setModeEdition(l.id_localisation);
    setForm({
      nom_service: l.nom_service,
      code_bureau: l.code_bureau ?? '',
      ville: l.ville,
    });
    setModalOuvert(true);
  };

  const ouvrirDetail = async (l: Localisation) => {
    const numeroRequete = requeteDetail.current + 1;
    requeteDetail.current = numeroRequete;
    setDetailLocalisation(l);
    setMaterielsLocalisation([]);
    setChargementMateriels(true);

    try {
      const materiels = await listerMaterielsLocalisation(l.id_localisation);
      if (requeteDetail.current !== numeroRequete) return;
      setMaterielsLocalisation(materiels);
    } catch (err) {
      if (requeteDetail.current !== numeroRequete) return;
      toast.erreur('Chargement impossible', extraireMessageErreur(err));
    } finally {
      if (requeteDetail.current === numeroRequete) setChargementMateriels(false);
    }
  };

  const fermerDetail = () => {
    requeteDetail.current += 1;
    setDetailLocalisation(null);
    setMaterielsLocalisation([]);
    setChargementMateriels(false);
  };

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    try {
      const input: LocalisationInput = {
        nom_service: form.nom_service.trim(),
        code_bureau: form.code_bureau.trim() || undefined,
        ville: form.ville.trim() || undefined,
      };
      if (modeEdition !== null) {
        await modifierLocalisation(modeEdition, input);
        toast.succes('Localisation modifiée', `« ${input.nom_service} » a été mise à jour.`);
      } else {
        await creerLocalisation(input);
        toast.succes('Localisation créée', `« ${input.nom_service} » a été ajoutée.`);
      }
      setModalOuvert(false);
      await charger();
    } catch (err) {
      toast.erreur('Enregistrement refusé', extraireMessageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  const supprimer = async (l: Localisation) => {
    const ok = await confirmer({
      titre: 'Supprimer cette localisation ?',
      message: `« ${l.nom_service} » sera définitivement supprimée. Refusé si des matériels y sont rattachés.`,
      libelleConfirmer: 'Supprimer',
      ton: 'danger',
    });
    if (!ok) return;
    try {
      await supprimerLocalisation(l.id_localisation);
      toast.succes('Localisation supprimée', `« ${l.nom_service} » a été retirée.`);
      await charger();
    } catch (err) {
      toast.erreur('Suppression impossible', extraireMessageErreur(err));
    }
  };

  const filtrees = localisations.filter((l) => {
    const t = recherche.trim().toLowerCase();
    if (!t) return true;
    return l.nom_service.toLowerCase().includes(t)
      || (l.code_bureau ?? '').toLowerCase().includes(t)
      || l.ville.toLowerCase().includes(t);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Gestion des localisations</h1>
        <BoutonCreation libelle="Nouvelle localisation" onClick={ouvrirCreation} />
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <ChampRecherche
          label="Recherche"
          value={recherche}
          onChange={setRecherche}
          placeholder="Service, bureau ou ville…"
          enveloppeClassName="w-full sm:max-w-sm"
        />
        <span className="ml-auto flex h-11 items-center text-sm text-slate-600">
          {filtrees.length} / {localisations.length} localisation(s)
        </span>
      </div>

      <div className="card overflow-hidden">
        {chargement ? (
          <SkeletonTableau lignes={5} colonnes={5} />
        ) : filtrees.length === 0 ? (
          <EmptyState
            icone={recherche.trim() !== '' ? <IconesEmpty.Recherche /> : <IconesEmpty.Boite />}
            titre={recherche.trim() !== '' ? 'Aucune localisation trouvee' : 'Aucune localisation'}
            description={
              recherche.trim() !== ''
                ? 'Aucune localisation ne correspond a votre recherche.'
                : 'Creez votre premiere localisation pour affecter des materiaux.'
            }
            ctaLabel={recherche.trim() !== '' ? undefined : '+ Nouvelle localisation'}
            ctaOnClick={recherche.trim() !== '' ? () => setRecherche('') : ouvrirCreation}
            filtreActif={recherche.trim() !== ''}
          />
        ) : (
          <Tableau>
            <EnteteTableau colonnes={['Service', 'Code bureau', 'Ville', 'Matériels', 'Actions']} />
            <tbody>
              {filtrees.map((l) => (
                <tr key={l.id_localisation}>
                  <td className="font-medium text-slate-900">{l.nom_service}</td>
                  <td className="text-slate-700">{l.code_bureau ?? '—'}</td>
                  <td className="text-slate-700">{l.ville}</td>
                  <td className="text-slate-700">{l.nb_materiels ?? 0}</td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      <BoutonIcone
                        libelle="Voir les matériels de la localisation"
                        icone="detail"
                        onClick={() => void ouvrirDetail(l)}
                      />
                      <BoutonIcone libelle="Modifier la localisation" icone="modifier" onClick={() => ouvrirEdition(l)} />
                      <BoutonIcone libelle="Supprimer la localisation" icone="supprimer" variante="danger" onClick={() => void supprimer(l)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </div>

      <Modal ouvert={modalOuvert} titre={modeEdition !== null ? 'Modifier la localisation' : 'Nouvelle localisation'}
        onFermer={() => setModalOuvert(false)}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOuvert(false)}>Annuler</button>
            <button type="submit" form="form-localisation" className="btn-primary" disabled={envoi}>
              {envoi ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </>
        }>
        <form id="form-localisation" onSubmit={soumettre} className="space-y-5">
          <Champ label="Nom du service" requis>
            <Input required value={form.nom_service}
              onChange={(e) => setForm({ ...form, nom_service: e.target.value })} />
          </Champ>
          <Champ label="Code bureau" optionnel>
            <Input value={form.code_bureau} onChange={(e) => setForm({ ...form, code_bureau: e.target.value })} />
          </Champ>
          <Champ label="Ville" optionnel aide="Antananarivo est utilisée par défaut si le champ est vide.">
            <Input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })}
              placeholder="Antananarivo" />
          </Champ>
        </form>
      </Modal>

      <Modal
        ouvert={detailLocalisation !== null}
        surtitre="Localisation"
        titre={detailLocalisation?.nom_service ?? ''}
        onFermer={fermerDetail}
        piedDePage={
          <button type="button" className="btn-secondary" onClick={fermerDetail}>Fermer</button>
        }
      >
        {detailLocalisation && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Service</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{detailLocalisation.nom_service}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Bureau</p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {detailLocalisation.code_bureau ?? 'Non renseigné'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Ville</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{detailLocalisation.ville}</p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Matériels actuellement dans cette localisation</p>
                {!chargementMateriels && (
                  <span className="text-xs text-slate-500">{materielsLocalisation.length} matériel(s)</span>
                )}
              </div>

              {chargementMateriels ? (
                <SkeletonTableau lignes={4} colonnes={4} />
              ) : materielsLocalisation.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Aucun matériel dans cette localisation.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <Tableau>
                    <EnteteTableau colonnes={['Code matériel', 'Marque', 'Modèle', 'Statut']} />
                    <tbody>
                      {materielsLocalisation.map((materiel) => (
                        <tr key={materiel.code_materiel}>
                          <td className="font-medium text-slate-900">{materiel.code_materiel}</td>
                          <td className="text-slate-700">{materiel.marque ?? '—'}</td>
                          <td className="text-slate-700">{materiel.modele ?? '—'}</td>
                          <td><Badge valeur={materiel.statut_materiel} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </Tableau>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}