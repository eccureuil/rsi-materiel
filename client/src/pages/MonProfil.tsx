import { useState, type FormEvent } from 'react';
import { changerSonMotDePasse } from '@/api/services';
import { extraireMessageErreur } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Champ, Input } from '@/components/FormControls';
import { validerMotDePasse } from '@/utils/motDePasse';

export default function MonProfil() {
  const { user } = useAuth();
  const toast = useToast();

  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (nouveauMdp !== confirmation) {
      toast.erreur('Mots de passe differents', 'La confirmation ne correspond pas au nouveau mot de passe.');
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
      toast.succes('Mot de passe modifie', 'Votre nouveau mot de passe est desormais actif.');
      setAncienMdp(''); setNouveauMdp(''); setConfirmation('');
    } catch (err) {
      toast.erreur('Modification refusee', extraireMessageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Mon profil</h1>

      <section className="card p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Informations</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Matricule</dt><dd className="font-medium text-slate-900">{user?.matricule}</dd></div>
          <div><dt className="text-slate-500">Role</dt><dd className="font-medium text-slate-900">{user?.role}</dd></div>
          <div><dt className="text-slate-500">Nom</dt><dd className="font-medium text-slate-900">{user?.nom}</dd></div>
          <div><dt className="text-slate-500">Prenom</dt><dd className="font-medium text-slate-900">{user?.prenom}</dd></div>
        </dl>
      </section>

      <section className="card max-w-md p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Changer mon mot de passe</h2>
        <form onSubmit={soumettre} className="space-y-4">
          <Champ label="Mot de passe actuel *">
            <Input type="password" required maxLength={128} autoComplete="current-password"
              value={ancienMdp} onChange={(e) => setAncienMdp(e.target.value)} disabled={envoi} />
          </Champ>
          <Champ label="Nouveau mot de passe * (min. 8, 1 lettre, 1 chiffre)">
            <Input type="password" required minLength={8} maxLength={128} autoComplete="new-password"
              value={nouveauMdp} onChange={(e) => setNouveauMdp(e.target.value)} disabled={envoi} />
          </Champ>
          <Champ label="Confirmation *">
            <Input type="password" required minLength={8} maxLength={128} autoComplete="new-password"
              value={confirmation} onChange={(e) => setConfirmation(e.target.value)} disabled={envoi} />
          </Champ>
          <button type="submit" className="btn-primary" disabled={envoi}>
            {envoi ? 'Enregistrement...' : 'Changer le mot de passe'}
          </button>
        </form>
      </section>
    </div>
  );
}