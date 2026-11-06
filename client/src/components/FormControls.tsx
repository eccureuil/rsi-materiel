import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Champ({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`input ${props.className ?? ''}`} />;
}