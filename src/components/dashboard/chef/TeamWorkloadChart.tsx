import React, { useMemo, useState } from 'react';
import type { NavigateFn } from '../../../router';
import type { MembreProjet, Projet, Tache } from '../../../types/sgp';
import { Users } from 'lucide-react';
import { calculerChargeEquipe } from './chefCalculs';

interface TeamWorkloadChartProps {
  managedProjects: Projet[];
  selectedManagedId: string;
  onSelectManaged: (id: string) => void;
  allTasks: Tache[];
  membersByProject: Record<number, MembreProjet[]>;
  today: string;
  onNavigate: NavigateFn;
}

/** Suivi de charge de l'équipe : part de chaque collaborateur sur les projets pilotés. */
export const TeamWorkloadChart: React.FC<TeamWorkloadChartProps> = ({
  managedProjects,
  selectedManagedId,
  onSelectManaged,
  allTasks,
  membersByProject,
  today,
  onNavigate,
}) => {
  const [hoveredMemberId, setHoveredMemberId] = useState<number | null>(null);

  const teamWorkload = useMemo(
    () => calculerChargeEquipe({ managedProjects, selectedManagedId, allTasks, membersByProject, today }),
    [managedProjects, selectedManagedId, allTasks, membersByProject, today]
  );

  const hoveredMember = useMemo(
    () =>
      hoveredMemberId !== null
        ? teamWorkload.find((m) => m.personnelId === hoveredMemberId) || null
        : null,
    [teamWorkload, hoveredMemberId]
  );

  const workloadXTicks = [0, 25, 50, 75, 100];

  return (
    <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Suivi de charge de l&apos;équipe</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Répartition en part (%) des tâches par collaborateur actif.
              </p>
            </div>
          </div>

          {managedProjects.length > 1 && (
            <select
              aria-label="Filtrer la charge d'équipe par projet piloté"
              value={selectedManagedId}
              onChange={(e) => onSelectManaged(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 max-w-190px"
            >
              <option value="all">Tous mes projets</option>
              {managedProjects.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.titre}
                </option>
              ))}
            </select>
          )}
        </div>

        {teamWorkload.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Aucun membre actif sur ce périmètre.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {/* Horizontal Stacked Bar Rows (100% normalized share per collaborator) */}
            {teamWorkload.map((member) => {
              const isHovered = hoveredMemberId === member.personnelId;
              const denom = Math.max(1, member.total);
              const wTermine = (member.terminees / denom) * 100;
              const wEnCours = (member.enCoursOk / denom) * 100;
              const wRetard = (member.enRetard / denom) * 100;
              const wAnnule = (member.annulees / denom) * 100;
              const completionPct =
                member.total > 0 ? Math.round((member.terminees / member.total) * 100) : 0;
              const overduePct =
                member.total > 0 ? Math.round((member.enRetard / member.total) * 100) : 0;

              return (
                <button
                  key={member.personnelId}
                  type="button"
                  onMouseEnter={() => setHoveredMemberId(member.personnelId)}
                  onMouseLeave={() => setHoveredMemberId(null)}
                  onClick={() =>
                    onNavigate('project-detail', {
                      id:
                        selectedManagedId !== 'all'
                          ? Number(selectedManagedId)
                          : member.primaryProjetId,
                      tab: 'taches',
                    })
                  }
                  className={`w-full text-left rounded-lg px-2 py-1.5 -mx-2 transition-colors cursor-pointer ${
                    isHovered ? 'bg-slate-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                    <div className="min-w-0 flex items-baseline gap-1.5">
                      <span className="font-semibold text-slate-900 truncate">
                        {member.fullName}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                        · {Array.from(member.roles).join(' / ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums text-[11px]">
                      <span className="font-semibold text-emerald-700">{completionPct}%</span>
                      {overduePct > 0 && (
                        <span className="text-rose-600 font-bold">
                          ({overduePct}% ret.)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Stacked Track with Vertical Grid Ticks */}
                  <div className="relative h-5 bg-slate-100 rounded-md overflow-hidden flex items-center">
                    {[25, 50, 75].map((tick) => (
                      <div
                        key={tick}
                        style={{ left: `${tick}%` }}
                        className="absolute top-0 bottom-0 border-l border-white/80 pointer-events-none z-10"
                      />
                    ))}

                    {member.total > 0 && (
                      <div className="w-full h-full flex">
                        {wTermine > 0 && (
                          <div
                            style={{ width: `${wTermine}%` }}
                            className="h-full bg-emerald-600 transition-all duration-150"
                            title={`Terminées : ${Math.round(wTermine)}%`}
                          />
                        )}
                        {wEnCours > 0 && (
                          <div
                            style={{ width: `${wEnCours}%` }}
                            className="h-full bg-blue-600 transition-all duration-150"
                            title={`En cours : ${Math.round(wEnCours)}%`}
                          />
                        )}
                        {wRetard > 0 && (
                          <div
                            style={{ width: `${wRetard}%` }}
                            className="h-full bg-rose-600 transition-all duration-150"
                            title={`En retard : ${Math.round(wRetard)}%`}
                          />
                        )}
                        {wAnnule > 0 && (
                          <div
                            style={{ width: `${wAnnule}%` }}
                            className="h-full bg-slate-300 transition-all duration-150"
                            title={`Annulées : ${Math.round(wAnnule)}%`}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            {/* X-Axis Percentage Scale (0% - 100%) */}
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-400">
              {workloadXTicks.map((tick) => (
                <span key={tick}>{tick}%</span>
              ))}
            </div>

            {/* Inline Legend */}
            <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" aria-hidden="true" />
                Terminées
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-600" aria-hidden="true" />
                Dans les délais
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-600" aria-hidden="true" />
                En retard (en cours)
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-300" aria-hidden="true" />
                Annulées
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Member Hover / Legend Footer */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs min-h-28px">
        {hoveredMember ? (
          (() => {
            const d = Math.max(1, hoveredMember.total);
            const pT = hoveredMember.total > 0 ? Math.round((hoveredMember.terminees / d) * 100) : 0;
            const pE =
              hoveredMember.total > 0
                ? Math.round(((hoveredMember.enCoursOk + hoveredMember.enRetard) / d) * 100)
                : 0;
            const pR = hoveredMember.total > 0 ? Math.round((hoveredMember.enRetard / d) * 100) : 0;
            return (
              <>
                <span className="font-semibold text-slate-900">{hoveredMember.fullName}</span>
                <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums text-[11px] text-slate-600">
                  <span className="text-emerald-700 font-semibold">{pT}% term.</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-blue-700 font-semibold">{pE}% en cours</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      pR > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'
                    }
                  >
                    {pR}% ret.
                  </span>
                </div>
              </>
            );
          })()
        ) : (
          <>
            <span className="text-[11px] text-slate-500">
              Survolez un collaborateur pour voir la répartition en % ou cliquez pour ouvrir ses tâches
            </span>
            <span className="text-[11px] font-mono tabular-nums text-slate-700 font-semibold">
              {teamWorkload.length} membre{teamWorkload.length > 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
