import React, { useMemo } from 'react';
import { Projet } from '../../types/sgp';
import { ProgressBar } from '../common/ProgressBar';
import {
  Card,
  DashboardData,
  EcheancesCard,
  GraphiquesZone,
  Kpi,
  KpiGrid,
  ProjetsRecentsCard,
} from './DashboardParts';
import { ProjectProgressComparison } from './ProjectProgressComparison';
import { StatusDonut } from './StatusDonut';

interface AdminDashboardProps extends DashboardData {
  personnelsSansAcces: number | null; // null : information indisponible
}

// Un champ undefined (compteur non fourni par l'API) n'est jamais signalé comme anomalie
const sansChef = (p: Projet) => p.chefs_noms !== undefined && p.chefs_noms.length === 0;
const sansTache = (p: Projet) =>
  p.taches_en_cours !== undefined &&
  (p.taches_en_cours ?? 0) + (p.taches_terminees ?? 0) + (p.taches_annulees ?? 0) === 0;

// Administrateur : « où ça dérape dans l'organisation ? »
export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  projets,
  taches,
  tachesProjets,
  graphiquesLoading,
  graphiquesPartiels,
  personnel,
  today,
  onNavigate,
  personnelsSansAcces,
}) => {
  const actifs = projets.filter((p) => p.statut === 'en_cours');
  const enRetardTotal = projets.reduce((total, p) => total + (p.taches_en_retard ?? 0), 0);
  const projetsSansChef = actifs.filter(sansChef).length;

  const aSurveiller = useMemo(
    () =>
      actifs
        .map((p) => ({ p, enRetard: p.taches_en_retard ?? 0, sansChef: sansChef(p), sansTache: sansTache(p) }))
        .filter((x) => x.enRetard > 0 || x.sansChef || x.sansTache)
        .sort((a, b) => b.enRetard - a.enRetard || Number(b.sansChef) - Number(a.sansChef))
        .slice(0, 6),
    [actifs]
  );

  const kpis: Kpi[] = [
    {
      label: 'Projets actifs',
      value: actifs.length,
      detail: `Sur ${projets.length} projet${projets.length > 1 ? 's' : ''} au total`,
      onClick: () => onNavigate('projets'),
    },
    {
      label: 'Tâches en retard',
      value: enRetardTotal,
      detail: 'Tous projets confondus',
      valueClass: enRetardTotal > 0 ? 'text-rose-600' : undefined,
      detailClass: enRetardTotal > 0 ? 'text-rose-500' : undefined,
    },
    {
      label: 'Projets sans chef',
      value: projetsSansChef,
      detail: 'Parmi les projets en cours',
      valueClass: projetsSansChef > 0 ? 'text-amber-600' : undefined,
      detailClass: projetsSansChef > 0 ? 'text-amber-600' : undefined,
      onClick: () => onNavigate('projets'),
    },
    {
      label: 'Personnels sans accès',
      value: personnelsSansAcces ?? '—',
      detail:
        personnelsSansAcces === null
          ? 'Information indisponible'
          : personnelsSansAcces > 0
          ? 'Fiches sans compte de connexion'
          : 'Tous les personnels ont un accès',
      valueClass: personnelsSansAcces ? 'text-amber-600' : undefined,
      detailClass: personnelsSansAcces ? 'text-amber-600' : undefined,
      onClick: () => onNavigate('administration'),
    },
  ];

  return (
    <>
      <KpiGrid kpis={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Projets à surveiller" subtitle="Retards, absence de chef ou projet sans tâche.">
            {aSurveiller.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">Rien à signaler : tous les projets en cours sont sous contrôle.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {aSurveiller.map(({ p, enRetard, sansChef: sc, sansTache: st }) => (
                  <button
                    key={p.id}
                    onClick={() => onNavigate('project-detail', { id: p.id, tab: enRetard > 0 ? 'taches' : 'vue-ensemble' })}
                    className="w-full text-left py-3 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xs font-bold text-slate-900 truncate">{p.titre}</h3>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {enRetard > 0 && (
                          <span className="px-2 py-0.5 text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-full">
                            {enRetard} en retard
                          </span>
                        )}
                        {sc && (
                          <span className="px-2 py-0.5 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
                            Sans chef
                          </span>
                        )}
                        {st && (
                          <span className="px-2 py-0.5 text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-full">
                            Aucune tâche
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <ProgressBar progress={p.taux_avancement ?? 0} size="sm" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {graphiquesLoading ? (
          <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" aria-busy="true" />
        ) : (
          <StatusDonut tasks={tachesProjets} today={today} titre="Répartition globale" />
        )}
      </div>

      {projets.length > 0 && (
        <GraphiquesZone loading={graphiquesLoading} partiels={graphiquesPartiels}>
          <ProjectProgressComparison
            projets={projets}
            allTasks={tachesProjets}
            personnelId={personnel?.id}
            defaultScope="global"
            onNavigate={onNavigate}
          />
        </GraphiquesZone>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EcheancesCard
            titre={personnel ? 'Mes tâches à échéance proche' : 'Tâches à échéance proche'}
            taches={taches}
            today={today}
            afficherResponsable={!personnel}
            voirTout={!!personnel}
            onNavigate={onNavigate}
          />
        </div>
        <ProjetsRecentsCard projets={projets} onNavigate={onNavigate} />
      </div>
    </>
  );
};
