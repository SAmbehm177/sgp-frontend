import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { sgpStorage } from '../../services/storage';
import { NotificationItem } from '../../types/sgp';
import { useToast } from '../../context/ToastContext';
import {
  Bell,
  CheckCheck,
  Check,
  ArrowRight,
  Clock,
  Briefcase,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface NotificationsViewProps {
  onNavigate: (route: string, params?: any) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const toast = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadNotifs = () => {
    if (user) {
      setNotifications(sgpStorage.getNotifications(user.id));
    }
  };

  useEffect(() => {
    loadNotifs();
  }, [user]);

  const handleMarkAsRead = (id: number) => {
    sgpStorage.markNotificationAsRead(id);
    loadNotifs();
  };

  const handleMarkAllRead = () => {
    if (user) {
      sgpStorage.markAllNotificationsAsRead(user.id);
      toast.success('Toutes les notifications sont marquées comme lues');
      loadNotifs();
    }
  };

  const handleItemClick = (n: NotificationItem) => {
    handleMarkAsRead(n.id);
    if (n.data?.projet_id) {
      onNavigate('project-detail', { id: n.data.projet_id, tab: 'taches' });
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.lue;
    return true;
  });

  const unreadTotal = notifications.filter((n) => !n.lue).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Centre de notifications
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Suivi des affectations de tâches, alertes d'échéances et changements de statut.
          </p>
        </div>

        {unreadTotal > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <CheckCheck className="w-4 h-4 text-slate-500" />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Tabs / Filters */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
            filter === 'all'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Toutes ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
            filter === 'unread'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Non lues ({unreadTotal})
        </button>
      </div>

      {/* Notification List */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <h3 className="text-sm font-semibold text-slate-700">Aucune notification</h3>
            <p className="text-xs text-slate-500 mt-1">
              {filter === 'unread'
                ? 'Toutes vos notifications sont à jour.'
                : 'Aucune notification pour le moment.'}
            </p>
          </div>
        ) : (
          filtered.map((n) => {
            const icons = {
              affectation_tache: <Briefcase className="w-4 h-4 text-blue-600" />,
              changement_statut: <Clock className="w-4 h-4 text-emerald-600" />,
              systeme: <AlertTriangle className="w-4 h-4 text-amber-600" />,
              projet: <Info className="w-4 h-4 text-purple-600" />,
            };

            return (
              <div
                key={n.id}
                className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                  !n.lue ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'hover:bg-slate-50/80'
                }`}
              >
                <div
                  className="flex items-start gap-3 flex-1 cursor-pointer"
                  onClick={() => handleItemClick(n)}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      !n.lue ? 'bg-white shadow-xs border border-slate-200' : 'bg-slate-100'
                    }`}
                  >
                    {icons[n.type] || <Bell className="w-4 h-4 text-slate-500" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-xs ${
                          !n.lue ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                        }`}
                      >
                        {n.titre}
                      </h4>
                      {!n.lue && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span>
                        {new Date(n.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {n.data?.projet_id && (
                        <span className="text-blue-600 font-medium flex items-center gap-1 hover:underline">
                          Voir la tâche <ArrowRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!n.lue && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white transition-colors shrink-0"
                    title="Marquer comme lue"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
