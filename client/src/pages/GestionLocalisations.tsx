import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  creerLocalisation, listerLocalisations, modifierLocalisation, supprimerLocalisation,
} from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import Modal from '@/components/Modal';
import { Champ, Input } from '@/components/FormControls';
import type { Localisation, LocalisationInput } from '@/types/api';

interface Formulaire { nom_service: string; code_bureau: string; ville: string; }
const FORM_VIDE: Formulaire = { nom_service: '', code_bureau: '', ville: '' };

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
        <button className="btn-primary" onClick={ouvrirCreation}>+ Nouvelle localisation</button>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <Input placeholder="Rechercher (service, bureau, ville…)" value={recherche}
          onChange={(e) => setRecherche(e.target.value)} className="max-w-sm" />
        <span className="ml-auto self-center text-sm text-slate-600">
          {filtrees.length} / {localisations.length} localisation(s)
        </span>
      </div>

      <div className="card overflow-hidden">
        {chargement && <p className="p-4 text-sm text-slate-500">Chargement…</p>}
        {!chargement && filtrees.length === 0 && <p className="p-4 text-sm text-slate-500">Aucune localisation.</p>}
        {!chargement && filtrees.length > 0 && (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Service', 'Code bureau', 'Ville', 'Matériels', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtrees.map((l) => (
                <tr key={l.id_localisation} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{l.nom_service}</td>
                  <td className="px-4 py-3 text-slate-700">{l.code_bureau ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{l.ville}</td>
                  <td className="px-4 py-3 text-slate-700">{l.nb_materiels ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="btn-secondary" onClick={() => ouvrirEdition(l)}>Modifier</button>
                      <button className="btn-danger" onClick={() => void supprimer(l)}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        <form id="form-localisation" onSubmit={soumettre} className="space-y-4">
          <Champ label="Nom du service *">
            <Input required value={form.nom_service}
              onChange={(e) => setForm({ ...form, nom_service: e.target.value })} />
          </Champ>
          <Champ label="Code bureau">
            <Input value={form.code_bureau} onChange={(e) => setForm({ ...form, code_bureau: e.target.value })} />
          </Champ>
          <Champ label="Ville">
            <Input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })}
              placeholder="Antananarivo (par défaut)" />
          </Champ>
        </form>
      </Modal>
    </div>
  );
}