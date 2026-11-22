import React, { useMemo, useState } from 'react';
import type { NavigateFn } from '../../../router';
import type { Tache } from '../../../types/sgp';
import { TaskPriorityBadge, TaskStatusBadge } from '../../common/Badge';
import { ArrowRight, Calendar } from 'lucide-react';

type TaskTabMode = 'team' | 'mine';

interface TeamTasksPanelProps {
  teamOngoingTasks: Tache[];
  myOngoingTasks: Tache[];
  selectedManagedId: string;
  today: string;
  onNavigate: NavigateFn;
}

/** Échéances d'équipe ou mes tâches en cours, selon l'onglet choisi. */
export const TeamTasksPanel: React.FC<TeamTasksPanelProps> = ({
  teamOngoingTasks,
  myOngoingTasks,
  selectedManagedId,
  today,
  onNavigate,
}) => {
  const [taskTab, setTaskTab] = useState<TaskTabMode>('team');

  const displayedTasks = useMemo(() => {
    const base = taskTab === 'team' ? teamOngoingTasks : myOngoingTasks;
    if (taskTab === 'team' && selectedManagedId !== 'all') {
      return base.filter((t) => String(t.projet_id) === selectedManagedId);
    }
    return base;
  }, [taskTab, teamOngoingTasks, myOngoingTasks, selectedManagedId]);

  return (
    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            {taskTab === 'team'
              ? "Tâches d'équipe à surveiller"
              : 'Mes tâches personnelles en cours'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Triées par échéance la plus urgente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg">
            <button
              type="button"
              onClick={() => setTaskTab('team')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                taskTab === 'team'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Équipe ({teamOngoingTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setTaskTab('mine')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                taskTab === 'mine'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mes tâches ({myOngoingTasks.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('mes-taches')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            Voir tout <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 divide-y divide-slate-100">
        {displayedTasks.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Aucune tâche en cours sur ce périmètre.
          </div>
        ) : (
          displayedTasks.slice(0, 6).map((tache) => {
            const isLate = tache.date_echeance < today;
            return (
              <div
                key={tache.id}
                onClick={() =>
                  onNavigate('project-detail', { id: tache.projet_id, tab: 'taches' })
                }
                className="py-3 px-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <TaskPriorityBadge priority={tache.priorite} />
                    <h3 className="text-xs font-semibold text-slate-900 truncate">
                      {tache.titre}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
                    <span className="text-blue-600 font-medium truncate max-w-180px">
                      {tache.projet?.titre}
                    </span>
                    {tache.responsable && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-700 font-medium">
                          {tache.responsable.prenom} {tache.responsable.nom}
                        </span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span
                        className={`font-mono tabular-nums ${
                          isLate ? 'text-rose-600 font-bold' : ''
                        }`}
                      >
                        {new Date(tache.date_echeance).toLocaleDateString('fr-FR')}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <TaskStatusBadge status={tache.statut} isOverdue={isLate} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
