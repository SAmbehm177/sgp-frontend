import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LayersIcon,LayoutDashboard, Folder, ListCheck, Shield, User, X,Bell } from 'lucide-react';
import { useNotifications } from '../../context/NotificationsContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoute: string;
  onNavigate: (route: string) => void;
}

const navigationItems = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, adminOnly: false, hideForAdmin: false },
  { id: 'projets', label: 'Projets', icon: Folder, adminOnly: false, hideForAdmin: false },
  { id: 'mes-taches', label: 'Mes tâches', icon: ListCheck, adminOnly: false, hideForAdmin: true },
  { id: 'notifications', label: 'Notifications', icon: Bell, adminOnly: false, hideForAdmin: true },
  { id: 'administration', label: 'Administration', icon: Shield, adminOnly: true, hideForAdmin: false },
  { id: 'profile', label: 'Mon profil', icon: User, adminOnly: false, hideForAdmin: false },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentRoute,
  onNavigate,
}) => {
  const { user, isAdmin } = useAuth();
  const { unreadCount } = useNotifications();

  const visibleItems = navigationItems.filter(
    (item) => (!item.adminOnly || isAdmin) && (!item.hideForAdmin || !isAdmin)
  );

  return (
    <>
      {/* Fond sombre (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white text-slate-700 border-r border-card-border flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-card-border shrink-0">
          <div className="flex items-center gap-3">
            <p>
              <LayersIcon className="w-8 h-8 text-brand-700" /> 
            </p>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-800 block">CPNTIC_sgp</span>
              <span className="text-[10px] text-slate-500 block">Gestion de projets</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.16em]">
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
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-100 text-brand-800 shadow-sm border border-brand-200'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-700' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </span>
                  {item.id === 'notifications' && unreadCount > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold tabular-nums rounded-full ${
                    isActive ? 'bg-white text-brand-800' : 'bg-brand-600 text-white'
                  }`}
                >
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
                  )}
              </button>
            );
          })}
        </div>

        {/* Utilisateur connecté */}
        <div className="p-4 border-t border-card-border bg-white">
          <p className="text-xs font-semibold text-slate-800 truncate">{user?.name}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{isAdmin ? 'Administrateur' : 'Membre'}</p>
        </div>
      </aside>
    </>
  );
};