import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  changerStatutUtilisateur, creerUtilisateur, listerUtilisateurs,
  modifierUtilisateur, reinitialiserMotDePasse,
} from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import BoutonCreation from '@/components/BoutonCreation';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import {
  Champ, ChampRecherche, FormGrid, IconeStatut, IconeUtilisateur, Input, ResumeFiltres,
  SectionFormulaire, SelectFiltre, type FiltreActif,
} from '@/components/FormControls';
import { validerMotDePasse } from '@/utils/motDePasse';
import type {
  Role, StatutUtilisateur, UtilisateurComplet, UtilisateurCreateInput, UtilisateurUpdateInput,
} from '@/types/api';
import { SkeletonTableau } from '@/components/Skeleton';
import { BoutonIcone } from '@/components/BoutonIcone';
import EmptyState, { IconesEmpty } from '@/components/EmptyState';
import { EnteteTableau, Tableau } from '@/components/Tableau';

const ROLES: Role[] = ['ADMINISTRATEUR', 'CADRE_MAINTENANCE'];

const LIBELLE_ROLE: Record<Role, string> = {
  ADMINISTRATEUR: 'Administrateur',
  CADRE_MAINTENANCE: 'Cadre maintenance',
};

const LIBELLE_STATUT: Record<StatutUtilisateur, string> = {
  ACTIF: 'Actif',
  INACTIF: 'Inactif',
};

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
  const filtresActifs = q.trim() !== '' || filtreRole !== '' || filtreStatut !== '';

  const reinitialiserFiltres = () => {
    setQ('');
    setFiltreRole('');
    setFiltreStatut('');
    setPage(1);
  };

  const filtresResume: FiltreActif[] = [
    ...(q.trim() ? [{
      label: `Recherche : « ${q.trim()} »`,
      onSupprimer: () => { setQ(''); setPage(1); },
    }] : []),
    ...(filtreRole ? [{
      label: `Rôle : ${LIBELLE_ROLE[filtreRole]}`,
      onSupprimer: () => { setFiltreRole(''); setPage(1); },
    }] : []),
    ...(filtreStatut ? [{
      label: `Statut : ${LIBELLE_STATUT[filtreStatut]}`,
      onSupprimer: () => { setFiltreStatut(''); setPage(1); },
    }] : []),
  ];

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
      toast.erreur('Spécialité requise', 'Un cadre doit avoir une spécialité.'); return;
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
        niveau_privilege: formCreation.role === 'ADMINISTRATEUR'
          ? formCreation.niveau_privilege.trim() || undefined
          : undefined,
      };
      await creerUtilisateur(input);
      toast.succes('Compte créé', `${input.matricule} (${input.role}) a été créé.`);
      setModalCreation(false);
      await charger();
    } catch (err) {
      toast.erreur('Création refusée', extraireMessageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  const soumettreEdition = async (e: FormEvent) => {
    e.preventDefault();
    if (!modalEdition) return;
    if (modalEdition.role === 'CADRE_MAINTENANCE' && !formEdition.specialite.trim()) {
      toast.erreur('Spécialité requise', 'Un cadre doit avoir une spécialité.'); return;
    }
    setEnvoi(true);
    try {
      const input: UtilisateurUpdateInput = {
        nom: formEdition.nom.trim(),
        prenom: formEdition.prenom.trim(),
        specialite: modalEdition.role === 'CADRE_MAINTENANCE'
          ? formEdition.specialite.trim()
          : formEdition.specialite.trim() || undefined,
        niveau_privilege: modalEdition.role === 'ADMINISTRATEUR'
          ? formEdition.niveau_privilege.trim() || undefined
          : undefined,
      };
      await modifierUtilisateur(modalEdition.matricule, input);
      toast.succes('Compte modifié', `${modalEdition.matricule} a été mis à jour.`);
      setModalEdition(null);
      await charger();
    } catch (err) {
      toast.erreur('Modification refusée', extraireMessageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  const basculerStatut = async (u: UtilisateurComplet) => {
    if (user?.matricule === u.matricule) {
      toast.avertissement('Action interdite', 'Vous ne pouvez pas désactiver votre propre compte.');
      return;
    }
    const nouveau: StatutUtilisateur = u.statut_compte === 'ACTIF' ? 'INACTIF' : 'ACTIF';
    const ok = await confirmer({
      titre: nouveau === 'INACTIF' ? 'Désactiver ce compte ?' : 'Réactiver ce compte ?',
      message: nouveau === 'INACTIF'
        ? `${u.prenom} ${u.nom} (${u.matricule}) ne pourra plus se connecter.`
        : `${u.prenom} ${u.nom} (${u.matricule}) pourra de nouveau se connecter.`,
      libelleConfirmer: nouveau === 'INACTIF' ? 'Désactiver' : 'Réactiver',
      ton: nouveau === 'INACTIF' ? 'danger' : 'primaire',
    });
    if (!ok) return;
    try {
      await changerStatutUtilisateur(u.matricule, nouveau);
      toast.succes(
        nouveau === 'INACTIF' ? 'Compte désactivé' : 'Compte réactivé',
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
      toast.succes('Mot de passe réinitialisé', `Le mot de passe de ${modalReset.matricule} a été modifié.`);
      setModalReset(null);
    } catch (err) {
      toast.erreur('Réinitialisation refusée', extraireMessageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Gestion des utilisateurs</h1>
        <BoutonCreation libelle="Nouveau compte" onClick={ouvrirCreation} />
      </div>

      <div className="card">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <ChampRecherche
            label="Recherche"
            value={q}
            onChange={(valeur) => { setQ(valeur); setPage(1); }}
            placeholder="Matricule, nom ou prénom…"
            enveloppeClassName="w-full sm:max-w-xs"
          />
          <SelectFiltre
            id="filtre-role"
            label="Rôle"
            icone={<IconeUtilisateur />}
            value={filtreRole}
            onChange={(valeur) => { setFiltreRole(valeur as '' | Role); setPage(1); }}
            enveloppeClassName="w-full sm:max-w-xs"
            options={[
              { value: '', label: 'Tous les rôles' },
              ...ROLES.map((r) => ({ value: r, label: LIBELLE_ROLE[r] })),
            ]}
          />
          <SelectFiltre
            id="filtre-statut"
            label="Statut"
            icone={<IconeStatut />}
            value={filtreStatut}
            onChange={(valeur) => { setFiltreStatut(valeur as '' | StatutUtilisateur); setPage(1); }}
            enveloppeClassName="w-full sm:max-w-xs"
            options={[
              { value: '', label: 'Tous les statuts' },
              { value: 'ACTIF', label: LIBELLE_STATUT.ACTIF },
              { value: 'INACTIF', label: LIBELLE_STATUT.INACTIF },
            ]}
          />
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
          <SkeletonTableau lignes={5} colonnes={7} />
        ) : utilisateurs.length === 0 ? (
          <EmptyState
            icone={filtresActifs ? <IconesEmpty.Recherche /> : <IconesEmpty.Utilisateur />}
            titre={filtresActifs ? 'Aucun utilisateur ne correspond' : 'Aucun utilisateur'}
            description={
              filtresActifs
                ? 'Changez de rôle ou de statut pour élargir la recherche.'
                : 'Créez le premier compte administrateur ou cadre.'
            }
            ctaLabel={filtresActifs ? undefined : '+ Nouveau compte'}
            ctaOnClick={filtresActifs ? reinitialiserFiltres : ouvrirCreation}
            filtreActif={filtresActifs}
          />
        ) : (
          <Tableau>
            <EnteteTableau colonnes={['Matricule', 'Nom', 'Rôle', 'Spécialité', 'Niveau', 'Statut', 'Actions']} />
            <tbody>
              {utilisateurs.map((u) => (
                <tr key={u.matricule}>
                  <td className="font-medium">{u.matricule}</td>
                  <td>{u.prenom} {u.nom}</td>
                  <td>
                    <span className={`badge ${u.role === 'ADMINISTRATEUR' ? 'bg-asecna-bleu text-white' : 'bg-slate-100 text-slate-800'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="text-slate-700">{u.specialite ?? '-'}</td>
                  <td className="text-slate-700">{u.niveau_privilege ?? '-'}</td>
                  <td>
                    <span className={`badge ${u.statut_compte === 'ACTIF' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {u.statut_compte}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      <BoutonIcone libelle="Modifier l’utilisateur" icone="modifier" onClick={() => ouvrirEdition(u)} />
                      <BoutonIcone libelle="Réinitialiser le mot de passe" icone="cle" variante="avertissement" onClick={() => ouvrirReset(u)} />
                      <BoutonIcone
                        libelle={u.statut_compte === 'ACTIF' ? 'Désactiver le compte' : 'Réactiver le compte'}
                        icone={u.statut_compte === 'ACTIF' ? 'desactiver' : 'reactiver'}
                        variante={u.statut_compte === 'ACTIF' ? 'danger' : 'succes'}
                        onClick={() => void basculerStatut(u)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
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
              {envoi ? 'Création…' : 'Créer le compte'}
            </button>
          </>
        }>
        <form id="form-user-creation" onSubmit={soumettreCreation} className="space-y-5">
          <SectionFormulaire
            titre="Identité"
            description="Renseignez les informations de base du compte utilisateur."
          >
            <FormGrid>
              <Champ label="Matricule" requis aide="1 à 20 caractères : lettres, chiffres, point, tiret ou souligné.">
                <Input required minLength={1} maxLength={20} pattern="^[A-Za-z0-9._-]{1,20}$"
                  value={formCreation.matricule}
                  onChange={(e) => setFormCreation({ ...formCreation, matricule: e.target.value })} />
              </Champ>
              <Champ label="Rôle" requis>
                <SelectFiltre
                  required
                  value={formCreation.role}
                  onChange={(valeur) => {
                    const role = valeur as Role;
                    setFormCreation({
                      ...formCreation,
                      role,
                      ...(role !== 'ADMINISTRATEUR' ? { niveau_privilege: '' } : {}),
                    });
                  }}
                  options={ROLES.map((r) => ({ value: r, label: LIBELLE_ROLE[r] }))}
                />
              </Champ>
              <Champ label="Nom" requis>
                <Input required maxLength={50} value={formCreation.nom}
                  onChange={(e) => setFormCreation({ ...formCreation, nom: e.target.value })} />
              </Champ>
              <Champ label="Prénom" requis>
                <Input required maxLength={50} value={formCreation.prenom}
                  onChange={(e) => setFormCreation({ ...formCreation, prenom: e.target.value })} />
              </Champ>
            </FormGrid>
          </SectionFormulaire>

          <SectionFormulaire
            titre="Accès"
            description="Définissez le mot de passe et les droits d’accès associés."
          >
            <FormGrid>
              <Champ label="Mot de passe initial" requis aide="8 caractères minimum, dont au moins une lettre et un chiffre.">
                <Input type="password" required minLength={8} maxLength={128} autoComplete="new-password"
                  value={formCreation.mot_de_passe}
                  onChange={(e) => setFormCreation({ ...formCreation, mot_de_passe: e.target.value })} />
              </Champ>
              {formCreation.role === 'ADMINISTRATEUR' && (
                <Champ label="Niveau de privilège" optionnel aide="30 caractères maximum.">
                  <Input maxLength={30} value={formCreation.niveau_privilege}
                    onChange={(e) => setFormCreation({ ...formCreation, niveau_privilege: e.target.value })} />
                </Champ>
              )}
              {formCreation.role === 'CADRE_MAINTENANCE' && (
                <Champ label="Spécialité" requis aide="100 caractères maximum.">
                  <Input required maxLength={100} value={formCreation.specialite}
                    onChange={(e) => setFormCreation({ ...formCreation, specialite: e.target.value })}
                    placeholder="Ex. Réseau, Système..." />
                </Champ>
              )}
            </FormGrid>
          </SectionFormulaire>
        </form>
      </Modal>

      <Modal ouvert={modalEdition !== null}
        titre={modalEdition ? `Modifier ${modalEdition.matricule}` : ''}
        onFermer={() => setModalEdition(null)}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalEdition(null)}>Annuler</button>
            <button type="submit" form="form-user-edition" className="btn-primary" disabled={envoi}>
              {envoi ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </>
        }>
        <form id="form-user-edition" onSubmit={soumettreEdition} className="space-y-5">
          <SectionFormulaire
            titre="Profil"
            description="Le matricule et le rôle ne sont pas modifiables."
          >
            <FormGrid>
              <Champ label="Nom" requis>
                <Input required maxLength={50} value={formEdition.nom}
                  onChange={(e) => setFormEdition({ ...formEdition, nom: e.target.value })} />
              </Champ>
              <Champ label="Prénom" requis>
                <Input required maxLength={50} value={formEdition.prenom}
                  onChange={(e) => setFormEdition({ ...formEdition, prenom: e.target.value })} />
              </Champ>
            </FormGrid>
          </SectionFormulaire>

          <SectionFormulaire
            titre="Droits"
            description={modalEdition?.role === 'ADMINISTRATEUR'
              ? 'Mettez à jour le niveau de privilège.'
              : 'Mettez à jour la spécialité.'}
          >
            <FormGrid>
              {modalEdition?.role === 'CADRE_MAINTENANCE' && (
                <Champ label="Spécialité" requis aide="100 caractères maximum.">
                  <Input required maxLength={100} value={formEdition.specialite}
                    onChange={(e) => setFormEdition({ ...formEdition, specialite: e.target.value })}
                    placeholder="Ex. Réseau, Système..." />
                </Champ>
              )}
              {modalEdition?.role === 'ADMINISTRATEUR' && (
                <Champ label="Niveau de privilège" optionnel aide="30 caractères maximum.">
                  <Input maxLength={30} value={formEdition.niveau_privilege}
                    onChange={(e) => setFormEdition({ ...formEdition, niveau_privilege: e.target.value })} />
                </Champ>
              )}
            </FormGrid>
          </SectionFormulaire>
        </form>
      </Modal>

      <Modal ouvert={modalReset !== null}
        titre={modalReset ? `Réinitialiser le mot de passe de ${modalReset.matricule}` : ''}
        onFermer={() => setModalReset(null)}
        piedDePage={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalReset(null)}>Annuler</button>
            <button type="submit" form="form-reset-mdp" className="btn-warning" disabled={envoi}>
              {envoi ? 'Envoi…' : 'Réinitialiser'}
            </button>
          </>
        }>
        <form id="form-reset-mdp" onSubmit={soumettreReset} className="space-y-5">
          <Champ label="Nouveau mot de passe" requis aide="8 caractères minimum, dont au moins une lettre et un chiffre.">
            <Input type="password" required minLength={8} maxLength={128} autoComplete="new-password"
              value={nouveauMdp} onChange={(e) => setNouveauMdp(e.target.value)} />
          </Champ>
        </form>
      </Modal>
    </div>
  );
}
