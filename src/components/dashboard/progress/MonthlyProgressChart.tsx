import React, { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import type { Tache } from '../../../types/sgp';
import { tauxAvancementTaches } from '../../../utils/avancement';
import { calculerSerieMensuelle } from './progressCalculs';

interface MonthlyProgressChartProps {
  tasks: Tache[];
}

/** Échéances mensuelles (planifiées / terminées) et courbe d'avancement cumulé. */
export const MonthlyProgressChart: React.FC<MonthlyProgressChartProps> = ({ tasks }) => {
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);
  const monthlySeries = useMemo(() => calculerSerieMensuelle(tasks), [tasks]);
  const tauxActuel = useMemo(() => tauxAvancementTaches(tasks), [tasks]);

  // SVG Timeline Chart Geometry
  const chartW = 540;
  const chartH = 196;
  const padLeft = 36;
  const padRight = 38;
  const padTop = 18;
  const padBottom = 32;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const maxMonthlyCount = Math.max(
    1,
    ...monthlySeries.map((d) => Math.max(d.plannedDue, d.completedInMonth))
  );

  const linePoints = monthlySeries.map((d, idx) => {
    const stepX = monthlySeries.length > 1 ? plotW / monthlySeries.length : plotW;
    const x =
      monthlySeries.length === 1
        ? padLeft + plotW / 2
        : padLeft + stepX * idx + stepX / 2;
    const y = padTop + plotH - (d.cumulativeRate / 100) * plotH;
    return { x, y, data: d, idx };
  });

  const linePath =
    linePoints.length > 0
      ? linePoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ')
      : '';

  const areaPath =
    linePoints.length > 1
      ? `${linePath} L ${linePoints[linePoints.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${linePoints[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : '';

  return (
    <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900">
            Progression mensuelle &amp; avancement cumulé
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tâches regroupées par échéance · taux calculé hors tâches annulées.
          </p>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-300" aria-hidden="true" />
            Planifiées
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" aria-hidden="true" />
            Terminées
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-3 h-0.5 bg-blue-600" aria-hidden="true" />
            Cumul (%)
          </span>
        </div>
      </div>

      {monthlySeries.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Pas assez de données temporelles pour tracer la progression.
        </div>
      ) : (
        <div className="mt-4 relative flex-1 flex flex-col justify-center">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="w-full h-48 overflow-visible"
            role="img"
            aria-label="Graphique de progression mensuelle et taux d'avancement cumulé"
          >
            <defs>
              <linearGradient id="sgpProgressArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines (0%, 25%, 50%, 75%, 100%) */}
            {[0, 25, 50, 75, 100].map((pctTick) => {
              const yPos = padTop + plotH - (pctTick / 100) * plotH;
              return (
                <g key={pctTick}>
                  <line
                    x1={padLeft}
                    y1={yPos}
                    x2={padLeft + plotW}
                    y2={yPos}
                    stroke="#E2E8F0"
                    strokeDasharray={pctTick === 0 ? undefined : '3 3'}
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 6}
                    y={yPos + 3}
                    textAnchor="end"
                    className="fill-slate-400 text-[9px] font-mono"
                  >
                    {pctTick}%
                  </text>
                </g>
              );
            })}

            {/* Right axis label for bar volume */}
            <text
              x={padLeft + plotW + 6}
              y={padTop + 3}
              textAnchor="start"
              className="fill-slate-400 text-[9px] font-mono"
            >
              {maxMonthlyCount}t
            </text>
            <text
              x={padLeft + plotW + 6}
              y={padTop + plotH + 3}
              textAnchor="start"
              className="fill-slate-400 text-[9px] font-mono"
            >
              0
            </text>

            {/* Monthly Paired Columns (Planifiées vs Terminées) */}
            {monthlySeries.map((bucket, idx) => {
              const stepX = plotW / monthlySeries.length;
              const centerX = padLeft + stepX * idx + stepX / 2;
              const barW = Math.min(14, Math.max(6, stepX * 0.24));
              const plannedH = (bucket.plannedDue / maxMonthlyCount) * plotH;
              const completedH = (bucket.completedInMonth / maxMonthlyCount) * plotH;
              const isHovered = hoveredMonthIdx === idx;

              return (
                <g
                  key={bucket.monthKey}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredMonthIdx(idx)}
                  onMouseLeave={() => setHoveredMonthIdx(null)}
                >
                  {/* Hover highlight band */}
                  <rect
                    x={padLeft + stepX * idx}
                    y={padTop}
                    width={stepX}
                    height={plotH}
                    fill={isHovered ? '#F8FAFC' : 'transparent'}
                    rx="4"
                  />

                  {/* Planned Due bar */}
                  <rect
                    x={centerX - barW - 1.5}
                    y={padTop + plotH - plannedH}
                    width={barW}
                    height={Math.max(plannedH, bucket.plannedDue > 0 ? 3 : 0)}
                    fill="#CBD5E1"
                    rx="2"
                  />

                  {/* Completed bar */}
                  <rect
                    x={centerX + 1.5}
                    y={padTop + plotH - completedH}
                    width={barW}
                    height={Math.max(completedH, bucket.completedInMonth > 0 ? 3 : 0)}
                    fill="#16A34A"
                    rx="2"
                  />

                  {/* X-axis month label */}
                  <text
                    x={centerX}
                    y={chartH - 10}
                    textAnchor="middle"
                    className={`text-[10px] font-mono ${
                      isHovered ? 'fill-slate-900 font-semibold' : 'fill-slate-500'
                    }`}
                  >
                    {bucket.label}
                  </text>
                </g>
              );
            })}

            {/* Cumulative Progress Area + Line */}
            {areaPath && <path d={areaPath} fill="url(#sgpProgressArea)" className="pointer-events-none" />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#2563EB"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none"
              />
            )}

            {/* Data points on cumulative line */}
            {linePoints.map((pt) => {
              const isHovered = hoveredMonthIdx === pt.idx;
              return (
                <circle
                  key={pt.data.monthKey}
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5 : 3.5}
                  fill="#FFFFFF"
                  stroke="#2563EB"
                  strokeWidth={isHovered ? 2.5 : 2}
                  className="transition-all duration-150 pointer-events-none"
                />
              );
            })}
          </svg>

          {/* Interactive Month Detail Footer Bar */}
          <div className="mt-2 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 min-h-28px">
            {hoveredMonthIdx !== null && monthlySeries[hoveredMonthIdx] ? (
              <>
                <span className="font-semibold text-slate-900">
                  {monthlySeries[hoveredMonthIdx].label}
                </span>
                <div className="flex items-center gap-3 font-mono tabular-nums text-[11px]">
                  <span>
                    Planifiées :{' '}
                    <strong className="text-slate-900">
                      {monthlySeries[hoveredMonthIdx].plannedDue}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Terminées :{' '}
                    <strong className="text-emerald-700">
                      {monthlySeries[hoveredMonthIdx].completedInMonth}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Avancement cumulé :{' '}
                    <strong className="text-blue-700">
                      {monthlySeries[hoveredMonthIdx].cumulativeRate}%
                    </strong>
                  </span>
                </div>
              </>
            ) : (
              <>
                <span className="text-[11px] text-slate-500">
                  Survolez un mois pour afficher le détail planifié vs clôturé
                </span>
                <span className="font-mono tabular-nums text-[11px] font-semibold text-slate-800">
                  Cumul actuel : {tauxActuel}%
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
