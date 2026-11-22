import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, Personnel } from '../types/sgp';
import { api, toApiError } from '../services/api';
import { session } from '../services/session';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  personnel: Personnel | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [personnel, setPersonnel] = useState<Personnel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  // Restaure la session au démarrage : jeton présent -> GET /me
  const loadUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!session.getToken()) {
        setUser(null);
        setPersonnel(null);
        return;
      }
      const me = await api.getMe();
      setUser(me.user);
      setPersonnel(me.personnel);
    } catch (caught) {
      const err = toApiError(caught);
      // Jeton invalide, compte désactivé ou API injoignable : on repart sur la page de connexion
      setUser(null);
      setPersonnel(null);
      if (err?.status !== 0) {
        session.setToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setPersonnel(null);
      toast.warning('Session expirée', 'Veuillez vous reconnecter.');
    };
    window.addEventListener('sgp:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('sgp:unauthorized', handleUnauthorized);
  }, [toast]);

  // Lève l'erreur API (ApiError) : c'est la page de connexion qui affiche le message.
  // Pas de isLoading global ici, sinon App démonte LoginView et efface l'erreur affichée.
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const res = await api.login(email, password);
      setUser(res.user);
      setPersonnel(res.personnel);
      toast.success('Connexion réussie', `Bienvenue, ${res.user.name} !`);
    },
    [toast]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (caught) {
      const err = toApiError(caught);
      console.error('Logout error', err);
    } finally {
      // Même si l'API échoue, la session locale est fermée
      setUser(null);
      setPersonnel(null);
      toast.info('Déconnexion effectuée', 'À bientôt.');
    }
  }, [toast]);

  // Valeur du contexte stable : les composants ne se re-rendent que si la session change vraiment
  const value = useMemo<AuthContextType>(
    () => ({
      user,
      personnel,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      refreshUser: loadUserData,
      isAdmin: user?.role === 'admin',
    }),
    [user, personnel, isLoading, login, logout, loadUserData]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};