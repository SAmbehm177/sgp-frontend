import React from 'react';
import type { NavigateFn } from '../../../router';
import type { Projet, Tache } from '../../../types/sgp';

interface ChefKpiRowProps {
  managedProjects: Projet[];
  teamTasks: Tache[];
  teamOngoingTasks: Tache[];
  teamOverdueTasks: Tache[];
  myOngoingTasks: Tache[];
  unreadNotifs: number;
  onNavigate: NavigateFn;
}

/** Quatre indicateurs : projets pilotés, tâches d'équipe en cours, retards, mes tâches / notifications. */
export const ChefKpiRow: React.FC<ChefKpiRowProps> = ({
  managedProjects,
  teamTasks,
  teamOngoingTasks,
  teamOverdueTasks,
  myOngoingTasks,
  unreadNotifs,
  onNavigate,
}) => {
  const managedActiveCount = managedProjects.filter((p) => p.statut === 'en_cours').length;
  const firstOverdueProjetId = teamOverdueTasks[0]?.projet_id ?? managedProjects[0]?.id;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        onClick={() => onNavigate('projets')}
        className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Projets pilotés</span>

        </div>
        <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
          {managedProjects.length}
        </p>
        <div className="text-[11px] text-slate-500 mt-1">
          {managedActiveCount} actif{managedActiveCount > 1 ? 's' : ''} sous votre direction
        </div>
      </div>

      <div
        onClick={() => {
          if (managedProjects[0]) {
            onNavigate('project-detail', { id: managedProjects[0].id, tab: 'taches' });
          }
        }}
        className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Tâches d&apos;équipe en cours</span>

        </div>
        <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
          {teamOngoingTasks.length}
        </p>
        <div className="text-[11px] text-slate-500 mt-1">
          Sur {teamTasks.length} tâche{teamTasks.length > 1 ? 's' : ''} au total
        </div>
      </div>

      <div
        onClick={() => {
          if (firstOverdueProjetId) {
            onNavigate('project-detail', { id: firstOverdueProjetId, tab: 'taches' });
          }
        }}
        className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Retards d&apos;équipe</span>

        </div>
        <p className="text-2xl font-bold font-mono tabular-nums text-rose-600 mt-2">
          {teamOverdueTasks.length}
        </p>
        <div className="text-[11px] text-rose-500 mt-1">
          {teamOverdueTasks.length > 0 ? 'Échéances à arbitrer' : 'Aucun retard sur vos projets'}
        </div>
      </div>

      <div
        onClick={() => onNavigate('mes-taches')}
        className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Mes tâches assignées</span>

        </div>
        <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
          {myOngoingTasks.length}
        </p>
        <div className="text-[11px] text-slate-500 mt-1">
          {unreadNotifs > 0 ? `${unreadNotifs} notification(s) non lue(s)` : 'Notifications à jour'}
        </div>
      </div>
    </div>
  );
};
