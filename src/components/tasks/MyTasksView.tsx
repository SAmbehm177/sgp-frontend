import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api, toApiError } from '../../services/api';
import { Tache, TaskStatus, RouteParams } from '../../types/sgp';
import { TaskStatusBadge, TaskPriorityBadge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { formatJour } from '../../utils/format';
import {
  CheckSquare,
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';

interface MyTasksViewProps {
  onNavigate: (route: string, params?: RouteParams) => void;
  initialFilter?: string;
}

type Vue = 'toutes' | 'en_cours' | 'retard' | 'terminees';

const aujourdhui = () => new Date().toISOString().split('T')[0];

export const MyTasksView: React.FC<MyTasksViewProps> = ({ onNavigate, initialFilter }) => {
  const { user, isAdmin } = useAuth();
  const toast = useToast();

  const [taches, setTaches] = useState<Tache[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sansFiche, setSansFiche] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [vue, setVue] = useState<Vue>(initialFilter === 'overdue' ? 'retard' : 'toutes');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const loadTaches = async () => {
    setLoadError(null);
    try {
      setTaches(await api.getMyTasks());
      setSansFiche(false);
    } catch (caught) {
      const err = toApiError(caught);
      // 404 : le compte n'a pas de fiche personnel (cas d'un administrateur)
      if (err?.status === 404) {
        setSansFiche(true);
        setTaches([]);
      } else {
        setLoadError(err?.message || 'Impossible de charger vos tâches.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTaches();
  }, []);

  const today = aujourdhui();
  const estEnRetard = (t: Tache) => t.statut === 'en_cours' && t.date_echeance < today;

  const compteurs = {
    toutes: taches.length,
    en_cours: taches.filter((t) => t.statut === 'en_cours').length,
    retard: taches.filter(estEnRetard).length,
    terminees: taches.filter((t) => t.statut === 'termine').length,
  };

  const VUES: { id: Vue; label: string }[] = [
    { id: 'toutes', label: 'Toutes' },
    { id: 'en_cours', label: 'En cours' },
    { id: 'retard', label: 'En retard' },
    { id: 'terminees', label: 'Terminées' },
  ];

  const handleStatusChange = async (t: Tache, statut: TaskStatus) => {
    setBusyId(t.id);
    try {
      await api.updateTaskStatus(t.id, statut);
      const libelle = statut === 'en_cours' ? 'En cours' : statut === 'termine' ? 'Terminée' : 'Annulée';
      toast.success('Statut mis à jour', `La tâche « ${t.titre} » est maintenant « ${libelle} ».`);
      await loadTaches();
    } catch (caught) {
      const err = toApiError(caught);
      toast.error('Action refusée', err?.message || 'Impossible de changer le statut.');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = taches
    .filter((t) => {
      const terme = search.toLowerCase();
      const matchesSearch =
        t.titre.toLowerCase().includes(terme) ||
        t.description.toLowerCase().includes(terme) ||
        (t.projet?.titre ?? '').toLowerCase().includes(terme);
      const matchesPriority = priorityFilter === 'all' || t.priorite === priorityFilter;
      const matchesVue =
        vue === 'toutes' ||
        (vue === 'en_cours' && t.statut === 'en_cours') ||
        (vue === 'retard' && estEnRetard(t)) ||
        (vue === 'terminees' && t.statut === 'termine');
      return matchesSearch && matchesPriority && matchesVue;
    })
    // Les tâches en cours d'abord, par échéance croissante
    .sort(
      (a, b) =>
        Number(b.statut === 'en_cours') - Number(a.statut === 'en_cours') ||
        a.date_echeance.localeCompare(b.date_echeance)
    );

  const iconButton = 'p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Mes tâches</h1>
        <p className="text-xs text-slate-500 mt-1">
          Les tâches qui vous sont confiées, tous projets confondus.
        </p>
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 p-4 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={() => {
              setIsLoading(true);
              loadTaches();
            }}
            className="px-3 py-1.5 font-medium text-rose-800 bg-white border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors shrink-0"
          >
            Réessayer
          </button>
        </div>
      )}

      {isLoading && <div className="h-48 bg-white rounded-xl border border-slate-200 animate-pulse" aria-busy="true" />}

      {!isLoading && !loadError && taches.length === 0 && (
        <EmptyState
          icon={<CheckSquare className="w-6 h-6" />}
          title="Aucune tâche pour le moment"
          description={
            sansFiche && isAdmin
              ? "Les tâches sont confiées aux membres des projets. Votre compte administrateur n'a pas de fiche personnel : aucune tâche ne peut vous être attribuée. Retrouvez les tâches de chaque projet depuis sa page."
              : 'Les tâches qui vous seront confiées apparaîtront ici.'
          }
          action={{ label: 'Voir les projets', onClick: () => onNavigate('projets') }}
        />
      )}

      {!isLoading && taches.length > 0 && (
        <>
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto w-fit max-w-full">
              {VUES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVue(v.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    vue === v.id ? 'bg-white text-brand-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {v.label} ({compteurs[v.id]})
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative min-w-[220px]">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher une tâche ou un projet..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:border-brand-800 focus:ring-brand-800/20"
                />
              </div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:border-brand-800 focus:ring-brand-800/20"
              >
                <option value="all">Toutes priorités</option>
                <option value="basse">Basse</option>
                <option value="moyenne">Moyenne</option>
                <option value="haute">Haute</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
                    <th className="py-3 px-4">Tâche</th>
                    <th className="py-3 px-4">Projet</th>
                    <th className="py-3 px-4">Priorité</th>
                    <th className="py-3 px-4">Échéance</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        Aucune tâche ne correspond à votre sélection.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((t) => {
                      const retard = estEnRetard(t);

                      return (
                        <tr
                          key={t.id}
                          className={`hover:bg-slate-50/80 transition-colors ${retard ? 'bg-rose-50/30' : ''}`}
                        >
                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-semibold text-slate-900 leading-tight">{t.titre}</div>
                            {t.description && (
                              <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{t.description}</div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <button
                              onClick={() => onNavigate('project-detail', { id: t.projet_id, tab: 'taches' })}
                              className="inline-flex items-center gap-1 text-brand-800 hover:text-brand-950 hover:underline text-left font-medium"
                              title="Ouvrir le projet"
                            >
                              <span className="line-clamp-1">{t.projet?.titre ?? `Projet #${t.projet_id}`}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </button>
                          </td>

                          <td className="py-3 px-4">
                            <TaskPriorityBadge priority={t.priorite} />
                          </td>

                          <td
                            className={`py-3 px-4 font-mono tabular-nums whitespace-nowrap ${
                              retard ? 'text-rose-700 font-semibold' : 'text-slate-600'
                            }`}
                          >
                            {formatJour(t.date_echeance)}
                          </td>

                          <td className="py-3 px-4">
                            <TaskStatusBadge status={t.statut} isOverdue={retard} />
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-0.5">
                              {t.statut === 'en_cours' ? (
                                <>
                                  <button
                                    onClick={() => handleStatusChange(t, 'termine')}
                                    disabled={busyId === t.id}
                                    className={`${iconButton} text-slate-400 hover:text-emerald-600 hover:bg-emerald-50`}
                                    title="Marquer comme terminée"
                                    aria-label={`Marquer « ${t.titre} » comme terminée`}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(t, 'annule')}
                                    disabled={busyId === t.id}
                                    className={`${iconButton} text-slate-400 hover:text-slate-700 hover:bg-slate-100`}
                                    title="Annuler la tâche"
                                    aria-label={`Annuler « ${t.titre} »`}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(t, 'en_cours')}
                                  disabled={busyId === t.id}
                                  className={`${iconButton} text-slate-400 hover:text-brand-800 hover:bg-brand-50`}
                                  title="Rouvrir la tâche"
                                  aria-label={`Rouvrir « ${t.titre} »`}
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};