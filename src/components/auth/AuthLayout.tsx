import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ eyebrow, title, subtitle, children, footer }) => (
  <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-10 sm:px-6">
    <div className="w-full max-w-md">


      <section
        aria-labelledby="auth-title"
        className="rounded-2xl border border-card-border bg-card p-8 shadow-sm sm:p-10"
      >
        <div className="mb-5 flex items-center justify-center">
          <img
            src="/CPNTIC_logo.jpg"
            alt="Logo CPNTIC"
            width={200}
            height={85}
            className="h-16 w-auto object-contain"
          />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
          {eyebrow}
        </p>
        <h1 id="auth-title" className="mt-2 text-3xl font-bold leading-tight tracking-tight text-slate-900 justify-center items-center">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">{subtitle}</p>

        <div className="mt-8">{children}</div>

        {footer && (
          <div className="mt-6 border-t border-card-border pt-5 text-center text-sm text-slate-500">
            {footer}
          </div>
        )}
      </section>
    </div>
  </main>
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
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          id={fieldId}
          type={isPassword && showPassword ? 'text' : type}
          aria-invalid={!!error}
          className={`w-full rounded-xl border bg-white py-3 pl-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-hidden focus:ring-4 ${
            isPassword ? 'pr-11' : 'pr-3.5'
          } ${
            error
              ? 'border-rose-400 focus:ring-rose-500/20'
              : 'border-card-border focus:border-brand-600 focus:ring-brand-200/60'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-400 transition-colors hover:text-brand-700 focus-visible:text-brand-700"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
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
    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 focus:outline-hidden focus:ring-4 focus:ring-brand-200/70 disabled:cursor-not-allowed disabled:opacity-60"
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