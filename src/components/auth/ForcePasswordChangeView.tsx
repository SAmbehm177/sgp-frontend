import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AuthLayout, AuthField, AuthAlert, AuthButton } from './AuthLayout';
import { api, toApiError } from '../../services/api';

// Écran affiché tant que le mot de passe provisoire donné par l'administrateur n'a pas été remplacé
export const ForcePasswordChangeView: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ actuel: '', nouveau: '', confirmation: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!form.actuel) errors.actuel = 'Saisissez le mot de passe provisoire.';
    if (form.nouveau.length < 8) errors.nouveau = 'Au moins 8 caractères.';
    else if (form.nouveau === form.actuel) errors.nouveau = "Choisissez un mot de passe différent du provisoire.";
    if (form.confirmation !== form.nouveau) errors.confirmation = 'La confirmation ne correspond pas.';
    setErrorMessage(null);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await api.changePassword(form.actuel, form.nouveau, form.confirmation);
      toast.success('Mot de passe modifié', 'Vous pouvez maintenant utiliser la plateforme.');
      await refreshUser(); // le drapeau est levé : l'application s'ouvre
    } catch (caught) {
      const err = toApiError(caught);
      const apiErrors = err.errors ?? {};
      setFieldErrors({
        ...(apiErrors.current_password ? { actuel: apiErrors.current_password[0] } : {}),
        ...(apiErrors.password ? { nouveau: apiErrors.password[0] } : {}),
      });
      setErrorMessage(err.message || 'Mot de passe non modifié.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow={user ? `Bienvenue, ${user.name}` : 'Bienvenue'}
      title="Choisissez votre mot de passe"
      subtitle="Pour votre sécurité, remplacez le mot de passe provisoire donné par l'administrateur."
    >
      {errorMessage && <AuthAlert title="Changement impossible" message={errorMessage} />}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <AuthField
          label="Mot de passe provisoire"
          name="actuel"
          type="password"
          autoComplete="current-password"
          value={form.actuel}
          onChange={update('actuel')}
          error={fieldErrors.actuel}
        />
        <AuthField
          label="Nouveau mot de passe"
          name="nouveau"
          type="password"
          autoComplete="new-password"
          value={form.nouveau}
          onChange={update('nouveau')}
          placeholder="8 caractères minimum"
          error={fieldErrors.nouveau}
        />
        <AuthField
          label="Confirmer le nouveau mot de passe"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          value={form.confirmation}
          onChange={update('confirmation')}
          error={fieldErrors.confirmation}
        />
        <AuthButton loading={isSubmitting}>Enregistrer et continuer</AuthButton>
      </form>
      <p className="mt-5 text-center">
        <button type="button" onClick={() => logout()} className="font-medium text-brand-800 hover:underline">
          Se déconnecter
        </button>
      </p>
    </AuthLayout>
  );
};
