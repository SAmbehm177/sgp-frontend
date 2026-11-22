import React, { useMemo, useState } from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import type { NavigateFn } from '../../../router';
import type { Tache } from '../../../types/sgp';
import { DonutSegment, calculerRepartition } from './progressCalculs';

interface RepartitionDonutProps {
  tasks: Tache[];
  today: string;
  selectedProjetId: string;
  onResetFilters: () => void;
  onNavigate: NavigateFn;
}

/** Répartition des tâches par statut (terminées, en cours, en retard, annulées) et taux d'avancement. */
export const RepartitionDonut: React.FC<RepartitionDonutProps> = ({
  tasks,
  today,
  selectedProjetId,
  onResetFilters,
  onNavigate,
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<DonutSegment['key'] | null>(null);
  const donutData = useMemo(() => calculerRepartition(tasks, today), [tasks, today]);

  // SVG Donut Geometry
  const radius = 58;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  let runningOffset = 0;

  const activeDonutSegment = hoveredSegment
    ? donutData.segments.find((s) => s.key === hoveredSegment) || null
    : null;

  const openDonutTaskScope = () => {
    if (selectedProjetId === 'all') {
      onNavigate('projets');
      return;
    }
    onNavigate('project-detail', { id: Number(selectedProjetId), tab: 'taches' });
  };

  return (
    <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <PieChartIcon className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900">Répartition par statut</h3>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-500">
          {donutData.total} {donutData.total > 1 ? 'tâches' : 'tâche'}
        </span>
      </div>

      {donutData.total === 0 ? (
        <div className="py-12 text-center space-y-2">
          <p className="text-xs text-slate-500">Aucune tâche sur ce périmètre.</p>
          <button
            type="button"
            onClick={onResetFilters}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-6 flex-1">
          {/* SVG Donut */}
          <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
            <svg
              viewBox="0 0 160 160"
              className="w-40 h-40 -rotate-90"
              role="img"
              aria-label={`Taux d'avancement global : ${donutData.completionRate}%`}
            >
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="#F1F5F9"
                strokeWidth={strokeWidth}
              />
              {donutData.segments.map((seg) => {
                if (seg.count === 0) return null;
                const fraction = seg.count / donutData.total;
                const segLen = fraction * circumference;
                const dashArray = `${Math.max(segLen - 2, 1)} ${circumference}`;
                const dashOffset = -runningOffset;
                runningOffset += segLen;

                const isDimmed = hoveredSegment !== null && hoveredSegment !== seg.key;

                return (
                  <circle
                    key={seg.key}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={hoveredSegment === seg.key ? strokeWidth + 3 : strokeWidth}
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="butt"
                    opacity={isDimmed ? 0.3 : 1}
                    className="transition-all duration-150 cursor-pointer"
                    onMouseEnter={() => setHoveredSegment(seg.key)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    onClick={openDonutTaskScope}
                  />
                );
              })}
            </svg>

            {/* Center Metric */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 leading-none">
                {activeDonutSegment ? `${activeDonutSegment.percent}%` : `${donutData.completionRate}%`}
              </span>
              <span className="text-[11px] font-medium text-slate-500 mt-1 leading-tight">
                {activeDonutSegment ? activeDonutSegment.label : 'Avancement'}
              </span>
            </div>
          </div>

          {/* Interactive Legend */}
          <div className="flex-1 w-full space-y-2">
            {donutData.segments.map((seg) => (
              <button
                key={seg.key}
                type="button"
                onMouseEnter={() => setHoveredSegment(seg.key)}
                onMouseLeave={() => setHoveredSegment(null)}
                onClick={openDonutTaskScope}
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
  );
};
