import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { sgpStorage } from '../../services/storage';
import { NotificationItem } from '../../types/sgp';
import {
  Bell,
  Menu,
  ChevronDown,
  LogOut,
  User as UserIcon,
  CheckCheck,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
  currentRoute: string;
  onNavigate: (route: string, params?: any) => void;
  breadcrumbs?: Array<{ label: string; onClick?: () => void }>;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onNavigate,
  breadcrumbs = [],
}) => {
  const { user, personnel, logout, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Refresh notifications
  const loadNotifications = () => {
    if (user) {
      const list = sgpStorage.getNotifications(user.id);
      setNotifications(list.slice(0, 5));
      setUnreadCount(list.filter((n) => !n.lue).length);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = (id: number) => {
    sgpStorage.markNotificationAsRead(id);
    loadNotifications();
  };

  const handleMarkAllRead = () => {
    if (user) {
      sgpStorage.markAllNotificationsAsRead(user.id);
      loadNotifications();
    }
  };


  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200">
      {/* Zone 1: Brand & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 rounded-lg hover:bg-slate-100 lg:hidden focus:outline-hidden"
          aria-label="Ouvrir le menu de navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Wordmark single text element */}
        <button
         onClick={() => onNavigate('projets')}
         className="text-base font-bold tracking-tight text-brand-800 hidden sm:block whitespace-nowrap hover:text-brand-950 transition-colors"
        >
          SGP
        </button>

        <span className="hidden sm:inline text-slate-300">/</span>

        {/* Contextual Breadcrumb */}
        <nav aria-label="Fil d'Ariane" className="flex items-center text-xs font-medium text-slate-500 truncate">
          {breadcrumbs.map((b, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="mx-2 text-slate-300">/</span>}
              {b.onClick ? (
                <button
                  onClick={b.onClick}
                  className="hover:text-slate-900 transition-colors truncate max-w-[150px] sm:max-w-[200px]"
                >
                  {b.label}
                </button>
              ) : (
                <span className="text-slate-900 font-semibold truncate max-w-[150px] sm:max-w-[200px]">
                  {b.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Zone 2 & 3: Actions & Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Notifications Dropdown (Section 5.7) */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors relative"
            aria-label="Centre de notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full font-mono tabular-nums animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-40">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-sm font-semibold font-mono">
                      {unreadCount} non lues
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Tout marquer
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Aucune notification pour le moment
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        handleMarkAsRead(n.id);
                        if (n.data?.projet_id) {
                          onNavigate('project-detail', { id: n.data.projet_id, tab: 'taches' });
                          setShowNotifMenu(false);
                        }
                      }}
                      className={`p-3 text-left hover:bg-slate-50 cursor-pointer transition-colors ${
                        !n.lue ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs ${!n.lue ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                          {n.titre}
                        </p>
                        {!n.lue && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(n.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    onNavigate('notifications');
                    setShowNotifMenu(false);
                  }}
                  className="text-xs text-slate-700 hover:text-slate-900 font-medium py-1 px-3 rounded-md hover:bg-slate-50 w-full transition-colors"
                >
                  Voir toutes les notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-brand-800 text-white flex items-center justify-center font-bold text-xs uppercase">
              {user?.name.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-none">{user?.name}</p>
              <p className="text-[10px] text-slate-500 leading-none mt-1">
                {isAdmin ? 'Administrateur' : personnel?.poste || 'Collaborateur'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40">
              <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
                <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-500">{user?.email}</p>
              </div>

              <button
                onClick={() => {
                  onNavigate('profile');
                  setShowUserMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
              >
                <UserIcon className="w-4 h-4 text-slate-400" />
                Mon Profil
              </button>

              <div className="border-t border-slate-100 my-1" />

              <button
                onClick={() => {
                  logout();
                  setShowUserMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
