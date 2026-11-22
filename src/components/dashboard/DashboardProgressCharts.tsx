import React, { useMemo, useState } from 'react';
import type { NavigateFn } from '../../router';
import { Projet, StatistiquesProjet, Tache } from '../../types/sgp';
import { getLocalDateString } from '../../utils/date';
import { MonthlyProgressChart } from './progress/MonthlyProgressChart';
import { ProjectsComparisonChart } from './progress/ProjectsComparisonChart';
import { RepartitionDonut } from './progress/RepartitionDonut';
import { ScopeMode, filtrerTaches } from './progress/progressCalculs';

interface DashboardProgressChartsProps {
  projets: Projet[];
  allTasks: Tache[];
  statsByProject: Record<number, StatistiquesProjet>;
  personnelId?: number | null;
  onNavigate: NavigateFn;
}

export const DashboardProgressCharts: React.FC<DashboardProgressChartsProps> = ({
  projets,
  allTasks,
  statsByProject,
  personnelId,
  onNavigate,
}) => {
  const [scopeMode, setScopeMode] = useState<ScopeMode>('global');
  const [selectedProjetId, setSelectedProjetId] = useState<string>('all');

  const today = useMemo(() => getLocalDateString(), []);
  const scopedTasks = useMemo(
    () => filtrerTaches(allTasks, scopeMode, personnelId, selectedProjetId),
    [allTasks, scopeMode, personnelId, selectedProjetId]
  );

  return (
    <section aria-label="Statistiques graphiques d'avancement" className="space-y-4">
      {/* Section Toolbar & Scope Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Analyse graphique de l&apos;avancement
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Répartition des tâches, progression temporelle et avancement comparé par projet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {personnelId && (
            <div className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg">
              <button
                type="button"
                onClick={() => setScopeMode('global')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  scopeMode === 'global'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tous les projets
              </button>
              <button
                type="button"
                onClick={() => setScopeMode('mine')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  scopeMode === 'mine'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mes tâches
              </button>
            </div>
          )}

          <select
            aria-label="Filtrer les graphiques par projet"
            value={selectedProjetId}
            onChange={(e) => {
              setSelectedProjetId(e.target.value);
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 max-w-230px"
          >
            <option value="all">Périmètre : Tous les projets</option>
            {projets.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.titre}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Ligne du haut : répartition par statut (5 colonnes) + progression mensuelle (7 colonnes) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <RepartitionDonut
          tasks={scopedTasks}
          today={today}
          selectedProjetId={selectedProjetId}
          onResetFilters={() => {
            setScopeMode('global');
            setSelectedProjetId('all');
          }}
          onNavigate={onNavigate}
        />
        <MonthlyProgressChart tasks={scopedTasks} />
      </div>

      <ProjectsComparisonChart
        projets={projets}
        allTasks={allTasks}
        statsByProject={statsByProject}
        scopeMode={scopeMode}
        personnelId={personnelId}
        today={today}
        focusProjetId={selectedProjetId}
        onNavigate={onNavigate}
      />
    </section>
  );
};
