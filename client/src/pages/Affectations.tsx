import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  creerAffectation, listerAffectations, listerLocalisations,
  listerMateriels, urlPdfBon,
} from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import Badge from '@/components/Badge';
import EmptyState, { IconesEmpty } from '@/components/EmptyState';
import { SkeletonTableau } from '@/components/Skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { Champ, Input, Select, Textarea } from '@/components/FormControls';
import {
  TYPES_MOUVEMENT,
  type Affectation, type BonDecharge, type Localisation,
  type Materiel, type TypeMouvement,
} from '@/types/api';

interface Formulaire {
  code_materiel: string;
  type_mouvement: TypeMouvement;
  id_localisation: string;
  agent_beneficiaire: string;
  motif_mouvement: string;
  generer_bon: boolean;
}
const FORM_VIDE: Formulaire = {
  code_materiel: '',
  type_mouvement: 'AFFECTATION',
  id_localisation: '',
  agent_beneficiaire: '',
  motif_mouvement: '',
  generer_bon: false,
};

export default function Affectations() {
  const toast = useToast();

  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chargement, setChargement] = useState(false);

  const [filtreCode, setFiltreCode] = useState('');
  const [filtreType, setFiltreType] = useState<'' | TypeMouvement>('');
  const filtreCodeDebounce = useDebounce(filtreCode, 300);

  const [modalOuvert, setModalOuvert] = useState(false);
  const [form, setForm] = useState<Formulaire>(FORM_VIDE);
  const [envoi, setEnvoi] = useState(false);

  const [materiels, setMateriels] = useState<Materiel[]>([]);
  const [localisations, setLocalisations] = useState<Localisation[]>([]);

  const [bonGenere, setBonGenere] = useState<BonDecharge | null>(null);

  // Materiel actuellement selectionne dans le formulaire (pour afficher l'origine)
  const materielSelectionne = useMemo(
    () => materiels.find((m) => m.code_materiel === form.code_materiel) ?? null,
    [materiels, form.code_materiel],
  );

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await listerAffectations({
        code_materiel: filtreCodeDebounce.trim() || undefined,
        type_mouvement: filtreType || undefined,
        page, limit: 20,
      });
      setAffectations(res.items);
      setTotalPages(res.totalPages);
    } catch (err) {
      toast.erreur('Chargement impossible', extraireMessageErreur(err));
    } finally {
      setChargement(false);
    }
  }, [filtreCodeDebounce, filtreType, page, toast]);

  useEffect(() => { void charger(); }, [charger]);

  const ouvrirCreation = async () => {
    setForm(FORM_VIDE);
    setModalOuvert(true);
    try {
      const [m, l] = await Promise.all([
        listerMateriels({ limit: 100 }),
        listerLocalisations(),
      ]);
      setMateriels(m.items);
      setLocalisations(l);
    } catch (err) {
      toast.erreur('References indisponibles', extraireMessageErreur(err));
    }
  };

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    try {
      const res = await creerAffectation({
        code_materiel: form.code_materiel.trim(),
        type_mouvement: form.type_mouvement,
        id_localisation: Number(form.id_localisation),
        agent_beneficiaire: form.agent_beneficiaire.trim(),
        motif_mouvement: form.motif_mouvement.trim() || undefined,
        generer_bon: form.generer_bon,
      });
      if (res.bon) {
        toast.succes('Mouvement enregistre avec bon',
          `${form.type_mouvement} : ${form.code_materiel} - bon ${res.bon.num_bon}.`);
        setBonGenere(res.bon);
      } else {
        toast.succes('Mouvement enregistre',
          `${form.type_mouvement} : ${form.code_materiel} (sans bon).`);
      }
      setModalOuvert(false);
      await charger();
    } catch (err) {
      toast.erreur('Mouvement refuse', extraireMessageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  const urlPdf = bonGenere ? urlPdfBon(bonGenere) : null;
  const filtresActifs = filtreCode.trim() !== '' || filtreType !== '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Affectations et mouvements</h1>
        <button className="btn-primary" onClick={() => void ouvrirCreation()}>+ Nouveau mouvement</button>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <Input placeholder="Code materiel..." value={filtreCode}
          onChange={(e) => { setFiltreCode(e.target.value); setPage(1); }} className="max-w-xs" />
        <Select value={filtreType}
          onChange={(e) => { setFiltreType(e.target.value as '' | TypeMouvement); setPage(1); }} className="max-w-xs">
          <option value="">Tous types</option>
          {TYPES_MOUVEMENT.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
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
            ctaOnClick={filtresActifs
              ? () => { setFiltreCode(''); setFiltreType(''); }
              : () => void ouvrirCreation()}
            filtreActif={filtresActifs}
          />
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Date', 'Materiel', 'Type', 'Origine', 'Destination', 'Beneficiaire', 'Bon', 'Motif'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {affectations.map((a) => (
                <tr key={a.id_affectation} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-600">{a.date_mouvement}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.code_materiel}</p>
                    <p className="text-xs text-slate-500">{a.marque} {a.modele}</p>
                  </td>
                  <td className="px-4 py-3"><Badge valeur={a.type_mouvement} /></td>
                  <td className="px-4 py-3 text-slate-700">
                    {a.origine_nom_service
                      ? <>
                          {a.origine_nom_service}
                          {a.origine_code_bureau ? ` (${a.origine_code_bureau})` : ''}
                          {a.origine_ville ? <span className="block text-xs text-slate-500">{a.origine_ville}</span> : null}
                        </>
                      : <span className="text-slate-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {a.nom_service}
                    {a.code_bureau ? ` (${a.code_bureau})` : ''}
                    {a.ville ? <span className="block text-xs text-slate-500">{a.ville}</span> : null}
                  </td>
                  <td className="px-4 py-3">{a.agent_beneficiaire}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.num_bon ?? '-'}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-slate-600">{a.motif_mouvement ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {/* Modal creation */}
      <Modal ouvert={modalOuvert} titre="Nouveau mouvement"
        onFermer={() => setModalOuvert(false)}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOuvert(false)}>Annuler</button>
            <button type="submit" form="form-affectation" className="btn-primary" disabled={envoi}>
              {envoi ? 'Envoi...' : 'Enregistrer'}
            </button>
          </>
        }>
        <form id="form-affectation" onSubmit={soumettre} className="space-y-4">
          <Champ label="Materiel *">
            <Select required value={form.code_materiel}
              onChange={(e) => setForm({ ...form, code_materiel: e.target.value })}>
              <option value="">- Choisir -</option>
              {materiels.map((m) => (
                <option key={m.code_materiel} value={m.code_materiel}>
                  {m.code_materiel} - {m.marque} {m.modele} [{m.statut_materiel}]
                </option>
              ))}
            </Select>
          </Champ>

          {materielSelectionne && (
            <div className="rounded-md bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
              <p className="text-slate-700">
                <span className="font-semibold">Origine actuelle :</span>{' '}
                {materielSelectionne.nom_service ?? `Localisation #${materielSelectionne.id_localisation}`}
                {materielSelectionne.code_bureau ? ` (${materielSelectionne.code_bureau})` : ''}
                {materielSelectionne.ville ? ` - ${materielSelectionne.ville}` : ''}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Statut : {materielSelectionne.statut_materiel} - categorie : {materielSelectionne.type_categorie}
              </p>
            </div>
          )}

          <Champ label="Type de mouvement *">
            <Select required value={form.type_mouvement}
              onChange={(e) => setForm({ ...form, type_mouvement: e.target.value as TypeMouvement })}>
              {TYPES_MOUVEMENT.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Champ>
          <p className="text-xs text-slate-500">
            Regles : AFFECTATION (Stock - Service) - MUTATION (Service, autre localisation) - RESTITUTION (Service - Stock).
          </p>

          <Champ label="Localisation destination *">
            <Select required value={form.id_localisation}
              onChange={(e) => setForm({ ...form, id_localisation: e.target.value })}>
              <option value="">- Choisir -</option>
              {localisations.map((l) => (
                <option key={l.id_localisation} value={l.id_localisation}>
                  {l.nom_service}{l.code_bureau ? ` - ${l.code_bureau}` : ''} ({l.ville})
                </option>
              ))}
            </Select>
          </Champ>
          <Champ label="Agent beneficiaire *">
            <Input required maxLength={100} value={form.agent_beneficiaire}
              onChange={(e) => setForm({ ...form, agent_beneficiaire: e.target.value })} />
          </Champ>
          <Champ label="Motif (optionnel, max. 1000)">
            <Textarea rows={3} maxLength={1000} value={form.motif_mouvement}
              onChange={(e) => setForm({ ...form, motif_mouvement: e.target.value })} />
          </Champ>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.generer_bon}
              onChange={(e) => setForm({ ...form, generer_bon: e.target.checked })} />
            Generer un bon de decharge
            <span className="text-xs text-slate-500">(optionnel)</span>
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
            <p><span className="font-semibold">Date :</span> {bonGenere.date_mouvement}</p>
            <p><span className="font-semibold">Beneficiaire :</span> {bonGenere.agent_beneficiaire}</p>
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