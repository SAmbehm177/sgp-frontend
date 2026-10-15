import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { NotificationItem } from '../../types/sgp';
import { tempsRelatif, titreNotification, ongletNotification } from '../../utils/format';
import { Menu, ChevronDown, LogOut, User as UserIcon, Bell } from 'lucide-react';

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
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Clic en dehors du menu : on le ferme
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ouvrirNotification = (n: NotificationItem) => {
    setShowNotifs(false);
    if (!n.lue) markAsRead(n.id);
    if (n.projet_id && n.type !== 'membre_retire') {
      onNavigate('project-detail', { id: n.projet_id, tab: ongletNotification(n.type) });
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200">
      {/* Marque et fil d'Ariane */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 rounded-lg hover:bg-slate-100 lg:hidden focus:outline-hidden"
          aria-label="Ouvrir le menu de navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="hidden sm:inline text-slate-300">/</span>

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

      {/* Menu utilisateur */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifs(!showNotifs);
              setShowUserMenu(false);
            }}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} non lues)` : 'Notifications'}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-800 text-white text-[10px] font-bold tabular-nums flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-slate-200 z-40 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h2 className="text-xs font-bold text-slate-900">Notifications</h2>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-[11px] font-medium text-brand-800 hover:text-brand-950"
                  >
                    Tout marquer comme lu
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-slate-500">Aucune notification.</p>
              ) : (
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                  {notifications.slice(0, 6).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => ouvrirNotification(n)}
                      className={`w-full text-left px-4 py-3 transition-colors hover:bg-slate-50 ${
                        n.lue ? '' : 'bg-brand-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className={`text-xs ${n.lue ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                          {titreNotification(n.type)}
                        </p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                          {tempsRelatif(n.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  setShowNotifs(false);
                  onNavigate('notifications');
                }}
                className="w-full px-4 py-2.5 text-center text-xs font-medium text-brand-800 hover:bg-brand-50 border-t border-slate-100 transition-colors"
              >
                Voir toutes les notifications
              </button>
            </div>
          )}
        </div>

        <div className="relative" ref={userRef}>
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifs(false);
            }}
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
                Mon profil
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