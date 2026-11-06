import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  changerStatutUtilisateur, creerUtilisateur, listerUtilisateurs,
  modifierUtilisateur, reinitialiserMotDePasse,
} from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import { Champ, Input, Select } from '@/components/FormControls';
import { validerMotDePasse } from '@/utils/motDePasse';
import type {
  Role, StatutUtilisateur, UtilisateurComplet, UtilisateurCreateInput, UtilisateurUpdateInput,
} from '@/types/api';

const ROLES: Role[] = ['ADMINISTRATEUR', 'CADRE_MAINTENANCE'];

interface FormulaireCreation {
  matricule: string;
  nom: string;
  prenom: string;
  mot_de_passe: string;
  role: Role;
  specialite: string;
  niveau_privilege: string;
}
const FORM_CREATION_VIDE: FormulaireCreation = {
  matricule: '', nom: '', prenom: '', mot_de_passe: '',
  role: 'CADRE_MAINTENANCE', specialite: '', niveau_privilege: '',
};

interface FormulaireEdition {
  nom: string;
  prenom: string;
  specialite: string;
  niveau_privilege: string;
}
const FORM_EDITION_VIDE: FormulaireEdition = {
  nom: '', prenom: '', specialite: '', niveau_privilege: '',
};

export default function GestionUtilisateurs() {
  const { user } = useAuth();
  const toast = useToast();
  const { confirmer } = useConfirm();

  const [utilisateurs, setUtilisateurs] = useState<UtilisateurComplet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chargement, setChargement] = useState(false);

  const [q, setQ] = useState('');
  const [filtreRole, setFiltreRole] = useState<'' | Role>('');
  const [filtreStatut, setFiltreStatut] = useState<'' | StatutUtilisateur>('');

  const [modalCreation, setModalCreation] = useState(false);
  const [modalEdition, setModalEdition] = useState<UtilisateurComplet | null>(null);
  const [modalReset, setModalReset] = useState<UtilisateurComplet | null>(null);

  const [formCreation, setFormCreation] = useState<FormulaireCreation>(FORM_CREATION_VIDE);
  const [formEdition, setFormEdition] = useState<FormulaireEdition>(FORM_EDITION_VIDE);
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await listerUtilisateurs({
        q: q.trim() || undefined,
        role: filtreRole || undefined,
        statut_compte: filtreStatut || undefined,
        page, limit: 20,
      });
      setUtilisateurs(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      toast.erreur('Chargement impossible', extraireMessageErreur(err));
    } finally {
      setChargement(false);
    }
  }, [q, filtreRole, filtreStatut, page, toast]);

  useEffect(() => { void charger(); }, [charger]);

  const ouvrirCreation = () => {
    setFormCreation(FORM_CREATION_VIDE);
    setModalCreation(true);
  };
  const ouvrirEdition = (u: UtilisateurComplet) => {
    setFormEdition({
      nom: u.nom,
      prenom: u.prenom,
      specialite: u.specialite ?? '',
      niveau_privilege: u.niveau_privilege ?? '',
    });
    setModalEdition(u);
  };
  const ouvrirReset = (u: UtilisateurComplet) => {
    setNouveauMdp('');
    setModalReset(u);
  };

  const soumettreCreation = async (e: FormEvent) => {
    e.preventDefault();
    const v = validerMotDePasse(formCreation.mot_de_passe);
    if (!v.valide) { toast.erreur('Mot de passe invalide', v.erreurs.join(' ')); return; }
    if (formCreation.role === 'CADRE_MAINTENANCE' && !formCreation.specialite.trim()) {
      toast.erreur('Specialite requise', 'Un cadre doit avoir une specialite.'); return;
    }
    setEnvoi(true);
    try {
      const input: UtilisateurCreateInput = {
        matricule: formCreation.matricule.trim(),
        nom: formCreation.nom.trim(),
        prenom: formCreation.prenom.trim(),
        mot_de_passe: formCreation.mot_de_passe,
        role: formCreation.role,
        specialite: formCreation.role === 'CADRE_MAINTENANCE'
          ? formCreation.specialite.trim()
          : formCreation.specialite.trim() || undefined,
        niveau_privilege: formCreation.niveau_privilege.trim() || undefined,
      };
      await creerUtilisateur(input);
      toast.succes('Compte cree', `${input.matricule} (${input.role}) a ete cree.`);
      setModalCreation(false);
      await charger();
    } catch (err) {
      toast.erreur('Creation refusee', extraireMessageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  const soumettreEdition = async (e: FormEvent) => {
    e.preventDefault();
    if (!modalEdition) return;
    if (modalEdition.role === 'CADRE_MAINTENANCE' && !formEdition.specialite.trim()) {
      toast.erreur('Specialite requise', 'Un cadre doit avoir une specialite.'); return;
    }
    setEnvoi(true);
    try {
      const input: UtilisateurUpdateInput = {
        nom: formEdition.nom.trim(),
        prenom: formEdition.prenom.trim(),
        specialite: modalEdition.role === 'CADRE_MAINTENANCE'
          ? formEdition.specialite.trim()
          : formEdition.specialite.trim() || undefined,
        niveau_privilege: formEdition.niveau_privilege.trim() || undefined,
      };
      await modifierUtilisateur(modalEdition.matricule, input);
      toast.succes('Compte modifie', `${modalEdition.matricule} a ete mis a jour.`);
      setModalEdition(null);
      await charger();
    } catch (err) {
      toast.erreur('Modification refusee', extraireMessageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  const basculerStatut = async (u: UtilisateurComplet) => {
    if (user?.matricule === u.matricule) {
      toast.avertissement('Action interdite', 'Vous ne pouvez pas desactiver votre propre compte.');
      return;
    }
    const nouveau: StatutUtilisateur = u.statut_compte === 'ACTIF' ? 'INACTIF' : 'ACTIF';
    const ok = await confirmer({
      titre: nouveau === 'INACTIF' ? 'Desactiver ce compte ?' : 'Reactiver ce compte ?',
      message: nouveau === 'INACTIF'
        ? `${u.prenom} ${u.nom} (${u.matricule}) ne pourra plus se connecter.`
        : `${u.prenom} ${u.nom} (${u.matricule}) pourra de nouveau se connecter.`,
      libelleConfirmer: nouveau === 'INACTIF' ? 'Desactiver' : 'Reactiver',
      ton: nouveau === 'INACTIF' ? 'danger' : 'primaire',
    });
    if (!ok) return;
    try {
      await changerStatutUtilisateur(u.matricule, nouveau);
      toast.succes(
        nouveau === 'INACTIF' ? 'Compte desactive' : 'Compte reactive',
        `${u.matricule} est maintenant ${nouveau}.`,
      );
      await charger();
    } catch (err) {
      toast.erreur('Changement de statut impossible', extraireMessageErreur(err));
    }
  };

  const soumettreReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!modalReset) return;
    const v = validerMotDePasse(nouveauMdp);
    if (!v.valide) { toast.erreur('Mot de passe invalide', v.erreurs.join(' ')); return; }
    setEnvoi(true);
    try {
      await reinitialiserMotDePasse(modalReset.matricule, { nouveau_mot_de_passe: nouveauMdp });
      toast.succes('Mot de passe reinitialise', `Le mot de passe de ${modalReset.matricule} a ete modifie.`);
      setModalReset(null);
    } catch (err) {
      toast.erreur('Reinitialisation refusee', extraireMessageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Gestion des utilisateurs</h1>
        <button className="btn-primary" onClick={ouvrirCreation}>+ Nouveau compte</button>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <Input placeholder="Rechercher (matricule, nom, prenom...)" value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
        <Select value={filtreRole}
          onChange={(e) => { setFiltreRole(e.target.value as '' | Role); setPage(1); }} className="max-w-xs">
          <option value="">Tous roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
        <Select value={filtreStatut}
          onChange={(e) => { setFiltreStatut(e.target.value as '' | StatutUtilisateur); setPage(1); }} className="max-w-xs">
          <option value="">Tous statuts</option>
          <option value="ACTIF">ACTIF</option>
          <option value="INACTIF">INACTIF</option>
        </Select>
      </div>

      <div className="card overflow-hidden">
        {chargement && <p className="p-4 text-sm text-slate-500">Chargement...</p>}
        {!chargement && utilisateurs.length === 0 && (
          <p className="p-4 text-sm text-slate-500">Aucun utilisateur.</p>
        )}
        {!chargement && utilisateurs.length > 0 && (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Matricule', 'Nom', 'Role', 'Specialite', 'Niveau', 'Statut', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {utilisateurs.map((u) => (
                <tr key={u.matricule} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{u.matricule}</td>
                  <td className="px-4 py-3">{u.prenom} {u.nom}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.role === 'ADMINISTRATEUR' ? 'bg-asecna-bleu text-white' : 'bg-slate-100 text-slate-800'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{u.specialite ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{u.niveau_privilege ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.statut_compte === 'ACTIF' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {u.statut_compte}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-secondary" onClick={() => ouvrirEdition(u)}>Modifier</button>
                      <button className="btn-warning" onClick={() => ouvrirReset(u)}>Reinit. MDP</button>
                      <button
                        className={u.statut_compte === 'ACTIF' ? 'btn-danger' : 'btn-success'}
                        onClick={() => void basculerStatut(u)}>
                        {u.statut_compte === 'ACTIF' ? 'Desactiver' : 'Reactiver'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-sm text-slate-600">{total} utilisateur(s) au total.</p>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal ouvert={modalCreation} titre="Nouveau compte"
        onFermer={() => setModalCreation(false)}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalCreation(false)}>Annuler</button>
            <button type="submit" form="form-user-creation" className="btn-primary" disabled={envoi}>
              {envoi ? 'Creation...' : 'Creer le compte'}
            </button>
          </>
        }>
        <form id="form-user-creation" onSubmit={soumettreCreation} className="space-y-4">
          <Champ label="Matricule * (1-20 : lettres, chiffres, . _ -)">
            <Input required minLength={1} maxLength={20} pattern="^[A-Za-z0-9._-]{1,20}$"
              value={formCreation.matricule}
              onChange={(e) => setFormCreation({ ...formCreation, matricule: e.target.value })} />
          </Champ>
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Nom *">
              <Input required maxLength={50} value={formCreation.nom}
                onChange={(e) => setFormCreation({ ...formCreation, nom: e.target.value })} />
            </Champ>
            <Champ label="Prenom *">
              <Input required maxLength={50} value={formCreation.prenom}
                onChange={(e) => setFormCreation({ ...formCreation, prenom: e.target.value })} />
            </Champ>
          </div>
          <Champ label="Mot de passe initial * (min. 8, 1 lettre, 1 chiffre)">
            <Input type="password" required minLength={8} maxLength={128} autoComplete="new-password"
              value={formCreation.mot_de_passe}
              onChange={(e) => setFormCreation({ ...formCreation, mot_de_passe: e.target.value })} />
          </Champ>
          <Champ label="Role *">
            <Select required value={formCreation.role}
              onChange={(e) => setFormCreation({ ...formCreation, role: e.target.value as Role })}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Champ>
          {formCreation.role === 'CADRE_MAINTENANCE' && (
            <Champ label="Specialite * (max. 100)">
              <Input required maxLength={100} value={formCreation.specialite}
                onChange={(e) => setFormCreation({ ...formCreation, specialite: e.target.value })}
                placeholder="Ex. Reseau, Systeme..." />
            </Champ>
          )}
          <Champ label="Niveau de privilege (optionnel, max. 30)">
            <Input maxLength={30} value={formCreation.niveau_privilege}
              onChange={(e) => setFormCreation({ ...formCreation, niveau_privilege: e.target.value })} />
          </Champ>
        </form>
      </Modal>

      <Modal ouvert={modalEdition !== null}
        titre={modalEdition ? `Modifier ${modalEdition.matricule}` : ''}
        onFermer={() => setModalEdition(null)}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalEdition(null)}>Annuler</button>
            <button type="submit" form="form-user-edition" className="btn-primary" disabled={envoi}>
              {envoi ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </>
        }>
        <form id="form-user-edition" onSubmit={soumettreEdition} className="space-y-4">
          <p className="text-xs text-slate-500">
            Le matricule et le role ne sont pas modifiables.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Nom *">
              <Input required maxLength={50} value={formEdition.nom}
                onChange={(e) => setFormEdition({ ...formEdition, nom: e.target.value })} />
            </Champ>
            <Champ label="Prenom *">
              <Input required maxLength={50} value={formEdition.prenom}
                onChange={(e) => setFormEdition({ ...formEdition, prenom: e.target.value })} />
            </Champ>
          </div>
          {modalEdition?.role === 'CADRE_MAINTENANCE' && (
            <Champ label="Specialite * (max. 100)">
              <Input required maxLength={100} value={formEdition.specialite}
                onChange={(e) => setFormEdition({ ...formEdition, specialite: e.target.value })} />
            </Champ>
          )}
          <Champ label="Niveau de privilege (optionnel, max. 30)">
            <Input maxLength={30} value={formEdition.niveau_privilege}
              onChange={(e) => setFormEdition({ ...formEdition, niveau_privilege: e.target.value })} />
          </Champ>
        </form>
      </Modal>

      <Modal ouvert={modalReset !== null}
        titre={modalReset ? `Reinitialiser le MDP de ${modalReset.matricule}` : ''}
        onFermer={() => setModalReset(null)}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalReset(null)}>Annuler</button>
            <button type="submit" form="form-reset-mdp" className="btn-warning" disabled={envoi}>
              {envoi ? 'Envoi...' : 'Reinitialiser'}
            </button>
          </>
        }>
        <form id="form-reset-mdp" onSubmit={soumettreReset} className="space-y-4">
          <Champ label="Nouveau mot de passe * (min. 8, 1 lettre, 1 chiffre)">
            <Input type="password" required minLength={8} maxLength={128} autoComplete="new-password"
              value={nouveauMdp} onChange={(e) => setNouveauMdp(e.target.value)} />
          </Champ>
        </form>
      </Modal>
    </div>
  );
}