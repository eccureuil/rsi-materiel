import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  libelle: string;
  icone?: ReactNode;
};

export default function BoutonCreation({
  libelle,
  icone,
  className = '',
  type = 'button',
  ...props
}: Props) {
  return (
    <button type={type} {...props} className={`btn-create group ${className}`}>
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-colors group-hover:bg-white/25">
        {icone ?? <IconePlus />}
      </span>
      {libelle}
    </button>
  );
}

function IconePlus() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
