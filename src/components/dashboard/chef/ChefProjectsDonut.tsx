import React, { useMemo, useState } from 'react';
import type { NavigateFn } from '../../../router';
import type { Projet, Tache } from '../../../types/sgp';
import { ArrowUpRight, PieChart } from 'lucide-react';
import { calculerRepartition, DonutSegment } from '../progress/progressCalculs';

interface ChefProjectsDonutProps {
  managedProjects: Projet[];
  teamTasks: Tache[];
  today: string;
  onNavigate: NavigateFn;
}

/** Pilotage des projets dirigés : répartition des tâches d'équipe par statut (diagramme circulaire). */
export const ChefProjectsDonut: React.FC<ChefProjectsDonutProps> = ({
  managedProjects,
  teamTasks,
  today,
  onNavigate,
}) => {
  const [selectedDonutProjetId, setSelectedDonutProjetId] = useState<string>('all');
  const [hoveredSegment, setHoveredSegment] = useState<DonutSegment['key'] | null>(null);

  const activeDonutProjet = useMemo(() => {
    if (managedProjects.length === 1) return managedProjects[0];
    if (selectedDonutProjetId !== 'all') {
      return managedProjects.find((p) => String(p.id) === selectedDonutProjetId) || null;
    }
    return null;
  }, [managedProjects, selectedDonutProjetId]);

  const projectDonutData = useMemo(
    () =>
      calculerRepartition(
        activeDonutProjet ? teamTasks.filter((t) => t.projet_id === activeDonutProjet.id) : teamTasks,
        today
      ),
    [activeDonutProjet, teamTasks, today]
  );

  // SVG Donut Geometry
  const donutRadius = 56;
  const donutStroke = 16;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let runningOffset = 0;

  const activeDonutSegment = hoveredSegment
    ? projectDonutData.segments.find((s) => s.key === hoveredSegment) || null
    : null;

  const footerProjet = activeDonutProjet ?? managedProjects[0] ?? null;

  const navigateDonutScope = (tab: 'vue-ensemble' | 'taches' | 'membres' | 'statistiques') => {
    if (!activeDonutProjet) {
      onNavigate('projets');
      return;
    }
    onNavigate('project-detail', { id: activeDonutProjet.id, tab });
  };

  return (
    <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-slate-500" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pilotage de vos projets</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Répartition circulaire de l&apos;avancement des tâches.
              </p>
            </div>
          </div>

          {managedProjects.length > 1 ? (
            <select
              aria-label="Sélectionner un projet piloté pour le diagramme circulaire"
              value={selectedDonutProjetId}
              onChange={(e) => setSelectedDonutProjetId(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 max-w-200px"
            >
              <option value="all">Tous mes projets ({managedProjects.length})</option>
              {managedProjects.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.titre}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {projectDonutData.total} tâche{projectDonutData.total > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {projectDonutData.total === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Aucune tâche enregistrée sur ce périmètre.
          </div>
        ) : (
          <div className="mt-5 flex flex-col sm:flex-row items-center gap-6">
            {/* Circular Donut SVG */}
            <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
              <svg
                viewBox="0 0 160 160"
                className="w-40 h-40 -rotate-90"
                role="img"
                aria-label={`Diagramme circulaire d'avancement : ${projectDonutData.completionRate}%`}
              >
                <circle
                  cx="80"
                  cy="80"
                  r={donutRadius}
                  fill="none"
                  stroke="#F1F5F9"
                  strokeWidth={donutStroke}
                />
                {projectDonutData.segments.map((seg) => {
                  if (seg.count === 0) return null;
                  const fraction = seg.count / projectDonutData.total;
                  const segLen = fraction * donutCircumference;
                  const dashArray = `${Math.max(segLen - 2, 1)} ${donutCircumference}`;
                  const dashOffset = -runningOffset;
                  runningOffset += segLen;

                  const isDimmed = hoveredSegment !== null && hoveredSegment !== seg.key;

                  return (
                    <circle
                      key={seg.key}
                      cx="80"
                      cy="80"
                      r={donutRadius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={hoveredSegment === seg.key ? donutStroke + 3 : donutStroke}
                      strokeDasharray={dashArray}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="butt"
                      opacity={isDimmed ? 0.3 : 1}
                      className="transition-all duration-150 cursor-pointer"
                      onMouseEnter={() => setHoveredSegment(seg.key)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() => navigateDonutScope('taches')}
                    />
                  );
                })}
              </svg>

              {/* Center KPI Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 leading-none">
                  {activeDonutSegment
                    ? `${activeDonutSegment.percent}%`
                    : `${projectDonutData.completionRate}%`}
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-1 leading-tight">
                  {activeDonutSegment ? activeDonutSegment.label : 'Avancement'}
                </span>
              </div>
            </div>

            {/* Interactive Legend */}
            <div className="flex-1 w-full space-y-2">
              {projectDonutData.segments.map((seg) => (
                <button
                  key={seg.key}
                  type="button"
                  onMouseEnter={() => setHoveredSegment(seg.key)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  onClick={() => navigateDonutScope('taches')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                    hoveredSegment === seg.key ? 'bg-slate-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: seg.color }}
                      aria-hidden="true"
                    />
                    <span className="text-slate-700 font-medium truncate">{seg.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                    <span className="font-semibold text-slate-900">{seg.count}</span>
                    <span className="text-[11px] text-slate-400 w-9 text-right">
                      {seg.percent}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected / Active Project Quick Actions Footer */}
      {footerProjet && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="min-w-0 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigateDonutScope('vue-ensemble')}
              className="font-semibold text-slate-900 hover:text-blue-600 truncate max-w-230px text-left"
            >
              {activeDonutProjet
                ? activeDonutProjet.titre
                : `${managedProjects.length} projets pilotés`}
            </button>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="font-mono tabular-nums text-[11px] text-slate-500">
              {projectDonutData.total} tâche{projectDonutData.total > 1 ? 's' : ''}
            </span>
          </div>

          {activeDonutProjet && (
            <div className="flex items-center gap-3 text-[11px] font-medium text-blue-600 shrink-0">
              <button
                type="button"
                onClick={() => navigateDonutScope('taches')}
                className="hover:text-blue-700 whitespace-nowrap"
              >
                Tâches
              </button>
              <button
                type="button"
                onClick={() => navigateDonutScope('membres')}
                className="hover:text-blue-700 whitespace-nowrap"
              >
                Équipe
              </button>
              <button
                type="button"
                onClick={() => navigateDonutScope('statistiques')}
                className="hover:text-blue-700 inline-flex items-center gap-0.5 whitespace-nowrap"
              >
                Stats
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
