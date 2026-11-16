import React, { useMemo, useState } from 'react';
import { Tache } from '../../types/sgp';
import { Card } from './DashboardParts';

interface StatusDonutProps {
  tasks: Tache[];
  today: string;
  titre?: string;
}

type Cle = 'termine' | 'en_cours_ok' | 'en_retard' | 'annule';

const RADIUS = 58;
const STROKE = 16;
const CIRCONFERENCE = 2 * Math.PI * RADIUS;

// Répartition des tâches par statut (lecture seule : pas de navigation au clic)
export const StatusDonut: React.FC<StatusDonutProps> = ({ tasks, today, titre = 'Répartition par statut' }) => {
  const [survol, setSurvol] = useState<Cle | null>(null);

  const { total, tauxTermine, segments } = useMemo(() => {
    const total = tasks.length;
    const termine = tasks.filter((t) => t.statut === 'termine').length;
    const enRetard = tasks.filter((t) => t.statut === 'en_cours' && t.date_echeance < today).length;
    const enCoursOk = tasks.filter((t) => t.statut === 'en_cours' && t.date_echeance >= today).length;
    const annule = tasks.filter((t) => t.statut === 'annule').length;
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

    return {
      total,
      tauxTermine: pct(termine),
      segments: [
        { key: 'termine' as Cle, label: 'Terminées', count: termine, percent: pct(termine), color: '#16A34A' },
        { key: 'en_cours_ok' as Cle, label: 'En cours', count: enCoursOk, percent: pct(enCoursOk), color: '#2563EB' },
        {
          key: 'en_retard' as Cle,
          label: 'En retard',
          count: enRetard,
          percent: pct(enRetard),
          color: '#DC2626',
        },
        { key: 'annule' as Cle, label: 'Annulées', count: annule, percent: pct(annule), color: '#94A3B8' },
      ],
    };
  }, [tasks, today]);

  const actif = survol ? segments.find((s) => s.key === survol) ?? null : null;
  let decalage = 0;

  return (
    <Card
      title={titre}
      subtitle={`${total} ${total > 1 ? 'tâches' : 'tâche'}`}
    >
      {total === 0 ? (
        <p className="py-10 text-center text-xs text-slate-500">Aucune tâche pour le moment.</p>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-36 h-36 shrink-0">
            <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90" role="img" aria-label={`${tauxTermine}% des tâches terminées`}>
              <circle cx="80" cy="80" r={RADIUS} fill="none" stroke="#F1F5F9" strokeWidth={STROKE} />
              {segments.map((seg) => {
                if (seg.count === 0) return null;
                const longueur = (seg.count / total) * CIRCONFERENCE;
                const dash = `${Math.max(longueur - 2, 1)} ${CIRCONFERENCE}`;
                const offset = -decalage;
                decalage += longueur;

                return (
                  <circle
                    key={seg.key}
                    cx="80"
                    cy="80"
                    r={RADIUS}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={survol === seg.key ? STROKE + 3 : STROKE}
                    strokeDasharray={dash}
                    strokeDashoffset={offset}
                    opacity={survol !== null && survol !== seg.key ? 0.3 : 1}
                    className="transition-all duration-150"
                    onMouseEnter={() => setSurvol(seg.key)}
                    onMouseLeave={() => setSurvol(null)}
                  />
                );
              })}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 leading-none">
                {actif ? `${actif.percent}%` : `${tauxTermine}%`}
              </span>
              <span className="text-[11px] font-medium text-slate-500 mt-1 leading-tight">
                {actif ? actif.label : 'Avancement'}
              </span>
            </div>
          </div>

          <div className="w-full space-y-1">
            {segments.map((seg) => (
              <div
                key={seg.key}
                onMouseEnter={() => setSurvol(seg.key)}
                onMouseLeave={() => setSurvol(null)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  survol === seg.key ? 'bg-slate-50' : ''
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: seg.color }} aria-hidden="true" />
                  <span className="text-slate-700 font-medium truncate">{seg.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                  <span className="font-semibold text-slate-900">{seg.count}</span>
                  <span className="text-[11px] text-slate-400 w-9 text-right">{seg.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
