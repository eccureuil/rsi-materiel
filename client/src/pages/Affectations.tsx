import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  creerAffectation, listerAffectations, listerLocalisations,
  listerMateriels, urlPdfBon,
} from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useToast } from '@/components/Toast';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import Badge from '@/components/Badge';
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
}
const FORM_VIDE: Formulaire = {
  code_materiel: '',
  type_mouvement: 'AFFECTATION',
  id_localisation: '',
  agent_beneficiaire: '',
  motif_mouvement: '',
};

export default function Affectations() {
  const toast = useToast();

  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chargement, setChargement] = useState(false);

  const [filtreCode, setFiltreCode] = useState('');
  const [filtreType, setFiltreType] = useState<'' | TypeMouvement>('');

  const [modalOuvert, setModalOuvert] = useState(false);
  const [form, setForm] = useState<Formulaire>(FORM_VIDE);
  const [envoi, setEnvoi] = useState(false);

  const [materiels, setMateriels] = useState<Materiel[]>([]);
  const [localisations, setLocalisations] = useState<Localisation[]>([]);

  const [bonGenere, setBonGenere] = useState<BonDecharge | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await listerAffectations({
        code_materiel: filtreCode.trim() || undefined,
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
  }, [filtreCode, filtreType, page, toast]);

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
      });
      toast.succes(
        'Mouvement enregistre',
        `${form.type_mouvement} : ${form.code_materiel} - bon ${res.bon.num_bon}.`,
      );
      setBonGenere(res.bon);
      setModalOuvert(false);
      await charger();
    } catch (err) {
      toast.erreur('Mouvement refuse', extraireMessageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  const urlPdf = bonGenere ? urlPdfBon(bonGenere) : null;

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
        {chargement && <p className="p-4 text-sm text-slate-500">Chargement...</p>}
        {!chargement && affectations.length === 0 && (
          <p className="p-4 text-sm text-slate-500">Aucun mouvement enregistre.</p>
        )}
        {!chargement && affectations.length > 0 && (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Date', 'Materiel', 'Type', 'Beneficiaire', 'Destination', 'Bon', 'Motif'].map((h) => (
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
                  <td className="px-4 py-3">{a.agent_beneficiaire}</td>
                  <td className="px-4 py-3">{a.nom_service}{a.code_bureau ? ` (${a.code_bureau})` : ''}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.num_bon ?? '-'}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-slate-600">{a.motif_mouvement ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

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
        </form>
      </Modal>

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