import React from 'react';
import type { NavigateFn } from '../../../router';
import type { Projet, StatistiquesProjet } from '../../../types/sgp';
import { ProgressBar } from '../../common/ProgressBar';
import { ProjectStatusBadge } from '../../common/Badge';
import { ArrowRight } from 'lucide-react';

interface OtherParticipationsProps {
  participatingProjects: Projet[];
  statsByProject: Record<number, StatistiquesProjet>;
  functionNames: Record<number, string>;
  onNavigate: NavigateFn;
}

/** Projets où le chef de projet est simple membre. */
export const OtherParticipations: React.FC<OtherParticipationsProps> = ({
  participatingProjects,
  statsByProject,
  functionNames,
  onNavigate,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Participations en tant que membre</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Projets où vous intervenez en appui
          </p>
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
        {participatingProjects.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Vous intervenez uniquement en tant que Chef de projet actuellement.
          </div>
        ) : (
          participatingProjects.map((projet) => {
            const stats = statsByProject[projet.id];
            const chef = projet.chefs_noms?.[0];

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
                <p className="text-[11px] text-slate-500">
                  Votre rôle :{' '}
                  <strong className="text-slate-700">
                    {functionNames[projet.ma_fonction_id ?? -1] || 'Membre'}
                  </strong>
                  {chef && (
                    <>
                      {' '}· Chef : {chef}
                    </>
                  )}
                </p>
                <ProgressBar progress={stats.taux_avancement} size="sm" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
