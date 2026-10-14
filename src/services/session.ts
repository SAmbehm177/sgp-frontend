/**
 * Session : jeton d'authentification (conservé dans le navigateur) et adresse de l'API.
 */

const TOKEN_KEY = 'sgp_auth_token_v1';

// Adresse de l'API : variable VITE_API_URL du fichier .env (voir .env.example)
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8000/api';

export const session = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string | null): void {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  },
};

// Anciennes données du mode simulation : supprimées une fois pour toutes du navigateur
// (ce bloc pourra être retiré quand plus personne n'a d'anciennes données locales)
[
  'sgp_users_v1',
  'sgp_personnel_v1',
  'sgp_fonctions_v1',
  'sgp_projets_v1',
  'sgp_membres_v1',
  'sgp_taches_v1',
  'sgp_notifications_v1',
  'sgp_current_user_id_v1',
  'sgp_api_base_url_v1',
  'sgp_use_mock_v1',
].forEach((cle) => localStorage.removeItem(cle));