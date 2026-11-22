import React from 'react';
import type { NavigateFn } from '../../../router';
interface ChefBannerProps {
  userName: string;
  onNavigate: NavigateFn;
}

/** En-tête du tableau de bord d'un chef de projet. */
export const ChefBanner: React.FC<ChefBannerProps> = ({ userName }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Tableau de bord
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Bienvenue, <span className="font-semibold text-slate-700">{userName}</span>. Pilotage de vos projets dirigés, charge d&apos;équipe et suivi des échéances.
        </p>
      </div>
    </div>
  );
};
