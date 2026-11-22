import React, { useMemo } from 'react';
import type { NavigateFn } from '../../router';
import { api, toApiError } from '../../services/api';
import { Projet, StatistiquesProjet, Tache, TaskStatus } from '../../types/sgp';
import { tauxAvancementTaches } from '../../utils/avancement';
import { useToast } from '../../context/ToastContext';
import { ProgressBar } from '../common/ProgressBar';
import { ProjectStatusBadge, TaskPriorityBadge, TaskStatusBadge } from '../common/Badge';
import { tacheEnRetard } from '../../utils/taches';
import { getLocalDateString } from '../../utils/date';
import {
  ArrowRight,
  Calendar,
  Check,
} from 'lucide-react';

interface MemberDashboardSectionProps {
  userName: string;
  userPoste?: string;
  personnelId: number | null;
  memberProjects: Projet[];
  allTasks: Tache[];
  statsByProject: Record<number, StatistiquesProjet>;
  functionNames: Record<number, string>;
  unreadNotifs: number;
  onRefreshData: () => void;
  onNavigate: NavigateFn;
}

export const MemberDashboardSection: React.FC<MemberDashboardSectionProps> = ({
  userName,
  userPoste,
  personnelId,
  memberProjects,
  allTasks,
  statsByProject,
  functionNames,
  unreadNotifs,
  onRefreshData,
  onNavigate,
}) => {
  const toast = useToast();
  const today = useMemo(() => getLocalDateString(), []);

  const myAllTasks = useMemo(() => {
    if (!personnelId) return [];
    return allTasks.filter((t) => t.responsable_id === personnelId);
  }, [allTasks, personnelId]);

  const myOngoingTasks = useMemo(
    () =>
      myAllTasks
        .filter((t) => t.statut === 'en_cours')
        .sort((a, b) => a.date_echeance.localeCompare(b.date_echeance)),
    [myAllTasks]
  );

  const myOverdueTasks = useMemo(
    () =>
      myAllTasks.filter(
        (t) => tacheEnRetard(t, today)
      ),
    [myAllTasks, today]
  );

  const myCompletedCount = useMemo(
    () => myAllTasks.filter((t) => t.statut === 'termine').length,
    [myAllTasks]
  );

  const myCancelledCount = useMemo(
    () => myAllTasks.filter((t) => t.statut === 'annule').length,
    [myAllTasks]
  );

  const myActiveTasksCount = myAllTasks.length - myCancelledCount;
  const personalCompletionRate = tauxAvancementTaches(myAllTasks);

  const handleQuickStatusUpdate = async (
    e: React.MouseEvent,
    task: Tache,
    newStatus: TaskStatus
  ) => {
    e.stopPropagation();
    try {
      await api.updateTaskStatus(task.id, newStatus);
      toast.success(
        'Tâche clôturée',
        `« ${task.titre} » est désormais marquée comme terminée.`
      );
      onRefreshData();
    } catch (caught) {
      toast.error('Action refusée', toApiError(caught).message || 'Impossible de modifier cette tâche.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner — Membre / Collaborateur */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Mon espace de travail
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bienvenue, <span className="font-semibold text-slate-700">{userName}</span>
            {userPoste ? ` · ${userPoste}` : ''}. Suivi personnel de vos tâches assignées et projets.
          </p>
        </div>

        <div className="flex items-center gap-2">
        </div>
      </div>

      {/* Member KPI Row (Strictly Personal Scope) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('mes-taches', { filter: 'en_cours' })}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Mes tâches en cours</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {myOngoingTasks.length}
          </p>
          <div className="text-[11px] text-slate-500 mt-1">À traiter et clôturer</div>
        </div>

        <div
          onClick={() => onNavigate('mes-taches', { filter: 'termine' })}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Mon avancement</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-2">
            {personalCompletionRate}%
          </p>
          <div className="text-[11px] text-slate-500 mt-1">
            {myCompletedCount} terminée{myCompletedCount > 1 ? 's' : ''} sur{' '}
            {myActiveTasksCount} tâche{myActiveTasksCount > 1 ? 's' : ''} active
            {myActiveTasksCount > 1 ? 's' : ''}
          </div>
        </div>

        <div
          onClick={() => onNavigate('mes-taches', { filter: 'overdue' })}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Mes tâches en retard</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-rose-600 mt-2">
            {myOverdueTasks.length}
          </p>
          <div className="text-[11px] text-rose-500 mt-1">
            {myOverdueTasks.length > 0 ? 'Échéance dépassée' : 'Aucun retard personnel'}
          </div>
        </div>

        <div
          onClick={() => onNavigate('projets')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Projets affectés</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {memberProjects.length}
          </p>
          <div className="text-[11px] text-slate-500 mt-1">
            {unreadNotifs > 0 ? `${unreadNotifs} notification(s) non lue(s)` : 'Notifications à jour'}
          </div>
        </div>
      </div>

      {/* Personal Completion Summary Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Progression de mes tâches assignées
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Synthèse personnelle de votre charge sur l&apos;ensemble de vos projets.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums font-semibold text-slate-900">
            {myCompletedCount}/{myActiveTasksCount} clôturées ({personalCompletionRate}%)
          </span>
        </div>

        <ProgressBar progress={personalCompletionRate} size="md" showLabel={false} />

        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <button
            type="button"
            onClick={() => onNavigate('mes-taches', { filter: 'termine' })}
            className="text-left hover:bg-slate-50 p-2 rounded-lg transition-colors"
          >
            <span className="text-[11px] text-slate-500 block">Terminées</span>
            <span className="font-mono tabular-nums text-sm font-bold text-emerald-700">
              {myCompletedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('mes-taches', { filter: 'en_cours' })}
            className="text-left hover:bg-slate-50 p-2 rounded-lg transition-colors"
          >
            <span className="text-[11px] text-slate-500 block">En cours</span>
            <span className="font-mono tabular-nums text-sm font-bold text-blue-700">
              {myOngoingTasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('mes-taches', { filter: 'overdue' })}
            className="text-left hover:bg-slate-50 p-2 rounded-lg transition-colors"
          >
            <span className="text-[11px] text-slate-500 block">En retard</span>
            <span className="font-mono tabular-nums text-sm font-bold text-rose-600">
              {myOverdueTasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('mes-taches', { filter: 'annule' })}
            className="text-left hover:bg-slate-50 p-2 rounded-lg transition-colors"
          >
            <span className="text-[11px] text-slate-500 block">Annulées</span>
            <span className="font-mono tabular-nums text-sm font-bold text-slate-600">
              {myCancelledCount}
            </span>
          </button>
        </div>
      </div>

      {/* Main Execution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mes tâches prioritaires avec clôture rapide */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Mes tâches prioritaires à exécuter
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Triées par urgence d&apos;échéance · Vous pouvez clôturer une tâche terminée directement ici.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('mes-taches')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
            >
              Tout afficher <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {myOngoingTasks.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <p className="text-xs text-slate-500">
                  Toutes vos tâches assignées sont clôturées ou aucune tâche en cours ne vous est affectée.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('mes-taches')}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Consulter l&apos;historique de mes tâches
                </button>
              </div>
            ) : (
              myOngoingTasks.slice(0, 6).map((tache) => {
                const isLate = tache.date_echeance < today;
                return (
                  <div
                    key={tache.id}
                    onClick={() =>
                      onNavigate('project-detail', { id: tache.projet_id, tab: 'taches' })
                    }
                    className="py-3 px-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <TaskPriorityBadge priority={tache.priorite} />
                        <h3 className="text-xs font-semibold text-slate-900 truncate">
                          {tache.titre}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
                        <span className="text-blue-600 font-medium truncate max-w-200px">
                          {tache.projet?.titre}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span
                            className={`font-mono tabular-nums ${
                              isLate ? 'text-rose-600 font-bold' : ''
                            }`}
                          >
                            Échéance : {new Date(tache.date_echeance).toLocaleDateString('fr-FR')}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <TaskStatusBadge status={tache.statut} isOverdue={isLate} />
                      <button
                        type="button"
                        onClick={(e) => handleQuickStatusUpdate(e, tache, 'termine')}
                        title="Marquer cette tâche comme terminée"
                        className="px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Check className="w-3 h-3" />
                        Terminer
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Mes projets affectés */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Mes projets affectés</h2>
              <p className="text-xs text-slate-500 mt-0.5">Votre fonction et équipe</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('projets')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
            >
              Tous <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {memberProjects.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Vous n&apos;êtes affecté à aucun projet pour le moment.
              </div>
            ) : (
              memberProjects.map((projet) => {
                const stats = statsByProject[projet.id];
                const chef = projet.chefs_noms?.[0];
                const myProjectTasksCount = personnelId
                  ? myAllTasks.filter((t) => t.projet_id === projet.id && t.statut === 'en_cours')
                      .length
                  : 0;

                return (
                  <div
                    key={projet.id}
                    onClick={() => onNavigate('project-detail', { id: projet.id })}
                    className="py-3.5 first:pt-1 last:pb-1 hover:bg-slate-50/70 rounded-lg px-2 -mx-2 transition-colors cursor-pointer space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {projet.titre}
                      </h3>
                      <ProjectStatusBadge status={projet.statut} />
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <p>
                        Fonction :{' '}
                        <strong className="text-slate-700">
                          {functionNames[projet.ma_fonction_id ?? -1] || 'Membre'}
                        </strong>
                        {chef && (
                          <>
                            {' '}
                            · Chef : {chef}
                          </>
                        )}
                      </p>
                      <p className="font-mono tabular-nums">
                        {myProjectTasksCount} tâche{myProjectTasksCount > 1 ? 's' : ''} en cours
                        pour vous
                      </p>
                    </div>

                    <ProgressBar progress={stats.taux_avancement} size="sm" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
