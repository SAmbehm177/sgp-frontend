import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FolderIcon,
  ListTodo,
  Bell,
  Shield,
  UserIcon,
  X,
} from 'lucide-react';
import { sgpStorage } from '../../services/storage';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentRoute,
  onNavigate,
}) => {
  const { user, isAdmin } = useAuth();

  const unreadNotifs = user ? sgpStorage.getUnreadNotificationCount(user.id) : 0;

  // `ready` : écran déjà branché sur l'API. Les autres restent masqués
  // jusqu'à leur étape d'adaptation (passer `ready` à true le moment venu).
  const navigationItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, adminOnly: false, ready: true },
    { id: 'projets', label: 'Projets', icon: FolderIcon, adminOnly: false, ready: true },
    { id: 'mes-taches', label: 'Mes tâches', icon: ListTodo, adminOnly: false, ready: true },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotifs > 0 ? unreadNotifs : null,
      adminOnly: false,
      ready: false,
    },
    { id: 'administration', label: 'Administration', icon: Shield, adminOnly: true, ready: true },
    { id: 'profile', label: 'Mon profil', icon: UserIcon, adminOnly: false, ready: true },
    
  ];

  const visibleItems = navigationItems.filter(
    (item) => item.ready && (!item.adminOnly || isAdmin)
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-brand-950/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-brand-950 text-white flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-700 flex items-center justify-center font-bold text-white shadow-xs">
              S
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">SGP</span>
              <span className="text-[10px] text-brand-300 block">Gestion de projets</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-brand-300 hover:text-white rounded-lg lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2">
            <span className="text-[10px] font-semibold text-brand-300/80 uppercase tracking-wider">
              Menu
            </span>
          </div>

          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentRoute === item.id ||
              (item.id === 'projets' && currentRoute.startsWith('project'));

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-700 text-white shadow-xs'
                    : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-brand-300'}`} />
                  <span>{item.label}</span>
                </div>
                {'badge' in item && item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-mono tabular-nums font-bold rounded-full ${
                      isActive ? 'bg-white text-brand-800' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Utilisateur connecté */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
          <p className="text-[11px] text-brand-300 mt-0.5">{isAdmin ? 'Administrateur' : 'Membre'}</p>
        </div>
      </aside>
    </>
  );
};