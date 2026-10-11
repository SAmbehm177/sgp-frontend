import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Personnel } from '../types/sgp';
import { api,RegisterPayload } from '../services/api';
import { sgpStorage } from '../services/storage';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  personnel: Personnel | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isChefDeProjet: (projetId: number) => boolean;
  isMembre: (projetId: number) => boolean;
  canManageProject: (projetId: number) => boolean;
  canEditTaskStatus: (task: { projet_id: number; responsable_id: number }) => boolean;
  canCreateTasks: (projetId: number) => boolean;
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
      if (!sgpStorage.getAuthToken()) {
        setUser(null);
        setPersonnel(null);
        return;
      }
      const me = await api.getMe();
      setUser(me.user);
      setPersonnel(me.personnel);
    } catch (err: any) {
      // Jeton invalide, compte désactivé ou API injoignable : on repart sur la page de connexion
      setUser(null);
      setPersonnel(null);
      if (err?.status !== 0) {
        sgpStorage.setAuthToken(null);
        sgpStorage.setCurrentUserId(null);
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
  const login = async (email: string, password: string): Promise<void> => {
    const res = await api.login(email, password);
    setUser(res.user);
    setPersonnel(res.personnel);
    toast.success('Connexion réussie', `Bienvenue, ${res.user.name} !`);
  };

  const register = async (data: RegisterPayload): Promise<void> => {
  const res = await api.register(data);
  setUser(res.user);
  setPersonnel(res.personnel);
  toast.success('Compte créé', `Bienvenue, ${res.user.name} !`);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err: any) {
      console.error('Logout error', err);
    } finally {
      // Même si l'API échoue, la session locale est fermée
      setUser(null);
      setPersonnel(null);
      toast.info('Déconnexion effectuée', 'À bientôt.');
    }
  };

  const refreshUser = async () => {
    await loadUserData();
  };

  // Role verification helpers
  const isAdmin = user?.role === 'admin';

  const isChefDeProjet = useCallback(
    (projetId: number): boolean => {
      if (!user) return false;
      if (isAdmin) return true; // Admin has full access
      if (!personnel) return false;

      const members = sgpStorage.getMembresByProjet(projetId);
      const member = members.find((m) => m.personnel_id === personnel.id && m.statut === 'actif');
      return member?.fonction?.libelle === 'Chef de projet';
    },
    [user, isAdmin, personnel]
  );

  const isMembre = useCallback(
    (projetId: number): boolean => {
      if (!user) return false;
      if (isAdmin) return true;
      if (!personnel) return false;

      const members = sgpStorage.getMembresByProjet(projetId);
      return members.some((m) => m.personnel_id === personnel.id && m.statut === 'actif');
    },
    [user, isAdmin, personnel]
  );

  const canManageProject = useCallback(
    (projetId: number): boolean => {
      return isAdmin || isChefDeProjet(projetId);
    },
    [isAdmin, isChefDeProjet]
  );

  const canCreateTasks = useCallback(
    (projetId: number): boolean => {
      return isAdmin || isChefDeProjet(projetId);
    },
    [isAdmin, isChefDeProjet]
  );

  const canEditTaskStatus = useCallback(
    (task: { projet_id: number; responsable_id: number }): boolean => {
      if (!user) return false;
      if (isAdmin) return true;
      if (isChefDeProjet(task.projet_id)) return true;
      if (personnel && task.responsable_id === personnel.id) return true;
      return false;
    },
    [user, isAdmin, isChefDeProjet, personnel]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        personnel,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        isAdmin,
        isChefDeProjet,
        isMembre,
        canManageProject,
        canEditTaskStatus,
        canCreateTasks,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
