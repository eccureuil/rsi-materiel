import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  creerMateriel, listerLocalisations, listerMateriels, modifierMateriel, supprimerMateriel,
} from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import Badge from '@/components/Badge';
import { Champ, Input, Select, Textarea } from '@/components/FormControls';
import type {
  Localisation, Materiel, MaterielInput, MaterielUpdateInput, StatutMateriel, TypeCategorie,
} from '@/types/api';

const STATUTS: StatutMateriel[] = ['STOCK', 'SERVICE', 'PANNE', 'MAINTENANCE', 'REFORME'];
const CATEGORIES: TypeCategorie[] = ['BUREAUTIQUE', 'OPERATIONNEL'];

interface Formulaire {
  code_materiel: string;
  num_serie: string;
  marque: string;
  modele: string;
  date_acquisition: string;
  statut_materiel: StatutMateriel;
  caracteristiques: string;
  type_categorie: TypeCategorie;
  type_equipement: string;
  systeme_aviation: string;
  id_localisation: string;
}
const FORM_VIDE: Formulaire = {
  code_materiel: '', num_serie: '', marque: '', modele: '',
  date_acquisition: new Date().toISOString().slice(0, 10),
  statut_materiel: 'STOCK', caracteristiques: '', type_categorie: 'BUREAUTIQUE',
  type_equipement: '', systeme_aviation: '', id_localisation: '',
};

