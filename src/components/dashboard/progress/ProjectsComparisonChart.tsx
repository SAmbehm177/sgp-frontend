import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BarChart3 } from 'lucide-react';
import type { NavigateFn } from '../../../router';
import type { Projet, StatistiquesProjet, Tache } from '../../../types/sgp';
import {
  ProjectBarMode,
  ProjectStatusFilter,
  ScopeMode,
  construireLignesProjets,
  getResponsablesSummary,
} from './progressCalculs';

interface ProjectsComparisonChartProps {
  projets: Projet[];
  allTasks: Tache[];
  statsByProject: Record<number, StatistiquesProjet>;
  scopeMode: ScopeMode;
  personnelId?: number | null;
  today: string;
  /** Projet choisi dans le filtre global du tableau de bord ('all' : aucun) */
  focusProjetId: string;
  onNavigate: NavigateFn;
}

/** Avancement comparé projet par projet (taux ou répartition par statut) ou détail d'un seul projet. */
export const ProjectsComparisonChart: React.FC<ProjectsComparisonChartProps> = ({
  projets,
  allTasks,
  statsByProject,
  scopeMode,
  personnelId,
  today,
  focusProjetId,
  onNavigate,
}) => {
  const [projectStatusFilter, setProjectStatusFilter] = useState<ProjectStatusFilter>('all');
  const [projectBarMode, setProjectBarMode] = useState<ProjectBarMode>('rate');
  const [chart3ProjetId, setChart3ProjetId] = useState<string>('all');
  const [hoveredProjectId, setHoveredProjectId] = useState<number | null>(null);
  const [hoveredSingleBarKey, setHoveredSingleBarKey] = useState<string | null>(null);

  const projectRows = useMemo(
    () =>
      construireLignesProjets({
        projets,
        allTasks,
        statsByProject,
        projectStatusFilter,
        scopeMode,
        personnelId,
        today,
      }),
    [projets, allTasks, statsByProject, projectStatusFilter, scopeMode, personnelId, today]
  );

  // Choisir un projet dans le filtre global l'affiche aussi dans ce graphique
  useEffect(() => {
    if (focusProjetId !== 'all') setChart3ProjetId(focusProjetId);
  }, [focusProjetId]);

  useEffect(() => {
    if (projectRows.length === 0) return;
    if (
      !chart3ProjetId ||
      (chart3ProjetId !== 'all' &&
        !projectRows.some((r) => String(r.projet.id) === chart3ProjetId))
    ) {
      setChart3ProjetId(String(projectRows[0].projet.id));
    }
  }, [projectRows, chart3ProjetId]);

  const displayedProjectRows = useMemo(() => {
    if (!chart3ProjetId || chart3ProjetId === 'all') return projectRows;
    return projectRows.filter((r) => String(r.projet.id) === chart3ProjetId);
  }, [projectRows, chart3ProjetId]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-500" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Avancement comparé par projet
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Affichage en diagramme en barres projet par projet ou en comparaison globale.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-2 self-start lg:self-auto">
          {/* Project Selector placed above the 2 segmented filters */}
          <select
            aria-label="Sélectionner un projet à afficher dans le diagramme"
            value={chart3ProjetId || 'all'}
            onChange={(e) => setChart3ProjetId(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 w-full sm:w-auto max-w-260px"
          >
            {projectRows.map((row) => (
              <option key={row.projet.id} value={String(row.projet.id)}>
                Projet : {row.projet.titre}
              </option>
            ))}
            <option value="all">Tous les projets ({projectRows.length})</option>
          </select>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switch: Taux (%) vs Par statut */}
            <div className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg">
              <button
                type="button"
                onClick={() => setProjectBarMode('rate')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  projectBarMode === 'rate'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Taux (%)
              </button>
              <button
                type="button"
                onClick={() => setProjectBarMode('status')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  projectBarMode === 'status'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Par statut
              </button>
            </div>

            {/* Project Status Filter */}
            <div className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg">
              {(
                [
                  { id: 'all', label: 'Tous' },
                  { id: 'en_cours', label: 'En cours' },
                  { id: 'termine', label: 'Terminés' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProjectStatusFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    projectStatusFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Single-Project Mode vs All-Projects Comparison Mode */}
      {displayedProjectRows.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Aucun projet ne correspond à ce filtre.
        </div>
      ) : chart3ProjetId !== 'all' && displayedProjectRows.length === 1 ? (
        (() => {
          const row = displayedProjectRows[0];
          const {
            projet,
            total,
            terminees,
            enCours,
            enCoursOk,
            enRetard,
            annulees,
            termineTasks,
            enCoursTasks,
            enRetardTasks,
            annuleTasks,
            responsablesSummary,
            rate,
          } = row;
          const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

          const singleBars = [
            {
              key: 'termine',
              label: 'Terminées',
              count: terminees,
              percent: pct(terminees),
              responsables: getResponsablesSummary(termineTasks),
              color: 'bg-emerald-600',
              textClass: 'text-emerald-700',
            },
            {
              key: 'en_cours',
              label: 'Dans les délais',
              count: enCoursOk,
              percent: pct(enCoursOk),
              responsables: getResponsablesSummary(enCoursTasks),
              color: 'bg-blue-600',
              textClass: 'text-blue-700',
            },
            {
              key: 'en_retard',
              label: 'En retard (en cours)',
              count: enRetard,
              percent: pct(enRetard),
              responsables: getResponsablesSummary(enRetardTasks),
              color: 'bg-rose-600',
              textClass: 'text-rose-700',
            },
            {
              key: 'annule',
              label: 'Annulées',
              count: annulees,
              percent: pct(annulees),
              responsables: getResponsablesSummary(annuleTasks),
              color: 'bg-slate-300',
              textClass: 'text-slate-600',
            },
          ];

          const rawMax = Math.max(1, ...singleBars.map((b) => b.count));
          const countAxisMax = Math.max(4, Math.ceil(rawMax / 4) * 4);
          const yTicks =
            projectBarMode === 'rate'
              ? [100, 75, 50, 25, 0]
              : [
                  countAxisMax,
                  Math.round(countAxisMax * 0.75),
                  Math.round(countAxisMax * 0.5),
                  Math.round(countAxisMax * 0.25),
                  0,
                ];

          const activeBar =
            hoveredSingleBarKey !== null
              ? singleBars.find((b) => b.key === hoveredSingleBarKey) || null
              : null;

          return (
            <div>
              {/* Selected Project Summary Header */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2 text-slate-600">
                  <span className="font-semibold text-slate-900">{projet.titre}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {projet.statut === 'en_cours'
                      ? 'En cours'
                      : projet.statut === 'termine'
                      ? 'Terminé'
                      : 'Suspendu'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    Échéance {new Date(projet.date_fin_prevue).toLocaleDateString('fr-FR')}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    Avancement : {rate}%
                  </span>
                  <span className="font-mono tabular-nums">
                    En cours : <strong className="text-slate-800">{enCours}</strong>
                    {' · '}dont en retard : <strong className="text-rose-700">{enRetard}</strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span title={responsablesSummary.full}>
                    Responsables : <strong className="text-slate-800">{responsablesSummary.display}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onNavigate('project-detail', { id: projet.id, tab: 'statistiques' })
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap shrink-0"
                >
                  Statistiques détaillées
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Vertical Bar Chart for the Selected Project */}
              <div className="mt-4">
                <div className="flex items-stretch gap-3">
                  {/* Y-Axis Labels */}
                  <div className="w-10 shrink-0 pt-6">
                    <div className="h-56 flex flex-col justify-between items-end pr-1 text-[10px] font-mono tabular-nums text-slate-400 select-none">
                      {yTicks.map((tick) => (
                        <span key={tick} className="leading-none -translate-y-1">
                          {projectBarMode === 'rate' ? `${tick}%` : tick}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Plot Area + Horizontal Scroll Wrapper */}
                  <div className="flex-1 overflow-x-auto">
                    <div className="min-w-[320px] pt-6">
                      <div className="relative h-56 border-b border-slate-200">
                        {[25, 50, 75, 100].map((pctLine) => (
                          <div
                            key={pctLine}
                            style={{ bottom: `${pctLine}%` }}
                            className="absolute left-0 right-0 border-t border-dashed border-slate-200/90 pointer-events-none"
                          />
                        ))}

                        <div className="relative z-10 h-full flex items-end justify-around gap-4 px-4">
                          {singleBars.map((bar) => {
                            const heightPct =
                              projectBarMode === 'rate'
                                ? bar.percent
                                : (bar.count / countAxisMax) * 100;
                            const isHovered = hoveredSingleBarKey === bar.key;
                            const valueLabel =
                              projectBarMode === 'rate' ? `${bar.percent}%` : `${bar.count}`;

                            return (
                              <button
                                key={bar.key}
                                type="button"
                                onMouseEnter={() => setHoveredSingleBarKey(bar.key)}
                                onMouseLeave={() => setHoveredSingleBarKey(null)}
                                onClick={() =>
                                  onNavigate('project-detail', {
                                    id: projet.id,
                                    tab: 'taches',
                                  })
                                }
                                aria-label={`${projet.titre} — ${bar.label} : ${bar.responsables.full} (${bar.percent}%)`}
                                className={`flex-1 max-w-140px h-full flex items-end justify-center group cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-900 rounded-t-lg px-2 transition-colors ${
                                  isHovered ? 'bg-slate-50/80' : ''
                                }`}
                              >
                                <div className="w-12 sm:w-16 h-full flex items-end justify-center relative">
                                  <span
                                    style={{ bottom: `calc(${heightPct}% + 6px)` }}
                                    className="absolute left-1/2 -translate-x-1/2 text-xs font-bold font-mono tabular-nums text-slate-900 leading-none pointer-events-none whitespace-nowrap"
                                  >
                                    {valueLabel}
                                  </span>
                                  <div
                                    style={{
                                      height: `${heightPct}%`,
                                      minHeight: bar.count > 0 ? '4px' : '2px',
                                    }}
                                    className={`w-full rounded-t-md transition-all duration-200 ${
                                      bar.count === 0 ? 'bg-slate-200' : bar.color
                                    } ${isHovered ? 'brightness-110' : ''}`}
                                  />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* X-Axis Status Labels & Task Responsables */}
                      <div className="flex items-start justify-around gap-4 px-4 pt-2.5">
                        {singleBars.map((bar) => {
                          const isHovered = hoveredSingleBarKey === bar.key;
                          return (
                            <button
                              key={bar.key}
                              type="button"
                              onMouseEnter={() => setHoveredSingleBarKey(bar.key)}
                              onMouseLeave={() => setHoveredSingleBarKey(null)}
                              onClick={() =>
                                onNavigate('project-detail', {
                                  id: projet.id,
                                  tab: 'taches',
                                })
                              }
                              title={bar.responsables.full}
                              className="flex-1 max-w-160px text-center cursor-pointer group"
                            >
                              <span
                                className={`text-xs font-semibold block transition-colors ${
                                  isHovered ? 'text-blue-700' : 'text-slate-800'
                                }`}
                              >
                                {bar.label}
                              </span>
                              <span className="text-[11px] text-slate-600 mt-0.5 block leading-snug line-clamp-2">
                                {bar.responsables.display}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Footer Detail Strip */}
                <div className="mt-4 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 min-h-28px">
                  {activeBar ? (
                    <>
                      <span className="font-semibold text-slate-900">
                        {projet.titre} — {activeBar.label}
                      </span>
                      <span className="text-[11px]">
                        Responsable(s) :{' '}
                        <strong className={activeBar.textClass}>{activeBar.responsables.full}</strong>{' '}
                        <span className="font-mono tabular-nums text-slate-500">
                          · {activeBar.count}/{total} ({activeBar.percent}%)
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] text-slate-500">
                        Survolez une barre pour afficher tous les responsables concernés
                      </span>
                      <span className="font-mono tabular-nums text-[11px] font-semibold text-slate-800">
                        Avancement global du projet : {rate}%
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()
      ) : (() => {
        const rawMaxStatusCount = Math.max(
          1,
          ...displayedProjectRows.map((r) =>
            Math.max(r.terminees, r.enCoursOk, r.enRetard, r.annulees)
          )
        );
        const statusAxisMax = Math.max(4, Math.ceil(rawMaxStatusCount / 4) * 4);
        const yTicks =
          projectBarMode === 'rate'
            ? [100, 75, 50, 25, 0]
            : [
                statusAxisMax,
                Math.round(statusAxisMax * 0.75),
                Math.round(statusAxisMax * 0.5),
                Math.round(statusAxisMax * 0.25),
                0,
              ];

        const hoveredProjectRow =
          hoveredProjectId !== null
            ? displayedProjectRows.find((r) => r.projet.id === hoveredProjectId) || null
            : null;

        return (
          <div className="mt-3">
            {/* Legend Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              {projectBarMode === 'rate' ? (
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-blue-600" aria-hidden="true" />
                    Projet en progression
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" aria-hidden="true" />
                    Objectif atteint (100%)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-rose-600" aria-hidden="true" />
                    Contient des tâches en retard
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" aria-hidden="true" />
                    Terminées
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-blue-600" aria-hidden="true" />
                    Dans les délais
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-rose-600" aria-hidden="true" />
                    En retard (en cours)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-slate-300" aria-hidden="true" />
                    Annulées
                  </span>
                </div>
              )}
              <span className="text-[11px] text-slate-400">
                Cliquez sur une barre pour ouvrir les statistiques du projet
              </span>
            </div>

            <div className="mt-4 flex items-stretch gap-3">
              {/* Y-Axis Labels */}
              <div className="w-10 shrink-0 pt-6">
                <div className="h-56 flex flex-col justify-between items-end pr-1 text-[10px] font-mono tabular-nums text-slate-400 select-none">
                  {yTicks.map((tick) => (
                    <span key={tick} className="leading-none -translate-y-1">
                      {projectBarMode === 'rate' ? `${tick}%` : tick}
                    </span>
                  ))}
                </div>
              </div>

              {/* Plot Area + Horizontal Scroll Wrapper */}
              <div className="flex-1 overflow-x-auto">
                <div className="min-w-360px pt-6">
                  {/* Chart Bars Plot Box */}
                  <div className="relative h-56 border-b border-slate-200">
                    {/* Horizontal Gridlines */}
                    {[25, 50, 75, 100].map((pctLine) => (
                      <div
                        key={pctLine}
                        style={{ bottom: `${pctLine}%` }}
                        className="absolute left-0 right-0 border-t border-dashed border-slate-200/90 pointer-events-none"
                      />
                    ))}

                    {/* Project Columns */}
                    <div className="relative z-10 h-full flex items-end justify-around gap-4 px-2">
                      {displayedProjectRows.map((row) => {
                        const {
                          projet,
                          total,
                          terminees,
                          enCoursOk,
                          enRetard,
                          annulees,
                          rate,
                        } = row;
                        const isHovered = hoveredProjectId === projet.id;

                        const rateBarColor =
                          rate >= 100
                            ? 'bg-emerald-600'
                            : enRetard > 0
                            ? 'bg-rose-600'
                            : 'bg-blue-600';

                        const statusSeries = [
                          { key: 'done', value: terminees, color: 'bg-emerald-600', label: 'Terminées' },
                          { key: 'active', value: enCoursOk, color: 'bg-blue-600', label: 'Dans les délais' },
                          { key: 'late', value: enRetard, color: 'bg-rose-600', label: 'En retard (en cours)' },
                          { key: 'cancel', value: annulees, color: 'bg-slate-300', label: 'Annulées' },
                        ];

                        return (
                          <button
                            key={projet.id}
                            type="button"
                            onMouseEnter={() => setHoveredProjectId(projet.id)}
                            onMouseLeave={() => setHoveredProjectId(null)}
                            onClick={() =>
                              onNavigate('project-detail', {
                                id: projet.id,
                                tab: 'statistiques',
                              })
                            }
                            aria-label={`${projet.titre} : ${rate}% d'avancement (${terminees} sur ${total - annulees} tâches actives terminées)`}
                            className={`flex-1 min-w-96px max-w-200px h-full flex flex-col justify-end items-center group cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-900 rounded-t-lg px-2 transition-colors ${
                              isHovered ? 'bg-slate-50/80' : ''
                            }`}
                          >
                            {projectBarMode === 'rate' ? (
                              <div className="w-12 sm:w-14 h-full flex items-end justify-center relative">
                                <span
                                  style={{ bottom: `calc(${rate}% + 6px)` }}
                                  className="absolute left-1/2 -translate-x-1/2 text-xs font-bold font-mono tabular-nums text-slate-900 leading-none pointer-events-none whitespace-nowrap"
                                >
                                  {rate}%
                                </span>
                                <div
                                  style={{
                                    height: `${rate}%`,
                                    minHeight: rate > 0 ? '4px' : '2px',
                                  }}
                                  className={`w-full rounded-t-md transition-all duration-200 ${
                                    rate === 0 ? 'bg-slate-200' : rateBarColor
                                  } ${isHovered ? 'brightness-110' : ''}`}
                                />
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-end justify-center gap-1.5 px-1">
                                {statusSeries.map((s) => {
                                  const barPct = (s.value / statusAxisMax) * 100;
                                  return (
                                    <div
                                      key={s.key}
                                      className="flex-1 max-w-22px h-full flex items-end justify-center relative"
                                      title={`${s.label} : ${s.value}`}
                                    >
                                      {s.value > 0 && (
                                        <span
                                          style={{ bottom: `calc(${barPct}% + 4px)` }}
                                          className="absolute left-1/2 -translate-x-1/2 text-[10px] font-mono tabular-nums font-semibold text-slate-700 leading-none pointer-events-none"
                                        >
                                          {s.value}
                                        </span>
                                      )}
                                      <div
                                        style={{
                                          height: `${barPct}%`,
                                          minHeight: s.value > 0 ? '4px' : '0px',
                                        }}
                                        className={`w-full rounded-t-sm transition-all duration-200 ${s.color}`}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* X-Axis Project Titles & Responsables */}
                  <div className="flex items-start justify-around gap-4 px-2 pt-2.5">
                    {displayedProjectRows.map((row) => {
                      const { projet, responsablesSummary, rate } = row;
                      const isHovered = hoveredProjectId === projet.id;

                      return (
                        <button
                          key={projet.id}
                          type="button"
                          onMouseEnter={() => setHoveredProjectId(projet.id)}
                          onMouseLeave={() => setHoveredProjectId(null)}
                          onClick={() =>
                            onNavigate('project-detail', {
                              id: projet.id,
                              tab: 'statistiques',
                            })
                          }
                          title={responsablesSummary.full}
                          className="flex-1 min-w-96px max-w-200px text-center group cursor-pointer"
                        >
                          <span
                            className={`text-xs font-semibold leading-snug line-clamp-2 block transition-colors ${
                              isHovered
                                ? 'text-blue-700'
                                : 'text-slate-800 group-hover:text-blue-700'
                            }`}
                          >
                            {projet.titre}
                          </span>
                          <span className="text-[11px] text-slate-500 mt-0.5 block leading-snug line-clamp-2">
                            {responsablesSummary.display}{' '}
                            <span className="font-mono tabular-nums">· {rate}%</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Footer Detail Strip */}
            <div className="mt-4 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 min-h-28px">
              {hoveredProjectRow ? (
                <>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-slate-900 truncate max-w-240px">
                      {hoveredProjectRow.projet.titre}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-[11px] text-slate-500 truncate max-w-220px">
                      · {hoveredProjectRow.responsablesSummary.full}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-[11px]">
                    <span>
                      Terminées :{' '}
                      <strong className="text-emerald-700">
                        {hoveredProjectRow.terminees}
                      </strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      En cours :{' '}
                      <strong className="text-blue-700">{hoveredProjectRow.enCours}</strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      En retard :{' '}
                      <strong
                        className={
                          hoveredProjectRow.enRetard > 0 ? 'text-rose-700' : 'text-slate-700'
                        }
                      >
                        {hoveredProjectRow.enRetard}
                      </strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Annulées :{' '}
                      <strong className="text-slate-700">{hoveredProjectRow.annulees}</strong>
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-[11px] text-slate-500">
                    Survolez une barre pour voir la répartition complète du projet
                  </span>
                  <span className="font-mono tabular-nums text-[11px] font-semibold text-slate-800">
                    {displayedProjectRows.length}{' '}
                    {displayedProjectRows.length > 1 ? 'projets affichés' : 'projet affiché'}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
