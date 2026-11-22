import React, { useMemo } from 'react';
import type { NavigateFn } from '../../router';
import { ArrowRight, Calendar} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useApiData } from '../../hooks/useApiData';
import { DashboardProgressCharts } from './DashboardProgressCharts';
import { ChefDashboardSection } from './ChefDashboardSection';
import { MemberDashboardSection } from './MemberDashboardSection';
import { TaskPriorityBadge, TaskStatusBadge, ProjectStatusBadge } from '../common/Badge';
import { ProgressBar } from '../common/ProgressBar';
import { tacheEnRetard } from '../../utils/taches';
import { getLocalDateString } from '../../utils/date';
import { LIBELLE_CHEF_PROJET } from '../../constants';

interface DashboardViewProps {
  onNavigate: NavigateFn;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user, personnel, isAdmin } = useAuth();
  // Un seul appel pour tout le tableau de bord (voir GET /api/dashboard)
  const { data, isLoading, error: loadError, reload: loadDashboardData } = useApiData(
    () => api.getDashboard(),
    [personnel]
  );

  const projets = useMemo(() => data?.projets ?? [], [data]);
  const allTasks = useMemo(() => data?.taches ?? [], [data]);
  const statsByProject = useMemo(() => data?.statsParProjet ?? {}, [data]);
  const membersByProject = useMemo(() => data?.membresParProjet ?? {}, [data]);
  const functionNames = useMemo(
    () => Object.fromEntries((data?.fonctions ?? []).map((fn) => [fn.id, fn.libelle])),
    [data]
  );
  const unreadNotifs = isAdmin ? 0 : (data?.notificationsNonLues ?? 0);

  const avertissementTronque = data?.tachesTronquees ? (
    <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      Vous avez beaucoup de tâches : seules les premières (par échéance) sont affichées dans les listes.
    </p>
  ) : null;

  const managedProjects = useMemo(
    () =>
      isAdmin
        ? projets
        : projets.filter((project) => functionNames[project.ma_fonction_id ?? -1] === LIBELLE_CHEF_PROJET),
    [projets, isAdmin, functionNames]
  );
  const participatingProjects = useMemo(() => {
    const managedIds = new Set(managedProjects.map((project) => project.id));
    return projets.filter((project) => !managedIds.has(project.id));
  }, [projets, managedProjects]);

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-24 rounded-xl border border-slate-200 bg-white animate-pulse" />
        <div className="h-32 rounded-xl border border-slate-200 bg-white animate-pulse" />
        <div className="h-64 rounded-xl border border-slate-200 bg-white animate-pulse" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-900">Le tableau de bord n’a pas pu être chargé.</p>
        <p className="mt-1 text-xs text-slate-600">{loadError}</p>
        <button
          type="button"
          onClick={loadDashboardData}
          className="mt-3 text-xs font-semibold text-brand-800 hover:text-brand-950"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!isAdmin && managedProjects.length > 0 && personnel) {
    return (
      <>
        {avertissementTronque}
        <ChefDashboardSection
          userName={user?.name || 'Chef de projet'}
          personnelId={personnel.id}
          managedProjects={managedProjects}
          participatingProjects={participatingProjects}
          allTasks={allTasks}
          statsByProject={statsByProject}
          membersByProject={membersByProject}
          functionNames={functionNames}
          unreadNotifs={unreadNotifs}
          onNavigate={onNavigate}
        />
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        {avertissementTronque}
        <MemberDashboardSection
          userName={user?.name || 'Collaborateur'}
          userPoste={personnel?.poste}
          personnelId={personnel?.id ?? null}
          memberProjects={projets}
          allTasks={allTasks}
          statsByProject={statsByProject}
          functionNames={functionNames}
          unreadNotifs={unreadNotifs}
          onRefreshData={loadDashboardData}
          onNavigate={onNavigate}
        />
      </>
    );
  }

  const today = getLocalDateString();
  const ongoingTasks = allTasks
    .filter((task) => task.statut === 'en_cours')
    .sort((a, b) => a.date_echeance.localeCompare(b.date_echeance));
  const overdueTasks = allTasks.filter(
    (task) => tacheEnRetard(task, today)
  );
  const activeProjectsCount = projets.filter((project) => project.statut === 'en_cours').length;
  const completedProjectsCount = projets.filter((project) => project.statut === 'termine').length;

  return (
    <div className="space-y-6">
      {avertissementTronque}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Tableau de bord</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bienvenue, <span className="font-semibold text-slate-700">{user?.name}</span>. Supervision globale des projets, des équipes et de l&apos;avancement.
          </p>
        </div>

      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('projets')}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Projets actifs</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">{activeProjectsCount}</p>
          <span className="text-[11px] text-slate-400 mt-1">Sur {projets.length} projets au total</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('mes-taches', { filter: 'en_cours' })}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tâches globales en cours</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">{ongoingTasks.length}</p>
          <span className="text-[11px] text-slate-400 mt-1">Sur {allTasks.length} tâches au total</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('mes-taches', { filter: 'overdue' })}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tâches en retard</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-rose-600 mt-2">{overdueTasks.length}</p>
          <span className="text-[11px] text-rose-500 mt-1">Échéance dépassée</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('projets')}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Projets terminés</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-2">{completedProjectsCount}</p>
          <span className="text-[11px] text-slate-400 mt-1">Sur {projets.length} projets au total</span>
        </button>
      </div>

      <DashboardProgressCharts
        projets={projets}
        allTasks={allTasks}
        statsByProject={statsByProject}
        personnelId={personnel?.id}
        onNavigate={onNavigate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Échéances globales prioritaires</h2>
              <p className="text-xs text-slate-500 mt-0.5">Tâches en cours tous projets confondus, triées par date d&apos;échéance.</p>
            </div>
            <button type="button" onClick={() => onNavigate('projets')} className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
              Voir les projets <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {ongoingTasks.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">Aucune tâche en cours actuellement.</p>
            ) : ongoingTasks.slice(0, 5).map((task) => {
              const isLate = task.date_echeance < today;
              const project = projets.find((item) => item.id === task.projet_id);
              return (
                <button
                  type="button"
                  key={task.id}
                  onClick={() => onNavigate('project-detail', { id: task.projet_id, tab: 'taches' })}
                  className="w-full text-left py-3 px-2 rounded-lg hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <TaskPriorityBadge priority={task.priorite} />
                      <span className="text-xs font-semibold text-slate-900 truncate">{task.titre}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
                      <span className="text-blue-600 font-medium truncate">{project?.titre}</span>
                      {task.responsable && <span>{task.responsable.prenom} {task.responsable.nom}</span>}
                      <span className={isLate ? 'text-rose-600 font-bold' : ''}>
                        <Calendar className="inline w-3 h-3 mr-1" />
                        Échéance : {new Date(`${task.date_echeance}T00:00:00`).toLocaleDateString('fr-FR')}
                      </span>
                    </span>
                  </span>
                  <TaskStatusBadge status={task.statut} isOverdue={isLate} />
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Projets récents</h2>
              <p className="text-xs text-slate-500 mt-0.5">Avancement et membres</p>
            </div>
            <button type="button" onClick={() => onNavigate('projets')} className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
              Tous <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {projets.slice(0, 3).map((project) => {
              const stats = statsByProject[project.id];
              return (
                <button
                  type="button"
                  key={project.id}
                  onClick={() => onNavigate('project-detail', { id: project.id })}
                  className="w-full text-left py-3.5 first:pt-1 hover:bg-slate-50/60 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 line-clamp-1">{project.titre}</span>
                    <ProjectStatusBadge status={project.statut} />
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-1 line-clamp-1">{project.description}</span>
                  {stats && (
                    <>
                      <ProgressBar progress={stats.taux_avancement} size="sm" />
                      <span className="block mt-2 text-right text-[11px] font-mono tabular-nums text-slate-600">
                        {stats.taches_terminees}/{stats.total_taches} tâches terminées
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
