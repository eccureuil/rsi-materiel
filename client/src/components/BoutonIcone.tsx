import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

export type VarianteIconeAction = 'primaire' | 'secondaire' | 'danger' | 'avertissement' | 'succes';

export type NomIconeAction =
  | 'voir'
  | 'detail'
  | 'modifier'
  | 'supprimer'
  | 'historique'
  | 'telecharger'
  | 'generer'
  | 'intervenir'
  | 'rejeter'
  | 'cloturer'
  | 'cle'
  | 'desactiver'
  | 'reactiver'
  | 'approvisionner'
  | 'ajuster'
  | 'retirer'
  | 'options'
  | 'mouvement'
  | 'declarationPanne'
  | 'chargement';

const VARIANTES: Record<VarianteIconeAction, string> = {
  primaire: 'btn-table-primary',
  secondaire: 'btn-table-secondary',
  danger: 'btn-table-danger',
  avertissement: 'btn-table-warning',
  succes: 'btn-table-success',
};

const BASE = 'h-8 w-8 shrink-0 p-0';

interface IconeCommune {
  libelle: string;
  icone: NomIconeAction;
  variante?: VarianteIconeAction;
}

export function BoutonIcone({
  libelle,
  icone,
  variante = 'secondaire',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & IconeCommune) {
  return (
    <button
      type={type}
      aria-label={libelle}
      title={libelle}
      className={`${VARIANTES[variante]} ${BASE} ${className}`}
      {...props}
    >
      <IconeAction nom={icone} />
    </button>
  );
}

export function LienIcone({
  libelle,
  icone,
  variante = 'secondaire',
  className = '',
  ...props
}: LinkProps & IconeCommune) {
  return (
    <Link
      aria-label={libelle}
      title={libelle}
      className={`${VARIANTES[variante]} ${BASE} ${className}`}
      {...props}
    >
      <IconeAction nom={icone} />
    </Link>
  );
}

export function LienExterneIcone({
  libelle,
  icone,
  variante = 'secondaire',
  className = '',
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & IconeCommune) {
  return (
    <a
      aria-label={libelle}
      title={libelle}
      className={`${VARIANTES[variante]} ${BASE} ${className}`}
      {...props}
    >
      <IconeAction nom={icone} />
    </a>
  );
}

export function IconeAction({ nom }: { nom: NomIconeAction }) {
  switch (nom) {
    case 'voir':
      return (
        <Svg>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </Svg>
      );
    case 'detail':
      return (
        <Svg className="h-3.5 w-3.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h5" />
        </Svg>
      );
    case 'modifier':
      return (
        <Svg>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </Svg>
      );
    case 'supprimer':
      return (
        <Svg>
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="m19 6-1 14H6L5 6" />
          <path d="M10 11v5M14 11v5" />
        </Svg>
      );
    case 'historique':
      return (
        <Svg>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 7v5l3 2" />
        </Svg>
      );
    case 'telecharger':
      return (
        <Svg>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </Svg>
      );
    case 'generer':
      return (
        <Svg>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
          <path d="M12 11v6M9 14h6" />
        </Svg>
      );
    case 'intervenir':
      return (
        <Svg>
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2.1-2.1Z" />
        </Svg>
      );
    case 'rejeter':
      return (
        <Svg>
          <circle cx="12" cy="12" r="9" />
          <path d="m9 9 6 6M15 9l-6 6" />
        </Svg>
      );
    case 'cloturer':
      return (
        <Svg>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 3 3 5-6" />
        </Svg>
      );
    case 'cle':
      return (
        <Svg>
          <circle cx="8" cy="15" r="4" />
          <path d="m11 12 9-9" />
          <path d="m17 6 2 2M15 8l2 2" />
        </Svg>
      );
    case 'desactiver':
      return (
        <Svg>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M3 20a6 6 0 0 1 10-4.5" />
          <path d="m17 17 4 4M21 17l-4 4" />
        </Svg>
      );
    case 'reactiver':
      return (
        <Svg>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M3 20a6 6 0 0 1 10-4.5" />
          <path d="m16 18 2 2 4-4" />
        </Svg>
      );
    case 'approvisionner':
      return (
        <Svg>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </Svg>
      );
    case 'ajuster':
      return (
        <Svg>
          <path d="M4 6h16M4 12h16M4 18h16" />
          <circle cx="9" cy="6" r="2" />
          <circle cx="15" cy="12" r="2" />
          <circle cx="8" cy="18" r="2" />
        </Svg>
      );
    case 'retirer':
      return (
        <Svg>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12h8" />
        </Svg>
      );
    case 'options':
      return (
        <Svg>
          <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
        </Svg>
      );
    case 'mouvement':
      return (
        <Svg>
          <path d="M4 7h13" />
          <path d="m14 4 3 3-3 3" />
          <path d="M20 17H7" />
          <path d="m10 14-3 3 3 3" />
        </Svg>
      );
    case 'declarationPanne':
      return (
        <Svg>
          <path d="M10.3 3.8 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </Svg>
      );
    case 'chargement':
      return (
        <Svg className="animate-spin">
          <path d="M21 12a9 9 0 1 1-2.6-6.4" />
        </Svg>
      );
  }
}

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}
