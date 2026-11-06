import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  cloturerIncident, declarerIncident, intervenirIncident, listerIncidents, rejeterIncident,
} from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import Badge from '@/components/Badge';
import { Champ, Input, Select, Textarea } from '@/components/FormControls';
import type { DegreUrgence, Incident } from '@/types/api';

const URGENCES: DegreUrgence[] = ['FAIBLE', 'MOYEN', 'URGENT', 'CRITIQUE'];
const STATUTS = ['DECLARE', 'PRISE_EN_CHARGE', 'EN_COURS', 'RESOLU', 'CLOTURE', 'REJETE'];

export default function DeclarationsPannes() {
  const { hasRole } = useAuth();
  const toast = useToast();
  const { confirmer } = useConfirm();
  const estCadre = hasRole('CADRE_MAINTENANCE');

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chargement, setChargement] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreUrgence, setFiltreUrgence] = useState('');
  const [q, setQ] = useState('');

  const [modalDeclaration, setModalDeclaration] = useState(false);
  const [modalRejet, setModalRejet] = useState<Incident | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formSymptomes, setFormSymptomes] = useState('');
  const [formUrgence, setFormUrgence] = useState<DegreUrgence>('MOYEN');
  const [formMotif, setFormMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await listerIncidents({
        q: q || undefined,
        statut_incident: filtreStatut || undefined,
        degre_urgence: filtreUrgence || undefined,
        page, limit: 20,
      });
      setIncidents(res.items);
      setTotalPages(res.totalPages);
    } catch (err) { toast.erreur('Chargement impossible', extraireMessageErreur(err)); }
    finally { setChargement(false); }
  }, [q, filtreStatut, filtreUrgence, page, toast]);

  useEffect(() => { void charger(); }, [charger]);

  const declarer = async (e: FormEvent) => {
    e.preventDefault(); setEnvoi(true);
    try {
      await declarerIncident({ code_materiel: formCode.trim(), symptomes: formSymptomes, degre_urgence: formUrgence });
      toast.succes('Panne déclarée', `Un incident a été créé pour ${formCode}.`);
      setModalDeclaration(false);
      setFormCode(''); setFormSymptomes(''); setFormUrgence('MOYEN');
      await charger();
    } catch (err) { toast.erreur('Déclaration refusée', extraireMessageErreur(err)); }
    finally { setEnvoi(false); }
  };

  const intervenir = async (num: string) => {
    try {
      await intervenirIncident(num);
      toast.succes('Incident pris en charge', `Vous êtes intervenant sur ${num}.`);
      await charger();
    } catch (err) { toast.erreur('Action impossible', extraireMessageErreur(err)); }
  };

  const cloturer = async (num: string) => {
    const ok = await confirmer({
      titre: 'Clôturer cet incident ?',
      message: `L’incident ${num} sera définitivement clôturé.`,
      libelleConfirmer: 'Clôturer',
      ton: 'primaire',
    });
    if (!ok) return;
    try {
      await cloturerIncident(num);
      toast.succes('Incident clôturé', `${num} est désormais clôturé.`);
      await charger();
    } catch (err) { toast.erreur('Clôture impossible', extraireMessageErreur(err)); }
  };

  const rejeter = async (e: FormEvent) => {
    e.preventDefault();
    if (!modalRejet) return;
    setEnvoi(true);
    try {
      await rejeterIncident(modalRejet.num_incident, formMotif);
      toast.avertissement('Incident rejeté', `${modalRejet.num_incident} a été rejeté.`);
      setModalRejet(null); setFormMotif('');
      await charger();
    } catch (err) { toast.erreur('Rejet impossible', extraireMessageErreur(err)); }
    finally { setEnvoi(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Déclarations de pannes</h1>
        <button className="btn-primary" onClick={() => setModalDeclaration(true)}>+ Déclarer une panne</button>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <Input placeholder="Rechercher…" value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
        <Select value={filtreStatut}
          onChange={(e) => { setFiltreStatut(e.target.value); setPage(1); }} className="max-w-xs">
          <option value="">Tous statuts</option>
          {STATUTS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
        <Select value={filtreUrgence}
          onChange={(e) => { setFiltreUrgence(e.target.value); setPage(1); }} className="max-w-xs">
          <option value="">Toutes urgences</option>
          {URGENCES.map((u) => <option key={u} value={u}>{u}</option>)}
        </Select>
      </div>

      <div className="card overflow-hidden">
        {chargement && <p className="p-4 text-sm text-slate-500">Chargement…</p>}
        {!chargement && incidents.length === 0 && <p className="p-4 text-sm text-slate-500">Aucun incident.</p>}
        {!chargement && incidents.length > 0 && (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['N°', 'Matériel', 'Urgence', 'Statut', 'Déclaré le', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {incidents.map((inc) => {
                const ouvert = ['DECLARE', 'PRISE_EN_CHARGE', 'EN_COURS'].includes(inc.statut_incident);
                return (
                  <tr key={inc.num_incident} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{inc.num_incident}</td>
                    <td className="px-4 py-3">{inc.code_materiel}</td>
                    <td className="px-4 py-3"><Badge valeur={inc.degre_urgence} /></td>
                    <td className="px-4 py-3"><Badge valeur={inc.statut_incident} /></td>
                    <td className="px-4 py-3 text-xs text-slate-600">{inc.date_declaration}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {estCadre && inc.statut_incident === 'DECLARE' && (
                          <button className="btn-primary" onClick={() => void intervenir(inc.num_incident)}>Intervenir</button>
                        )}
                        {ouvert && (
                          <button className="btn-warning" onClick={() => { setModalRejet(inc); setFormMotif(''); }}>Rejeter</button>
                        )}
                        {inc.statut_incident === 'RESOLU' && (
                          <button className="btn-success" onClick={() => void cloturer(inc.num_incident)}>Clôturer</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal ouvert={modalDeclaration} titre="Déclarer une panne"
        onFermer={() => setModalDeclaration(false)}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalDeclaration(false)}>Annuler</button>
            <button type="submit" form="form-declaration" className="btn-primary" disabled={envoi}>
              {envoi ? 'Envoi…' : 'Déclarer'}
            </button>
          </>
        }>
        <form id="form-declaration" onSubmit={declarer} className="space-y-4">
          <Champ label="Code matériel *">
            <Input required value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="Ex. MAT-001" />
          </Champ>
          <Champ label="Symptômes (min. 5 caractères) *">
            <Textarea required minLength={5} rows={4} value={formSymptomes}
              onChange={(e) => setFormSymptomes(e.target.value)} />
          </Champ>
          <Champ label="Degré d’urgence">
            <Select value={formUrgence} onChange={(e) => setFormUrgence(e.target.value as DegreUrgence)}>
              {URGENCES.map((u) => <option key={u} value={u}>{u}</option>)}
            </Select>
          </Champ>
        </form>
      </Modal>

      <Modal ouvert={modalRejet !== null} titre={`Rejeter ${modalRejet?.num_incident ?? ''}`}
        onFermer={() => setModalRejet(null)}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalRejet(null)}>Annuler</button>
            <button type="submit" form="form-rejet" className="btn-danger" disabled={envoi}>
              {envoi ? 'Envoi…' : 'Rejeter'}
            </button>
          </>
        }>
        <form id="form-rejet" onSubmit={rejeter} className="space-y-4">
          <Champ label="Motif du rejet *">
            <Textarea required rows={4} value={formMotif} onChange={(e) => setFormMotif(e.target.value)} />
          </Champ>
        </form>
      </Modal>
    </div>
  );
}