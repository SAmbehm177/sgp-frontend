import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout, AuthField, AuthAlert, AuthButton } from './AuthLayout';
import { toApiError, ApiError } from '../../services/api';

interface LoginViewProps {
  onSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Affiche l'erreur renvoyée par l'API (422 de validation, 401 identifiants, 403 compte désactivé...)
  const showApiError = (err: ApiError) => {
    setErrorMessage(err?.message || 'Échec de la connexion.');
    if (err?.errors) {
      const fe: Record<string, string> = {};
      Object.entries(err.errors as Record<string, string[]>).forEach(([k, v]) => {
        if (k === 'email' || k === 'password') fe[k] = v[0];
      });
      setFieldErrors(fe);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = "L'adresse e-mail est obligatoire.";
    if (!password) errors.password = 'Le mot de passe est obligatoire.';
    if (Object.keys(errors).length > 0) {
      setErrorMessage(null);
      setFieldErrors(errors);
      return;
    }

    setErrorMessage(null);
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      onSuccess();
    } catch (caught) {
      const err = toApiError(caught);
      showApiError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Ravi de vous revoir"
      title="Connexion"
      subtitle="Accédez à votre espace de travail."
    >

      {errorMessage && <AuthAlert title="Connexion impossible" message={errorMessage} />}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        
        <AuthField
          label="Adresse e-mail"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="prenom.nom@gmail.com"
          error={fieldErrors.email}
        />
        <AuthField
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          error={fieldErrors.password}
        />
        <AuthButton loading={isSubmitting}>Se connecter</AuthButton>
      </form>
    </AuthLayout>
  );
};