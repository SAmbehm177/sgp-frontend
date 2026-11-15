import React from 'react';
import { DashboardData, KpiGrid, Kpi, EcheancesCard, ProjetsRecentsCard, GraphiquesZone } from './DashboardParts';
import { ProjectProgressComparison } from './ProjectProgressComparison';

// Membre : « qu'est-ce que je dois faire maintenant ? »
export const MembreDashboard: React.FC<DashboardData> = ({
  projets,
  taches,
  tachesProjets,
  graphiquesLoading,
  graphiquesPartiels,
  personnel,
  unreadCount,
  today,
  onNavigate,
}) => {
  const enCours = taches.filter((t) => t.statut === 'en_cours');
  const enRetard = enCours.filter((t) => t.date_echeance < today);
  const terminees = taches.filter((t) => t.statut === 'termine');
  const confiees = taches.filter((t) => t.statut !== 'annule').length;

  const kpis: Kpi[] = [
    {
      label: 'Mes tâches en cours',
      value: enCours.length,
      detail: 'À traiter et clôturer',
      onClick: () => onNavigate('mes-taches'),
    },
    {
      label: 'Mes tâches en retard',
      value: enRetard.length,
      detail: 'Échéance dépassée',
      valueClass: enRetard.length > 0 ? 'text-rose-600' : undefined,
      detailClass: enRetard.length > 0 ? 'text-rose-500' : undefined,
      onClick: () => onNavigate('mes-taches', { filter: 'overdue' }),
    },
    {
      label: 'Mes tâches terminées',
      value: terminees.length,
      detail: `Sur ${confiees} tâche${confiees > 1 ? 's' : ''} confiée${confiees > 1 ? 's' : ''}`,
      onClick: () => onNavigate('mes-taches', { filter: 'termine' }),
    },
    {
      label: 'Notifications',
      value: unreadCount,
      detail: unreadCount > 0 ? 'Messages non lus' : 'À jour',
      onClick: () => onNavigate('notifications'),
    },
  ];

  return (
    <>
      <KpiGrid kpis={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EcheancesCard
            titre="Mes tâches à échéance proche"
            taches={taches}
            today={today}
            afficherResponsable={false}
            voirTout
            onNavigate={onNavigate}
          />
        </div>
        <ProjetsRecentsCard projets={projets} onNavigate={onNavigate} />
      </div>

      {projets.length > 0 && (
        <GraphiquesZone loading={graphiquesLoading} partiels={graphiquesPartiels}>
          <ProjectProgressComparison
            projets={projets}
            allTasks={tachesProjets}
            personnelId={personnel?.id}
            defaultScope="mine"
            onNavigate={onNavigate}
          />
        </GraphiquesZone>
      )}
    </>
  );
};
