import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useConfirm } from '@/components/ConfirmDialog';
import { libelleRole } from '@/utils/roles';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { confirmer } = useConfirm();

  const handleLogout = async () => {
    const ok = await confirmer({
      titre: 'Confirmer la déconnexion',
      message: 'Vous devrez saisir vos identifiants pour vous reconnecter.',
      libelleConfirmer: 'Se déconnecter',
      ton: 'danger',
    });
    if (!ok) return;

    await logout();
    navigate('/login', { replace: true });
  };

  const initiales = user
    ? `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase()
    : '?';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 bg-white px-3 shadow-sm sm:gap-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
          <img src="/logo_asecna.png" alt="" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
            RSI <span className="hidden sm:inline">— ASECNA Madagascar</span>
          </p>
          <p className="hidden truncate text-xs text-slate-500 sm:block">
            Gestion des matériels et de la maintenance
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {user && (
          <Link
            to="/mon-profil"
            className="group flex min-w-0 items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-asecna-bleu/30 sm:gap-3 sm:px-2"
            title="Voir mon profil"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-asecna-bleu to-asecna-clair text-sm font-semibold text-white shadow-sm ring-2 ring-white">
              {initiales}
            </div>
            <div className="min-w-0 max-w-24 text-left sm:max-w-none">
              <p className="truncate text-sm font-semibold leading-tight text-slate-900 transition-colors group-hover:text-asecna-bleu">
                {user.prenom} {user.nom}
              </p>
              <p className="truncate text-[11px] leading-tight text-slate-500 sm:text-xs">
                {libelleRole(user.role)}
              </p>
            </div>
          </Link>
        )}

        <div className="hidden h-8 w-px bg-slate-200 sm:block" aria-hidden="true" />

        <button
          type="button"
          onClick={handleLogout}
          className="btn-secondary gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-asecna-bleu/30 focus-visible:ring-offset-2"
          aria-label="Se déconnecter"
          title="Se déconnecter"
        >
          <IconeDeconnexion />
          <span className="hidden sm:inline">Déconnexion</span>
        </button>
      </div>
    </header>
  );
}

function IconeDeconnexion() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}