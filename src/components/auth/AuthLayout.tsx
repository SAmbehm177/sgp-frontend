import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Page d'authentification en deux panneaux :
 * message à gauche (écrans larges), formulaire à droite.
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({ eyebrow, title, subtitle, children, footer }) => (
  <div className="min-h-screen bg-cream lg:grid lg:grid-cols-2">
    <aside className="relative hidden overflow-hidden bg-brand-800 text-white lg:flex lg:flex-col lg:justify-center lg:px-16 xl:px-24">
      <div className="pointer-events-none absolute -bottom-44 -right-44 h-[30rem] w-[30rem] rounded-full border-[56px] border-white/[0.06]" />
      <div className="pointer-events-none absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-white/[0.04]" />

      <div className="relative max-w-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300">
          L'espace de travail collectif
        </p>
        <p className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight xl:text-6xl">
          Les projets avancent mieux, ensemble.
        </p>
        <p className="mt-6 max-w-sm text-sm leading-relaxed text-brand-100/80">
          Un espace clair pour les équipes qui transforment les idées en travail accompli.
        </p>
      </div>
    </aside>

    <main className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">
      <div className="w-full max-w-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-950">{title}</h1>
        <p className="mt-2 text-sm text-stone-500">{subtitle}</p>

        <div className="mt-8">{children}</div>

        {footer && (
          <div className="mt-8 border-t border-stone-300/60 pt-5 text-center text-xs text-stone-500">
            {footer}
          </div>
        )}
      </div>
    </main>
  </div>
);

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const AuthField: React.FC<AuthFieldProps> = ({ label, error, type, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const fieldId = props.id ?? props.name;

  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-xs font-semibold text-stone-700">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          id={fieldId}
          type={isPassword && showPassword ? 'text' : type}
          aria-invalid={!!error}
          className={`w-full rounded-lg border bg-white py-2.5 pl-3.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 ${
            isPassword ? 'pr-11' : 'pr-3.5'
          } ${
            error
              ? 'border-rose-400 focus:ring-rose-500/30'
              : 'border-stone-300 focus:border-brand-800 focus:ring-brand-800/20'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-stone-400 transition-colors hover:text-brand-800 focus-visible:text-brand-800"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] text-rose-600">{error}</p>}
    </div>
  );
};

export const AuthAlert: React.FC<{ title: string; message: string }> = ({ title, message }) => (
  <div
    role="alert"
    className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
  >
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
    <div>
      <span className="block font-semibold">{title}</span>
      <span className="mt-0.5 block text-[11px] leading-relaxed">{message}</span>
    </div>
  </div>
);

export const AuthButton: React.FC<{ loading: boolean; children: React.ReactNode }> = ({ loading, children }) => (
  <button
    type="submit"
    disabled={loading}
    className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-800 px-4 py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {loading ? (
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
    ) : (
      <>
        {children} <ArrowRight className="h-4 w-4" />
      </>
    )}
  </button>
);