export default function InventaireMateriels() {
  const toast = useToast();
  const { confirmer } = useConfirm();

  const [materiels, setMateriels] = useState<Materiel[]>([]);
  const [localisations, setLocalisations] = useState<Localisation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chargement, setChargement] = useState(false);

  const [q, setQ] = useState('');
  const [filtreCategorie, setFiltreCategorie] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');

  const [modalOuvert, setModalOuvert] = useState(false);
  const [modeEdition, setModeEdition] = useState<string | null>(null);
  const [form, setForm] = useState<Formulaire>(FORM_VIDE);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await listerMateriels({
        q: q || undefined,
        type_categorie: filtreCategorie || undefined,
        statut_materiel: filtreStatut || undefined,
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
  }, [q, filtreCategorie, filtreStatut, page, toast]);

  useEffect(() => { void charger(); }, [charger]);
  useEffect(() => {
    listerLocalisations()
      .then(setLocalisations)
      .catch((err) => toast.erreur('Localisations indisponibles', extraireMessageErreur(err)));
  }, [toast]);

  const ouvrirCreation = () => {
    setModeEdition(null);
    setForm(FORM_VIDE);
    setModalOuvert(true);
  };

  const ouvrirEdition = (m: Materiel) => {
    setModeEdition(m.code_materiel);
    setForm({
      code_materiel: m.code_materiel,
      num_serie: m.num_serie ?? '',
      marque: m.marque ?? '',
      modele: m.modele ?? '',
      date_acquisition: m.date_acquisition,
      statut_materiel: m.statut_materiel,
      caracteristiques: m.caracteristiques ?? '',
      type_categorie: m.type_categorie,
      type_equipement: m.type_equipement ?? '',
      systeme_aviation: m.systeme_aviation ?? '',
      id_localisation: String(m.id_localisation),
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
        statut_materiel: form.statut_materiel,
        caracteristiques: form.caracteristiques || undefined,
        type_categorie: form.type_categorie,
        type_equipement: form.type_equipement || undefined,
        systeme_aviation: form.systeme_aviation || undefined,
        id_localisation: Number(form.id_localisation),
      };
      if (modeEdition) {
        await modifierMateriel(modeEdition, base);
        toast.succes('Matériel modifié', `La fiche ${modeEdition} a été mise à jour.`);
      } else {
        const input: MaterielInput = { ...base, code_materiel: form.code_materiel };
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
        <button className="btn-primary" onClick={ouvrirCreation}>+ Nouveau matériel</button>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <Input placeholder="Rechercher (code, marque, modèle…)" value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
        <Select value={filtreCategorie}
          onChange={(e) => { setFiltreCategorie(e.target.value); setPage(1); }} className="max-w-xs">
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={filtreStatut}
          onChange={(e) => { setFiltreStatut(e.target.value); setPage(1); }} className="max-w-xs">
          <option value="">Tous statuts</option>
          {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>

      <div className="card overflow-hidden">
        {chargement && <p className="p-4 text-sm text-slate-500">Chargement…</p>}
        {!chargement && materiels.length === 0 && <p className="p-4 text-sm text-slate-500">Aucun matériel.</p>}
        {!chargement && materiels.length > 0 && (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Code', 'Catégorie', 'Marque / Modèle', 'Statut', 'Localisation', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {materiels.map((m) => (
                <tr key={m.code_materiel} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{m.code_materiel}</td>
                  <td className="px-4 py-3">{m.type_categorie}</td>
                  <td className="px-4 py-3">{m.marque} {m.modele}</td>
                  <td className="px-4 py-3"><Badge valeur={m.statut_materiel} /></td>
                  <td className="px-4 py-3">
                    {m.nom_service ?? `#${m.id_localisation}`}{m.code_bureau ? ` (${m.code_bureau})` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="btn-secondary" onClick={() => ouvrirEdition(m)}>Modifier</button>
                      <button className="btn-danger" onClick={() => void supprimer(m.code_materiel)}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        <form id="form-materiel" onSubmit={soumettre} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Champ label="Code matériel *">
            <Input required value={form.code_materiel} disabled={!!modeEdition}
              onChange={(e) => setForm({ ...form, code_materiel: e.target.value })}
              placeholder="^[A-Za-z0-9._-]{1,30}$" />
          </Champ>
          <Champ label="N° série">
            <Input value={form.num_serie} onChange={(e) => setForm({ ...form, num_serie: e.target.value })} />
          </Champ>
          <Champ label="Marque">
            <Input value={form.marque} onChange={(e) => setForm({ ...form, marque: e.target.value })} />
          </Champ>
          <Champ label="Modèle">
            <Input value={form.modele} onChange={(e) => setForm({ ...form, modele: e.target.value })} />
          </Champ>
          <Champ label="Date d’acquisition *">
            <Input type="date" required value={form.date_acquisition}
              onChange={(e) => setForm({ ...form, date_acquisition: e.target.value })} />
          </Champ>
          <Champ label="Catégorie *">
            <Select required value={form.type_categorie}
              onChange={(e) => setForm({ ...form, type_categorie: e.target.value as TypeCategorie })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Champ>
          <Champ label="Statut">
            <Select value={form.statut_materiel}
              onChange={(e) => setForm({ ...form, statut_materiel: e.target.value as StatutMateriel })}>
              {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Champ>
          <Champ label="Localisation *">
            <Select required value={form.id_localisation}
              onChange={(e) => setForm({ ...form, id_localisation: e.target.value })}>
              <option value="">— Choisir —</option>
              {localisations.map((l) => (
                <option key={l.id_localisation} value={l.id_localisation}>
                  {l.nom_service}{l.code_bureau ? ` — ${l.code_bureau}` : ''} ({l.ville})
                </option>
              ))}
            </Select>
          </Champ>
          <Champ label="Type d’équipement">
            <Input value={form.type_equipement}
              onChange={(e) => setForm({ ...form, type_equipement: e.target.value })} />
          </Champ>
          <Champ label="Système aviation">
            <Input value={form.systeme_aviation}
              onChange={(e) => setForm({ ...form, systeme_aviation: e.target.value })} />
          </Champ>
          <div className="md:col-span-2">
            <Champ label="Caractéristiques">
              <Textarea rows={3} value={form.caracteristiques}
                onChange={(e) => setForm({ ...form, caracteristiques: e.target.value })} />
            </Champ>
          </div>
        </form>
      </Modal>
    </div>
  );
}