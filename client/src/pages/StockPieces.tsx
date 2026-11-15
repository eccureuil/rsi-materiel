import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ajusterPiece, approvisionnerPiece, creerPiece, listerPieces,
  modifierPiece, supprimerPiece,
} from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import BoutonCreation from '@/components/BoutonCreation';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import {
  Champ, ChampFiltre, ChampRecherche, FormGrid, IconeAlerte, Input, ResumeFiltres,
  SectionFormulaire, type FiltreActif,
} from '@/components/FormControls';
import type { Piece, PieceInput } from '@/types/api';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearchParams } from 'react-router-dom';
import { SkeletonTableau } from '@/components/Skeleton';
import { BoutonIcone } from '@/components/BoutonIcone';
import EmptyState, { IconesEmpty } from '@/components/EmptyState';
import { EnteteTableau, Tableau } from '@/components/Tableau';

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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chargement, setChargement] = useState(false);

  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const qDebounce = useDebounce(q, 300);
  const [sousSeuil, setSousSeuil] = useState(searchParams.get('sous_seuil') === 'true');
  const filtresActifs = q.trim() !== '' || sousSeuil;

  const reinitialiserFiltres = () => {
    setQ('');
    setSousSeuil(false);
    setPage(1);
  };

  const filtresResume: FiltreActif[] = [
    ...(q.trim() ? [{
      label: `Recherche : « ${q.trim()} »`,
      onSupprimer: () => { setQ(''); setPage(1); },
    }] : []),
    ...(sousSeuil ? [{
      label: 'Alerte stock uniquement',
      onSupprimer: () => { setSousSeuil(false); setPage(1); },
    }] : []),
  ];

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
        q: qDebounce.trim() || undefined,
        sous_seuil: sousSeuil ? true : undefined,
        page, limit: 20,
      });
      setPieces(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      toast.erreur('Chargement impossible', extraireMessageErreur(err));
    } finally {
      setChargement(false);
    }
  }, [qDebounce, sousSeuil, page, toast]);

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
        <BoutonCreation libelle="Nouvelle pièce" onClick={ouvrirCreation} />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <ChampRecherche
            label="Recherche"
            value={q}
            onChange={(valeur) => { setQ(valeur); setPage(1); }}
            placeholder="Référence ou désignation…"
            enveloppeClassName="w-full sm:max-w-xs"
          />
          <ChampFiltre label="Alerte stock" icone={<IconeAlerte />} className="w-full sm:w-auto">
            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={sousSeuil}
                onChange={(e) => { setSousSeuil(e.target.checked); setPage(1); }}
                  className="case"
              />
              Uniquement les pièces en alerte
            </label>
          </ChampFiltre>
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
        ) : pieces.length === 0 ? (
          <EmptyState
            icone={filtresActifs ? <IconesEmpty.Recherche /> : <IconesEmpty.Boite />}
            titre={filtresActifs ? 'Aucune piece ne correspond' : 'Aucune piece en stock'}
            description={
              filtresActifs
                ? 'Elargissez la recherche ou desactivez "Uniquement les pieces en alerte".'
                : 'Ajoutez vos premieres pieces detachees pour suivre le stock.'
            }
            ctaLabel={filtresActifs ? undefined : '+ Nouvelle piece'}
            ctaOnClick={filtresActifs ? reinitialiserFiltres : ouvrirCreation}
            filtreActif={filtresActifs}
          />
        ) : (
          <Tableau>
            <EnteteTableau colonnes={['Référence', 'Désignation', 'Stock', 'Seuil', 'État', 'Actions']} />
            <tbody>
              {pieces.map((p) => (
                <tr key={p.ref_piece} className={p.en_alerte ? 'bg-red-50 hover:bg-red-100' : undefined}>
                  <td className="font-medium">{p.ref_piece}</td>
                  <td>{p.designation}</td>
                  <td>{p.quantite_en_stock}</td>
                  <td>{p.seuil_minimum}</td>
                  <td>
                    {p.en_alerte
                      ? <span className="badge bg-red-100 text-red-800">En alerte</span>
                      : <span className="badge bg-emerald-100 text-emerald-800">OK</span>}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      <BoutonIcone libelle="Modifier la pièce" icone="modifier" onClick={() => ouvrirEdition(p)} />
                      <BoutonIcone libelle="Approvisionner la pièce" icone="approvisionner" variante="succes" onClick={() => ouvrirAppro(p)} />
                      <BoutonIcone libelle="Ajuster le stock" icone="ajuster" variante="avertissement" onClick={() => ouvrirAjust(p)} />
                      <BoutonIcone libelle="Supprimer la pièce" icone="supprimer" variante="danger" onClick={() => void supprimer(p)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
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
        <form id="form-piece-creation" onSubmit={soumettreCreation} className="space-y-5">
          <SectionFormulaire
            titre="Pièce"
            description="Renseignez les informations de base et les seuils de suivi du stock."
          >
            <FormGrid>
              <Champ label="Référence" requis>
                <Input required value={form.ref_piece}
                  onChange={(e) => setForm({ ...form, ref_piece: e.target.value })} />
              </Champ>
              <Champ label="Quantité initiale" requis>
                <Input type="number" min={0} required value={form.quantite_en_stock}
                  onChange={(e) => setForm({ ...form, quantite_en_stock: e.target.value })} />
              </Champ>
              <div className="sm:col-span-2">
                <Champ label="Désignation" requis>
                  <Input required value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })} />
                </Champ>
              </div>
              <div className="sm:col-span-2">
                <Champ label="Seuil minimum" requis aide="Déclenche l'alerte de stock.">
                  <Input type="number" min={0} required value={form.seuil_minimum}
                    onChange={(e) => setForm({ ...form, seuil_minimum: e.target.value })} />
                </Champ>
              </div>
            </FormGrid>
          </SectionFormulaire>
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
        <form id="form-piece-edition" onSubmit={soumettreEdition} className="space-y-5">
          <SectionFormulaire
            titre="Mise à jour"
            description="Modifiez le libellé et le seuil de vigilance de la pièce."
          >
            <FormGrid>
              <div className="sm:col-span-2">
                <Champ label="Désignation" requis>
                  <Input required value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })} />
                </Champ>
              </div>
              <div className="sm:col-span-2">
                <Champ label="Seuil minimum" requis aide="Déclenche l'alerte de stock.">
                  <Input type="number" min={0} required value={form.seuil_minimum}
                    onChange={(e) => setForm({ ...form, seuil_minimum: e.target.value })} />
                </Champ>
              </div>
            </FormGrid>
          </SectionFormulaire>
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
        <form id="form-appro" onSubmit={soumettreAppro} className="space-y-5">
          <SectionFormulaire
            titre="Approvisionnement"
            description="Ajoutez la quantité nécessaire au stock de cette pièce."
          >
            <Champ label="Quantité à ajouter" requis>
              <Input type="number" min={1} required value={qteMouv}
                onChange={(e) => setQteMouv(e.target.value)} />
            </Champ>
          </SectionFormulaire>
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
        <form id="form-ajust" onSubmit={soumettreAjust} className="space-y-5">
          <SectionFormulaire
            titre="Ajustement"
            description="Corrigez le stock et précisez le motif associé."
          >
            <FormGrid>
              <Champ label="Nouvelle quantité en stock" requis>
                <Input type="number" min={0} required value={qteMouv}
                  onChange={(e) => setQteMouv(e.target.value)} />
              </Champ>
              <Champ label="Motif" requis aide="Précisez la raison de l'ajustement.">
                <Input required value={motifAjust} onChange={(e) => setMotifAjust(e.target.value)}
                  placeholder="Ex. inventaire physique, casse…" />
              </Champ>
            </FormGrid>
          </SectionFormulaire>
        </form>
      </Modal>
    </div>
  );
}