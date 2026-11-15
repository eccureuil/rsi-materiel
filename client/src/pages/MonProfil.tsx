import { useState, type FormEvent } from 'react';
import { changerSonMotDePasse } from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Champ, InputMotDePasse } from '@/components/FormControls';
import { validerMotDePasse } from '@/utils/motDePasse';
import { libelleRole } from '@/utils/roles';
import type { Role } from '@/types/api';

const STYLE_ROLE: Record<Role, string> = {
  ADMINISTRATEUR: 'bg-asecna-bleu/10 text-asecna-bleu ring-asecna-bleu/20',
  CADRE_MAINTENANCE: 'bg-asecna-or/15 text-amber-700 ring-asecna-or/30',
};

export default function MonProfil() {
  const { user } = useAuth();
  const toast = useToast();

  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const initiales = user
    ? `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase()
    : '?';

  const regles = [
    { label: '8 caractères minimum', valide: nouveauMdp.length >= 8 },
    { label: 'Au moins une lettre', valide: /[A-Za-z]/.test(nouveauMdp) },
    { label: 'Au moins un chiffre', valide: /\d/.test(nouveauMdp) },
  ];

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (nouveauMdp !== confirmation) {
      toast.erreur('Mots de passe différents', 'La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }
    if (ancienMdp && nouveauMdp === ancienMdp) {
      toast.erreur('Mot de passe inchangé', "Le nouveau mot de passe doit être différent de l'actuel.");
      return;
    }
    const v = validerMotDePasse(nouveauMdp);
    if (!v.valide) { toast.erreur('Mot de passe invalide', v.erreurs.join(' ')); return; }
    setEnvoi(true);
    try {
      await changerSonMotDePasse({
        ancien_mot_de_passe: ancienMdp,
        nouveau_mot_de_passe: nouveauMdp,
      });
      toast.succes('Mot de passe modifié', 'Votre nouveau mot de passe est désormais actif.');
      setAncienMdp(''); setNouveauMdp(''); setConfirmation('');
    } catch (err) {
      toast.erreur('Modification refusée', extraireMessageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Mon profil</h1>
        <p className="mt-1 text-sm text-slate-500">Consultez vos informations et sécurisez votre compte.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card overflow-hidden lg:col-span-1">
          <div className="h-24 bg-gradient-to-r from-asecna-bleu via-asecna-clair to-asecna-bleu" />
          <div className="px-6 pb-6">
            <div className="-mt-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-1 shadow-md ring-1 ring-slate-200">
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-asecna-bleu to-asecna-clair text-2xl font-semibold text-white">
                {initiales}
              </div>
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              {user ? `${user.prenom} ${user.nom}` : '—'}
            </h2>
            {user && (
              <span className={`badge mt-2 ring-1 ${STYLE_ROLE[user.role]}`}>
                {libelleRole(user.role)}
              </span>
            )}

            <dl className="mt-6 space-y-4 border-t border-slate-100 pt-5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Matricule</dt>
                <dd className="font-mono font-medium text-slate-900">{user?.matricule ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Nom</dt>
                <dd className="text-right font-medium text-slate-900">{user?.nom ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Prénom</dt>
                <dd className="text-right font-medium text-slate-900">{user?.prenom ?? '—'}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="card p-6 lg:col-span-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-asecna-bleu/10 text-asecna-bleu">
              <IconeCle />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Changer le mot de passe</h2>
              <p className="mt-0.5 text-sm text-slate-500">Choisissez un mot de passe robuste et unique.</p>
            </div>
          </div>

          <form onSubmit={soumettre} className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Champ label="Mot de passe actuel" htmlFor="profil-mdp-actuel" requis>
                  <InputMotDePasse
                    id="profil-mdp-actuel"
                    required
                    maxLength={128}
                    autoComplete="current-password"
                    placeholder="Votre mot de passe actuel"
                    value={ancienMdp}
                    onChange={(e) => setAncienMdp(e.target.value)}
                    disabled={envoi}
                    className="placeholder:text-slate-400"
                  />
                </Champ>
              </div>

              <Champ label="Nouveau mot de passe" htmlFor="profil-mdp-nouveau" requis>
                <InputMotDePasse
                  id="profil-mdp-nouveau"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="8 caractères minimum"
                  value={nouveauMdp}
                  onChange={(e) => setNouveauMdp(e.target.value)}
                  disabled={envoi}
                  className="placeholder:text-slate-400"
                />
              </Champ>

              <Champ label="Confirmation" htmlFor="profil-mdp-confirmation" requis>
                <InputMotDePasse
                  id="profil-mdp-confirmation"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="Répétez le nouveau mot de passe"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  disabled={envoi}
                  className="placeholder:text-slate-400"
                />
              </Champ>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Le mot de passe doit contenir
              </p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-3">
                {regles.map((regle) => (
                  <li
                    key={regle.label}
                    className={`flex items-center gap-2 text-xs ${regle.valide ? 'text-emerald-700' : 'text-slate-500'}`}
                  >
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full ${regle.valide ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200'}`}>
                      {regle.valide ? <IconeCoche /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />}
                    </span>
                    {regle.label}
                  </li>
                ))}
              </ul>
            </div>

            {nouveauMdp && confirmation && nouveauMdp !== confirmation && (
              <p className="text-xs font-medium text-red-600" role="alert">
                La confirmation ne correspond pas au nouveau mot de passe.
              </p>
            )}
            {ancienMdp && nouveauMdp && ancienMdp === nouveauMdp && (
              <p className="text-xs font-medium text-amber-700">
                Le nouveau mot de passe doit être différent de l'actuel.
              </p>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">Vous resterez connecté après la modification.</p>
              <button type="submit" className="btn-primary gap-2 sm:min-w-56" disabled={envoi} aria-busy={envoi}>
                {envoi ? (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
                  />
                ) : (
                  <IconeCle />
                )}
                <span>{envoi ? 'Enregistrement…' : 'Changer le mot de passe'}</span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function IconeCle() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}

function IconeCoche() {
  return (
    <svg
      aria-hidden="true"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}