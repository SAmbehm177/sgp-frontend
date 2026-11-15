import React, { useId, useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useTachesProjets } from '../../../hooks/useTachesProjets';
import { serieMensuelle } from '../../../utils/avancement';
import { Projet } from '../../../types/sgp';

interface ProgressionMensuelleProps {
  projets: Projet[]; // projets du périmètre choisi
}

// Géométrie du graphique (unités du viewBox)
const L = 540;
const H = 196;
const MARGE = { gauche: 36, droite: 38, haut: 18, bas: 32 };
const LARGEUR_TRACE = L - MARGE.gauche - MARGE.droite;
const HAUTEUR_TRACE = H - MARGE.haut - MARGE.bas;
const GRADUATIONS = [0, 25, 50, 75, 100];

const yPourcentage = (pct: number) => MARGE.haut + HAUTEUR_TRACE - (pct / 100) * HAUTEUR_TRACE;

export const ProgressionMensuelle: React.FC<ProgressionMensuelleProps> = ({ projets }) => {
  const { taches, isLoading, error, retry } = useTachesProjets(projets);
  const [survol, setSurvol] = useState<number | null>(null);
  const idDegrade = `progression-${useId().replace(/:/g, '')}`;

  const serie = useMemo(() => serieMensuelle(taches), [taches]);
  const maxMensuel = Math.max(1, ...serie.map((m) => Math.max(m.planifiees, m.realisees)));

  const pas = LARGEUR_TRACE / Math.max(serie.length, 1);
  const points = serie.map((mois, i) => ({ x: MARGE.gauche + pas * i + pas / 2, y: yPourcentage(mois.tauxCumule) }));
  const courbe = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const base = MARGE.haut + HAUTEUR_TRACE;
  const aire =
    points.length > 1
      ? `${courbe} L ${points[points.length - 1].x.toFixed(1)} ${base} L ${points[0].x.toFixed(1)} ${base} Z`
      : '';

  const mois = survol !== null ? serie[survol] : null;
  const dernier = serie[serie.length - 1];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Progression mensuelle &amp; avancement cumulé</h3>
            <p className="text-[11px] text-slate-500">Tâches regroupées par mois d'échéance</p>
          </div>
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
            <span className="w-3 h-0.5 bg-brand-700" aria-hidden="true" />
            Cumul (%)
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 min-h-48 mt-4 rounded-lg bg-slate-50 animate-pulse" aria-busy="true" />
      ) : error ? (
        <div role="alert" className="flex-1 flex flex-col items-center justify-center gap-3 py-10 text-center">
          <p className="text-xs text-rose-700">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Réessayer
          </button>
        </div>
      ) : serie.length === 0 ? (
        <p className="py-12 text-center text-xs text-slate-500">
          Pas assez de tâches pour tracer la progression.
        </p>
      ) : (
        <div className="mt-4 flex-1 flex flex-col justify-center">
          <svg
            viewBox={`0 0 ${L} ${H}`}
            className="w-full h-48 overflow-visible text-brand-700"
            role="img"
            aria-label="Tâches planifiées et terminées par mois, avec le taux de réalisation cumulé"
          >
            <defs>
              <linearGradient id={idDegrade} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {GRADUATIONS.map((pct) => (
              <g key={pct}>
                <line
                  x1={MARGE.gauche}
                  x2={MARGE.gauche + LARGEUR_TRACE}
                  y1={yPourcentage(pct)}
                  y2={yPourcentage(pct)}
                  className="stroke-slate-200"
                  strokeDasharray={pct === 0 ? undefined : '3 3'}
                />
                <text
                  x={MARGE.gauche - 6}
                  y={yPourcentage(pct) + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[9px] font-mono"
                >
                  {pct}%
                </text>
              </g>
            ))}

            {/* Échelle des barres (nombre de tâches), à droite */}
            <text x={MARGE.gauche + LARGEUR_TRACE + 6} y={MARGE.haut + 3} className="fill-slate-400 text-[9px] font-mono">
              {maxMensuel}
            </text>
            <text x={MARGE.gauche + LARGEUR_TRACE + 6} y={base + 3} className="fill-slate-400 text-[9px] font-mono">
              0
            </text>

            {serie.map((m, i) => {
              const centre = MARGE.gauche + pas * i + pas / 2;
              const largeurBarre = Math.min(14, Math.max(6, pas * 0.24));
              const hauteur = (n: number) => (n === 0 ? 0 : Math.max((n / maxMensuel) * HAUTEUR_TRACE, 3));

              return (
                <g
                  key={m.cle}
                  tabIndex={0}
                  role="img"
                  aria-label={`${m.label} : ${m.planifiees} planifiée(s), ${m.realisees} terminée(s), cumul ${m.tauxCumule} %`}
                  className="outline-hidden cursor-pointer"
                  onMouseEnter={() => setSurvol(i)}
                  onMouseLeave={() => setSurvol(null)}
                  onFocus={() => setSurvol(i)}
                  onBlur={() => setSurvol(null)}
                >
                  <rect
                    x={MARGE.gauche + pas * i}
                    y={MARGE.haut}
                    width={pas}
                    height={HAUTEUR_TRACE}
                    rx="4"
                    className={survol === i ? 'fill-slate-50' : 'fill-transparent'}
                  />
                  <rect
                    x={centre - largeurBarre - 1.5}
                    y={base - hauteur(m.planifiees)}
                    width={largeurBarre}
                    height={hauteur(m.planifiees)}
                    rx="2"
                    className="fill-slate-300"
                  />
                  <rect
                    x={centre + 1.5}
                    y={base - hauteur(m.realisees)}
                    width={largeurBarre}
                    height={hauteur(m.realisees)}
                    rx="2"
                    className="fill-emerald-600"
                  />
                  <text
                    x={centre}
                    y={H - 10}
                    textAnchor="middle"
                    className={`text-[10px] font-mono ${survol === i ? 'fill-slate-900 font-semibold' : 'fill-slate-500'}`}
                  >
                    {m.label}
                  </text>
                </g>
              );
            })}

            {aire && <path d={aire} fill={`url(#${idDegrade})`} className="pointer-events-none" />}
            <path
              d={courbe}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none"
            />
            {points.map((p, i) => (
              <circle
                key={serie[i].cle}
                cx={p.x}
                cy={p.y}
                r={survol === i ? 5 : 3.5}
                fill="#fff"
                stroke="currentColor"
                strokeWidth={survol === i ? 2.5 : 2}
                className="transition-all duration-150 pointer-events-none"
              />
            ))}
          </svg>

          <div className="mt-2 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 min-h-7">
            {mois ? (
              <>
                <span className="font-semibold text-slate-900">{mois.label}</span>
                <div className="flex items-center gap-3 font-mono tabular-nums text-[11px]">
                  <span>
                    Planifiées : <strong className="text-slate-900">{mois.planifiees}</strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Terminées : <strong className="text-emerald-700">{mois.realisees}</strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Cumul : <strong className="text-brand-800">{mois.tauxCumule}%</strong>
                  </span>
                </div>
              </>
            ) : (
              <>
                <span className="text-[11px] text-slate-500">Survolez un mois pour afficher le détail</span>
                <span className="font-mono tabular-nums text-[11px] font-semibold text-slate-800">
                  Cumul actuel : {dernier.tauxCumule}%
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
