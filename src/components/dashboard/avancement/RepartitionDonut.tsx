import React, { useMemo, useState } from 'react';
import { PieChart } from 'lucide-react';
import { CleStatut, Repartition, STATUTS, pourcentage } from '../../../utils/avancement';

interface RepartitionDonutProps {
  repartition: Repartition;
}

const RAYON = 58;
const EPAISSEUR = 16;
const CIRCONFERENCE = 2 * Math.PI * RAYON;

// Les tâches annulées ne comptent pas dans l'avancement : elles sont signalées à part
const SEGMENTS: CleStatut[] = ['termine', 'enCours', 'enRetard'];

export const RepartitionDonut: React.FC<RepartitionDonutProps> = ({ repartition }) => {
  const [survol, setSurvol] = useState<CleStatut | null>(null);
  const { actives, annule, taux } = repartition;

  // Position de chaque arc : longueur + décalage cumulé (calculés hors du rendu des cercles)
  const arcs = useMemo(() => {
    let decalage = 0;
    return SEGMENTS.filter((cle) => repartition[cle] > 0).map((cle) => {
      const longueur = (repartition[cle] / actives) * CIRCONFERENCE;
      const arc = { cle, longueur, decalage };
      decalage += longueur;
      return arc;
    });
  }, [repartition, actives]);

  const trou = arcs.length > 1 ? 2 : 0; // petit espace entre deux arcs
  const actif = survol ? STATUTS[survol] : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <h3 className="text-sm font-bold text-slate-900">Répartition par statut</h3>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-500">
          {actives} tâche{actives > 1 ? 's' : ''}
        </span>
      </div>

      {actives === 0 ? (
        <p className="py-12 text-center text-xs text-slate-500">Aucune tâche active sur ce périmètre.</p>
      ) : (
        <div className="mt-4 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-6 flex-1">
          <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
            <svg
              viewBox="0 0 160 160"
              className="w-40 h-40 -rotate-90"
              role="img"
              aria-label={`Taux d'avancement : ${taux} %`}
            >
              <circle cx="80" cy="80" r={RAYON} fill="none" className="stroke-slate-100" strokeWidth={EPAISSEUR} />
              {arcs.map(({ cle, longueur, decalage }) => (
                <circle
                  key={cle}
                  cx="80"
                  cy="80"
                  r={RAYON}
                  fill="none"
                  className={`${STATUTS[cle].trait} transition-all duration-150`}
                  strokeWidth={survol === cle ? EPAISSEUR + 3 : EPAISSEUR}
                  strokeDasharray={`${Math.max(longueur - trou, 1)} ${CIRCONFERENCE}`}
                  strokeDashoffset={-decalage}
                  opacity={survol && survol !== cle ? 0.3 : 1}
                  onMouseEnter={() => setSurvol(cle)}
                  onMouseLeave={() => setSurvol(null)}
                />
              ))}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 leading-none">
                {survol ? pourcentage(repartition[survol], actives) : taux}%
              </span>
              <span className="text-[11px] font-medium text-slate-500 mt-1 leading-tight">
                {actif ? actif.label : 'Avancement'}
              </span>
            </div>
          </div>

          <ul className="flex-1 w-full space-y-1">
            {SEGMENTS.map((cle) => (
              <li
                key={cle}
                onMouseEnter={() => setSurvol(cle)}
                onMouseLeave={() => setSurvol(null)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  survol === cle ? 'bg-slate-50' : ''
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-xs shrink-0 ${STATUTS[cle].fond}`} aria-hidden="true" />
                  <span className="text-slate-700 font-medium truncate">
                    {cle === 'enCours' ? 'En cours (dans les délais)' : STATUTS[cle].label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                  <span className="font-semibold text-slate-900">{repartition[cle]}</span>
                  <span className="text-[11px] text-slate-400 w-9 text-right">
                    {pourcentage(repartition[cle], actives)}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {annule > 0 && (
        <p className="mt-4 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
          {annule} tâche{annule > 1 ? 's' : ''} annulée{annule > 1 ? 's' : ''}, non comptée{annule > 1 ? 's' : ''} dans
          l'avancement.
        </p>
      )}
    </div>
  );
};
