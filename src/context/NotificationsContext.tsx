import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { NotificationItem } from '../types/sgp';
import { useAuth } from './AuthContext';

interface NotificationsContextType {
  notifications: NotificationItem[]; // les plus récentes
  unreadCount: number;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const INTERVALLE_ACTUALISATION = 60_000; // 1 minute

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [liste, nonLues] = await Promise.all([api.getNotifications(), api.getUnreadCount()]);
      setNotifications(liste);
      setUnreadCount(nonLues);
    } catch {
      // Silencieux : une actualisation manquée ne doit pas gêner l'écran
    }
  }, []);

  // Chargement à la connexion, puis actualisation régulière et au retour sur l'onglet
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    refresh();
    const minuteur = setInterval(refresh, INTERVALLE_ACTUALISATION);
    const auRetour = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', auRetour);

    return () => {
      clearInterval(minuteur);
      document.removeEventListener('visibilitychange', auRetour);
    };
  }, [isAuthenticated, refresh]);

  // Mise à jour immédiate de l'écran, puis confirmation par l'API (refresh = vérité en cas d'échec)
  const markAsRead = async (id: string) => {
    const etaitNonLue = notifications.some((n) => n.id === id && !n.lue);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, lue: true } : n)));
    if (etaitNonLue) setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await api.markNotificationRead(id);
    } catch {
      // Le refresh ci-dessous rétablit l'état réel
    }
    await refresh();
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })));
    setUnreadCount(0);

    try {
      await api.markAllNotificationsRead();
    } catch {
      // Le refresh ci-dessous rétablit l'état réel
    }
    await refresh();
  };

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, refresh, markAsRead, markAllAsRead }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};