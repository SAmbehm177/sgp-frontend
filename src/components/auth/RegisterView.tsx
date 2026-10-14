import React, { useState } from 'react';
import { LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout, AuthField, AuthAlert, AuthButton } from './AuthLayout';

interface RegisterViewProps {
  onSuccess: () => void;
  onGoToLogin: () => void;
}

const EMPTY_FORM = {
  prenom: '',
  nom: '',
  poste: '',
  email: '',
  password: '',
  password_confirmation: '',
};

type FormField = keyof typeof EMPTY_FORM;

export const RegisterView: React.FC<RegisterViewProps> = ({ onSuccess, onGoToLogin }) => {
  const { register } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormField, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (field: FormField) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // Reporte les erreurs de validation Laravel (422) sous les champs concernés
  const showApiError = (err: any) => {
    setErrorMessage(err?.message || "Échec de l'inscription.");
    if (err?.errors) {
      const fe: Partial<Record<FormField, string>> = {};
      Object.entries(err.errors as Record<string, string[]>).forEach(([k, v]) => {
        if (k in EMPTY_FORM) fe[k as FormField] = v[0];
      });
      setFieldErrors(fe);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Partial<Record<FormField, string>> = {};
    if (!form.prenom.trim()) errors.prenom = 'Le prénom est obligatoire.';
    if (!form.nom.trim()) errors.nom = 'Le nom est obligatoire.';
    if (!form.poste.trim()) errors.poste = 'Le poste est obligatoire.';
    if (!form.email.trim()) errors.email = "L'adresse e-mail est obligatoire.";
    if (form.password.length < 8) {
      errors.password = 'Le mot de passe doit contenir au moins 8 caractères.';
    } else if (form.password !== form.password_confirmation) {
      errors.password_confirmation = 'Les deux mots de passe ne correspondent pas.';
    }

    if (Object.keys(errors).length > 0) {
      setErrorMessage(null);
      setFieldErrors(errors);
      return;
    }

    setErrorMessage(null);
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await register({
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        poste: form.poste.trim(),
        email: form.email.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation,
      });
      onSuccess();
    } catch (err: any) {
      showApiError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Bienvenue"
      title="Créer un compte"
      subtitle="Rejoignez votre espace de travail en quelques secondes."
      footer={
        <p>
          Déjà un compte ?{' '}
          <button
            type="button"
            onClick={onGoToLogin}
            className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            Se connecter
          </button>
        </p>
      }
    >

      {errorMessage && <AuthAlert title="Inscription impossible" message={errorMessage} />}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField
            label="Prénom"
            name="prenom"
            autoComplete="given-name"
            value={form.prenom}
            onChange={update('prenom')}
            error={fieldErrors.prenom}
          />
          <AuthField
            label="Nom"
            name="nom"
            autoComplete="family-name"
            value={form.nom}
            onChange={update('nom')}
            error={fieldErrors.nom}
          />
        </div>
        <AuthField
          label="Poste"
          name="poste"
          autoComplete="organization-title"
          value={form.poste}
          onChange={update('poste')}
          placeholder="Ex. Développeuse"
          error={fieldErrors.poste}
        />
        <AuthField
          label="Adresse e-mail"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          placeholder="prenom.nom@gmail.com"
          error={fieldErrors.email}
        />
        <AuthField
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={update('password')}
          placeholder="8 caractères minimum"
          error={fieldErrors.password}
        />
        <AuthField
          label="Confirmer le mot de passe"
          name="password_confirmation"
          type="password"
          autoComplete="new-password"
          value={form.password_confirmation}
          onChange={update('password_confirmation')}
          error={fieldErrors.password_confirmation}
        />
        <AuthButton loading={isSubmitting}>Créer mon compte</AuthButton>
      </form>
    </AuthLayout>
  );
};