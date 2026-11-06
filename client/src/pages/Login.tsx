import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { extraireMessageErreur } from '@/api/client';
import { useToast } from '@/components/Toast';
import Alert from '@/components/Alert';
import { Champ, Input } from '@/components/FormControls';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [matricule, setMatricule] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await login(matricule.trim(), motDePasse);
      toast.succes('Connexion réussie', 'Bienvenue sur RSI — ASECNA Madagascar.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = extraireMessageErreur(err);
      setErreur(msg);
      toast.erreur('Connexion refusée', msg);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-asecna-bleu to-asecna-clair p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-asecna-bleu text-xl font-bold text-white">R</div>
          <h1 className="text-xl font-semibold text-slate-900">RSI — ASECNA Madagascar</h1>
          <p className="mt-1 text-sm text-slate-500">Gestion des matériels et de la maintenance</p>
        </div>

        {erreur && <div className="mb-4"><Alert type="erreur" message={erreur} onFermer={() => setErreur(null)} /></div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Champ label="Matricule">
            <Input value={matricule} onChange={(e) => setMatricule(e.target.value)}
              placeholder="Ex. ADM001" autoComplete="username" required disabled={envoi} />
          </Champ>
          <Champ label="Mot de passe">
            <Input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="••••••••" autoComplete="current-password" required disabled={envoi} />
          </Champ>
          <button type="submit" className="btn-primary w-full" disabled={envoi}>
            {envoi ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Comptes de test : ADM001 / CAD001 / CAD002
        </p>
      </div>
    </div>
  );
}