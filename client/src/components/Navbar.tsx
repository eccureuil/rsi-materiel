import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const initiales = user
    ? `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase()
    : '?';

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-asecna-bleu font-bold text-white">
          R
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">RSI - ASECNA Madagascar</p>
          <p className="text-xs text-slate-500">Gestion des materiels et maintenance</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <Link
            to="/mon-profil"
            className="group flex items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-slate-100"
            title="Voir mon profil"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-asecna-bleu text-sm font-semibold text-white">
              {initiales}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900 group-hover:text-asecna-bleu">
                {user.prenom} {user.nom}
              </p>
              <p className="text-xs text-slate-500">
                {user.matricule} - {user.role}
              </p>
            </div>
          </Link>
        )}
        <button onClick={handleLogout} className="btn-secondary">
          Deconnexion
        </button>
      </div>
    </header>
  );
}