import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ajusterPiece, approvisionnerPiece, creerPiece, listerPieces,
  modifierPiece, supprimerPiece,
} from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import { Champ, Input } from '@/components/FormControls';
import type { Piece, PieceInput } from '@/types/api';

interface Formulaire {
  ref_piece: string;
  designation: string;
  quantite_en_stock: string;
  seuil_minimum: string;
}
const FORM_VIDE: Formulaire = { ref_piece: '', designation: '', quantite_en_stock: '0', seuil_minimum: '0' };

type ModalType = 'creation' | 'edition' | 'appro' | 'ajust' | null;

export default function StockPieces() {
  const toast = useToast();
  const { confirmer } = useConfirm();

  const [pieces, setPieces] = useState<Piece[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chargement, setChargement] = useState(false);

  const [q, setQ] = useState('');
  const [sousSeuil, setSousSeuil] = useState(false);

  const [modal, setModal] = useState<ModalType>(null);
  const [cible, setCible] = useState<Piece | null>(null);
  const [form, setForm] = useState<Formulaire>(FORM_VIDE);
  const [qteMouv, setQteMouv] = useState('1');
  const [motifAjust, setMotifAjust] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await listerPieces({
        q: q || undefined,
        sous_seuil: sousSeuil ? true : undefined,
        page, limit: 20,
      });
      setPieces(res.items);
      setTotalPages(res.totalPages);
    } catch (err) { toast.erreur('Chargement impossible', extraireMessageErreur(err)); }
    finally { setChargement(false); }
  }, [q, sousSeuil, page, toast]);

  useEffect(() => { void charger(); }, [charger]);

  const ouvrirCreation = () => { setForm(FORM_VIDE); setCible(null); setModal('creation'); };
  const ouvrirEdition = (p: Piece) => {
    setCible(p);
    setForm({
      ref_piece: p.ref_piece,
      designation: p.designation,
      quantite_en_stock: String(p.quantite_en_stock),
      seuil_minimum: String(p.seuil_minimum),
    });
    setModal('edition');
  };
  const ouvrirAppro = (p: Piece) => { setCible(p); setQteMouv('1'); setModal('appro'); };
  const ouvrirAjust = (p: Piece) => {
    setCible(p); setQteMouv(String(p.quantite_en_stock)); setMotifAjust(''); setModal('ajust');
  };
  const fermer = () => { setModal(null); setCible(null); };

  const soumettreCreation = async (e: FormEvent) => {
    e.preventDefault(); setEnvoi(true);
    try {
      const input: PieceInput = {
        ref_piece: form.ref_piece.trim(),
        designation: form.designation.trim(),
        quantite_en_stock: Number(form.quantite_en_stock),
        seuil_minimum: Number(form.seuil_minimum),
      };
      await creerPiece(input);
      toast.succes('Pièce créée', `${input.ref_piece} a été ajoutée au stock.`);
      fermer(); await charger();
    } catch (err) { toast.erreur('Création refusée', extraireMessageErreur(err)); }
    finally { setEnvoi(false); }
  };

  const soumettreEdition = async (e: FormEvent) => {
    e.preventDefault();
    if (!cible) return;
    setEnvoi(true);
    try {
      await modifierPiece(cible.ref_piece, {
        designation: form.designation.trim(),
        seuil_minimum: Number(form.seuil_minimum),
      });
      toast.succes('Pièce modifiée', `${cible.ref_piece} a été mise à jour.`);
      fermer(); await charger();
    } catch (err) { toast.erreur('Modification refusée', extraireMessageErreur(err)); }
    finally { setEnvoi(false); }
  };

  const soumettreAppro = async (e: FormEvent) => {
    e.preventDefault();
    if (!cible) return;
    setEnvoi(true);
    try {
      await approvisionnerPiece(cible.ref_piece, Number(qteMouv));
      toast.succes('Approvisionnement enregistré', `+${qteMouv} pour ${cible.ref_piece}.`);
      fermer(); await charger();
    } catch (err) { toast.erreur('Approvisionnement refusé', extraireMessageErreur(err)); }
    finally { setEnvoi(false); }
  };

  const soumettreAjust = async (e: FormEvent) => {
    e.preventDefault();
    if (!cible) return;
    setEnvoi(true);
    try {
      await ajusterPiece(cible.ref_piece, Number(qteMouv), motifAjust);
      toast.info('Ajustement effectué', `${cible.ref_piece} : stock fixé à ${qteMouv}.`);
      fermer(); await charger();
    } catch (err) { toast.erreur('Ajustement refusé', extraireMessageErreur(err)); }
    finally { setEnvoi(false); }
  };

  const supprimer = async (p: Piece) => {
    const ok = await confirmer({
      titre: 'Supprimer cette pièce ?',
      message: `La pièce ${p.ref_piece} sera définitivement supprimée. Refusé si elle a été imputée.`,
      libelleConfirmer: 'Supprimer',
      ton: 'danger',
    });
    if (!ok) return;
    try {
      await supprimerPiece(p.ref_piece);
      toast.succes('Pièce supprimée', `${p.ref_piece} a été retirée du stock.`);
      await charger();
    } catch (err) { toast.erreur('Suppression impossible', extraireMessageErreur(err)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Stock de pièces</h1>
        <button className="btn-primary" onClick={ouvrirCreation}>+ Nouvelle pièce</button>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <Input placeholder="Rechercher (référence, désignation…)" value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={sousSeuil}
            onChange={(e) => { setSousSeuil(e.target.checked); setPage(1); }} />
          Uniquement les pièces en alerte
        </label>
      </div>

      <div className="card overflow-hidden">
        {chargement && <p className="p-4 text-sm text-slate-500">Chargement…</p>}
        {!chargement && pieces.length === 0 && <p className="p-4 text-sm text-slate-500">Aucune pièce.</p>}
        {!chargement && pieces.length > 0 && (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Référence', 'Désignation', 'Stock', 'Seuil', 'État', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pieces.map((p) => (
                <tr key={p.ref_piece} className={p.en_alerte ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'}>
                  <td className="px-4 py-3 font-medium">{p.ref_piece}</td>
                  <td className="px-4 py-3">{p.designation}</td>
                  <td className="px-4 py-3">{p.quantite_en_stock}</td>
                  <td className="px-4 py-3">{p.seuil_minimum}</td>
                  <td className="px-4 py-3">
                    {p.en_alerte
                      ? <span className="badge bg-red-100 text-red-800">En alerte</span>
                      : <span className="badge bg-emerald-100 text-emerald-800">OK</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-secondary" onClick={() => ouvrirEdition(p)}>Modifier</button>
                      <button className="btn-success" onClick={() => ouvrirAppro(p)}>Approvisionner</button>
                      <button className="btn-warning" onClick={() => ouvrirAjust(p)}>Ajuster</button>
                      <button className="btn-danger" onClick={() => void supprimer(p)}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal ouvert={modal === 'creation'} titre="Nouvelle pièce" onFermer={fermer}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={fermer}>Annuler</button>
            <button type="submit" form="form-piece-creation" className="btn-primary" disabled={envoi}>
              {envoi ? 'Enregistrement…' : 'Créer'}
            </button>
          </>
        }>
        <form id="form-piece-creation" onSubmit={soumettreCreation} className="space-y-4">
          <Champ label="Référence *">
            <Input required value={form.ref_piece}
              onChange={(e) => setForm({ ...form, ref_piece: e.target.value })} />
          </Champ>
          <Champ label="Désignation *">
            <Input required value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          </Champ>
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Quantité initiale *">
              <Input type="number" min={0} required value={form.quantite_en_stock}
                onChange={(e) => setForm({ ...form, quantite_en_stock: e.target.value })} />
            </Champ>
            <Champ label="Seuil minimum *">
              <Input type="number" min={0} required value={form.seuil_minimum}
                onChange={(e) => setForm({ ...form, seuil_minimum: e.target.value })} />
            </Champ>
          </div>
        </form>
      </Modal>

      <Modal ouvert={modal === 'edition'} titre={cible ? `Modifier ${cible.ref_piece}` : ''} onFermer={fermer}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={fermer}>Annuler</button>
            <button type="submit" form="form-piece-edition" className="btn-primary" disabled={envoi}>
              {envoi ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </>
        }>
        <form id="form-piece-edition" onSubmit={soumettreEdition} className="space-y-4">
          <Champ label="Désignation *">
            <Input required value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          </Champ>
          <Champ label="Seuil minimum *">
            <Input type="number" min={0} required value={form.seuil_minimum}
              onChange={(e) => setForm({ ...form, seuil_minimum: e.target.value })} />
          </Champ>
        </form>
      </Modal>

      <Modal ouvert={modal === 'appro'} titre={cible ? `Approvisionner ${cible.ref_piece}` : ''} onFermer={fermer}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={fermer}>Annuler</button>
            <button type="submit" form="form-appro" className="btn-success" disabled={envoi}>
              {envoi ? 'Envoi…' : 'Approvisionner'}
            </button>
          </>
        }>
        <form id="form-appro" onSubmit={soumettreAppro} className="space-y-4">
          <Champ label="Quantité à ajouter *">
            <Input type="number" min={1} required value={qteMouv}
              onChange={(e) => setQteMouv(e.target.value)} />
          </Champ>
        </form>
      </Modal>

      <Modal ouvert={modal === 'ajust'} titre={cible ? `Ajuster ${cible.ref_piece}` : ''} onFermer={fermer}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={fermer}>Annuler</button>
            <button type="submit" form="form-ajust" className="btn-warning" disabled={envoi}>
              {envoi ? 'Envoi…' : 'Ajuster'}
            </button>
          </>
        }>
        <form id="form-ajust" onSubmit={soumettreAjust} className="space-y-4">
          <Champ label="Nouvelle quantité en stock *">
            <Input type="number" min={0} required value={qteMouv}
              onChange={(e) => setQteMouv(e.target.value)} />
          </Champ>
          <Champ label="Motif *">
            <Input required value={motifAjust} onChange={(e) => setMotifAjust(e.target.value)}
              placeholder="Ex. inventaire physique, casse…" />
          </Champ>
        </form>
      </Modal>
    </div>
  );
}