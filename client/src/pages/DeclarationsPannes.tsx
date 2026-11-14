import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  cloturerIncident, declarerIncident, intervenirIncident,
  listerIncidents, rejeterIncident,
} from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { useDebounce } from '@/hooks/useDebounce';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import Badge from '@/components/Badge';
import EmptyState, { IconesEmpty } from '@/components/EmptyState';
import { SkeletonTableau } from '@/components/Skeleton';
import { Champ, Input, Select, Textarea } from '@/components/FormControls';
import type { DegreUrgence, Incident } from '@/types/api';

const URGENCES: DegreUrgence[] = ['FAIBLE', 'MOYEN', 'URGENT', 'CRITIQUE'];
const STATUTS = ['DECLARE', 'PRISE_EN_CHARGE', 'EN_COURS', 'RESOLU', 'CLOTURE', 'REJETE'];
const STATUTS_OUVERTS = ['DECLARE', 'PRISE_EN_CHARGE', 'EN_COURS'];

export default function DeclarationsPannes() {
  const { user, hasRole } = useAuth();
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
  const qDebounce = useDebounce(q, 300);

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
        q: qDebounce.trim() || undefined,
        statut_incident: filtreStatut || undefined,
        degre_urgence: filtreUrgence || undefined,
        page, limit: 20,
      });
      setIncidents(res.items);
      setTotalPages(res.totalPages);
    } catch (err) {
      toast.erreur('Chargement impossible', extraireMessageErreur(err));
    } finally {
      setChargement(false);
    }
  }, [qDebounce, filtreStatut, filtreUrgence, page, toast]);

  useEffect(() => { void charger(); }, [charger]);

  // Le serveur renvoie `intervenants: string[]` directement dans la liste.
  const estDejaIntervenant = (inc: Incident): boolean => {
    if (!user) return false;
    return (inc.intervenants ?? []).includes(user.matricule);
  };

  const declarer = async (e: FormEvent) => {
    e.preventDefault(); setEnvoi(true);
    try {
      await declarerIncident({
        code_materiel: formCode.trim(),
        symptomes: formSymptomes,
        degre_urgence: formUrgence,
      });
      toast.succes('Panne declaree', `Un incident a ete cree pour ${formCode}.`);
      setModalDeclaration(false);
      setFormCode(''); setFormSymptomes(''); setFormUrgence('MOYEN');
      await charger();
    } catch (err) { toast.erreur('Declaration refusee', extraireMessageErreur(err)); }
    finally { setEnvoi(false); }
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Declarations de pannes</h1>
        <button className="btn-primary" onClick={() => setModalDeclaration(true)}>+ Declarer une panne</button>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <Input placeholder="Rechercher..." value={q}
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
                ? () => { setQ(''); setFiltreStatut(''); setFiltreUrgence(''); }
                : () => setModalDeclaration(true)
            }
            filtreActif={filtresActifs}
          />
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['N°', 'Materiel', 'Urgence', 'Statut', 'Declare le', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {incidents.map((inc) => {
                const ouvert = STATUTS_OUVERTS.includes(inc.statut_incident);
                const dejaIntervenant = estDejaIntervenant(inc);
                return (
                  <tr key={inc.num_incident} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{inc.num_incident}</td>
                    <td className="px-4 py-3">{inc.code_materiel}</td>
                    <td className="px-4 py-3"><Badge valeur={inc.degre_urgence} /></td>
                    <td className="px-4 py-3"><Badge valeur={inc.statut_incident} /></td>
                    <td className="px-4 py-3 text-xs text-slate-600">{inc.date_declaration}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {estCadre && ouvert && !dejaIntervenant && (
                          <button className="btn-primary" onClick={() => void intervenir(inc.num_incident)}>
                            {inc.statut_incident === 'DECLARE' ? 'Intervenir' : 'Rejoindre'}
                          </button>
                        )}
                        {estCadre && ouvert && dejaIntervenant && (
                          <span className="badge bg-emerald-100 text-emerald-800">Vous intervenez</span>
                        )}
                        {inc.statut_incident === 'DECLARE' && (
                          <button className="btn-warning"
                            onClick={() => { setModalRejet(inc); setFormMotif(''); }}>
                            Rejeter
                          </button>
                        )}
                        {inc.statut_incident === 'RESOLU' && (
                          <button className="btn-success" onClick={() => void cloturer(inc.num_incident)}>
                            Cloturer
                          </button>
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

      <Modal ouvert={modalDeclaration} titre="Declarer une panne"
        onFermer={() => setModalDeclaration(false)}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalDeclaration(false)}>Annuler</button>
            <button type="submit" form="form-declaration" className="btn-primary" disabled={envoi}>
              {envoi ? 'Envoi...' : 'Declarer'}
            </button>
          </>
        }>
        <form id="form-declaration" onSubmit={declarer} className="space-y-4">
          <Champ label="Code materiel *">
            <Input required value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="Ex. MAT-0001" />
          </Champ>
          <Champ label="Symptomes (min. 5 caracteres) *">
            <Textarea required minLength={5} rows={4} value={formSymptomes}
              onChange={(e) => setFormSymptomes(e.target.value)} />
          </Champ>
          <Champ label="Degre d'urgence">
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
              {envoi ? 'Envoi...' : 'Rejeter'}
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