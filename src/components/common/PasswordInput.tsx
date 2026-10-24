import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Champ mot de passe avec bouton « œil » pour vérifier ce qui est saisi
export const PasswordInput: React.FC<Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>> = ({
  className = '',
  ...props
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-9`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-slate-400 transition-colors hover:text-brand-700 focus-visible:text-brand-700"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};
