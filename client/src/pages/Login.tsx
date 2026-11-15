import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { extraireMessageErreur } from '@/api/client';
import { useToast } from '@/components/Toast';
import Alert from '@/components/Alert';
import { Champ, Input, InputMotDePasse } from '@/components/FormControls';

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
    <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-gradient-to-br from-asecna-bleu via-asecna-clair to-asecna-bleu p-4">
      <div
        aria-hidden="true"
        className="rsi-login-glow pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-asecna-or/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="rsi-login-glow rsi-login-glow-delay pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl"
      />

      <div className="rsi-login-card w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/30">
        <div aria-hidden="true" className="h-1.5 bg-gradient-to-r from-asecna-or via-asecna-or to-asecna-bleu" />
        <div className="p-8">
          <div className="mb-6 text-center">
            <div className="rsi-login-logo mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white p-2 shadow-md ring-1 ring-slate-200/80">
              <img src="/logo_asecna.png" alt="Logo ASECNA" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">RSI — ASECNA Madagascar</h1>
            <p className="mt-1.5 text-sm text-slate-500">Gestion des matériels et de la maintenance</p>
          </div>

          {erreur && (
            <div id="login-erreur" role="alert" className="rsi-login-item mb-4">
              <Alert type="erreur" message={erreur} onFermer={() => setErreur(null)} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rsi-login-item rsi-login-delay-1">
              <Champ label="Matricule" htmlFor="login-matricule" requis>
                <Input
                  id="login-matricule"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  placeholder="Saisissez votre matricule"
                  autoComplete="username"
                  autoFocus
                  required
                  disabled={envoi}
                  aria-invalid={erreur ? true : undefined}
                  aria-describedby={erreur ? 'login-erreur' : undefined}
                  className="placeholder:text-slate-400"
                />
              </Champ>
            </div>

            <div className="rsi-login-item rsi-login-delay-2">
              <Champ label="Mot de passe" htmlFor="login-mot-de-passe" requis>
                <InputMotDePasse
                  id="login-mot-de-passe"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="Saisissez votre mot de passe"
                  autoComplete="current-password"
                  required
                  disabled={envoi}
                  aria-invalid={erreur ? true : undefined}
                  aria-describedby={erreur ? 'login-erreur' : undefined}
                  className="placeholder:text-slate-400"
                />
              </Champ>
            </div>

            <div className="rsi-login-item rsi-login-delay-3 pt-1">
              <button
                type="submit"
                className="btn-primary rsi-login-submit w-full py-2.5 font-semibold shadow-sm hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:hover:translate-y-0"
                disabled={envoi}
                aria-busy={envoi}
              >
                {envoi && (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
                  />
                )}
                <span>{envoi ? 'Connexion…' : 'Se connecter'}</span>
              </button>
            </div>
          </form>

          <div className="rsi-login-item rsi-login-delay-4 mt-6 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-500 ring-1 ring-slate-100">
            <span className="font-medium text-slate-600">Comptes de test :</span> ADM001 / CAD001 / CAD002
          </div>
        </div>
      </div>
    </div>
  );
}