import React, { useMemo, useState } from 'react';
import type { NavigateFn } from '../../router';
import { MembreProjet, Projet, StatistiquesProjet, Tache } from '../../types/sgp';
import { tacheEnRetard } from '../../utils/taches';
import { getLocalDateString } from '../../utils/date';
import { ChefBanner } from './chef/ChefBanner';
import { ChefKpiRow } from './chef/ChefKpiRow';
import { ChefProjectsDonut } from './chef/ChefProjectsDonut';
import { OtherParticipations } from './chef/OtherParticipations';
import { TeamTasksPanel } from './chef/TeamTasksPanel';
import { TeamWorkloadChart } from './chef/TeamWorkloadChart';

interface ChefDashboardSectionProps {
  userName: string;
  personnelId: number;
  managedProjects: Projet[];
  participatingProjects: Projet[];
  allTasks: Tache[];
  statsByProject: Record<number, StatistiquesProjet>;
  membersByProject: Record<number, MembreProjet[]>;
  functionNames: Record<number, string>;
  unreadNotifs: number;
  onNavigate: NavigateFn;
}

export const ChefDashboardSection: React.FC<ChefDashboardSectionProps> = ({
  userName,
  personnelId,
  managedProjects,
  participatingProjects,
  allTasks,
  statsByProject,
  membersByProject,
  functionNames,
  unreadNotifs,
  onNavigate,
}) => {
  // Filtre « projet piloté » partagé par le suivi de charge et la liste d'échéances
  const [selectedManagedId, setSelectedManagedId] = useState<string>('all');

  const today = useMemo(() => getLocalDateString(), []);
  const managedIds = useMemo(() => new Set(managedProjects.map((p) => p.id)), [managedProjects]);

  const teamTasks = useMemo(
    () => allTasks.filter((t) => managedIds.has(t.projet_id)),
    [allTasks, managedIds]
  );

  const teamOngoingTasks = useMemo(
    () =>
      teamTasks
        .filter((t) => t.statut === 'en_cours')
        .sort((a, b) => a.date_echeance.localeCompare(b.date_echeance)),
    [teamTasks]
  );

  const teamOverdueTasks = useMemo(
    () => teamTasks.filter((t) => tacheEnRetard(t, today)),
    [teamTasks, today]
  );

  const myOngoingTasks = useMemo(
    () =>
      allTasks
        .filter((t) => t.responsable_id === personnelId && t.statut === 'en_cours')
        .sort((a, b) => a.date_echeance.localeCompare(b.date_echeance)),
    [allTasks, personnelId]
  );

  return (
    <div className="space-y-6">
      <ChefBanner userName={userName} onNavigate={onNavigate} />

      <ChefKpiRow
        managedProjects={managedProjects}
        teamTasks={teamTasks}
        teamOngoingTasks={teamOngoingTasks}
        teamOverdueTasks={teamOverdueTasks}
        myOngoingTasks={myOngoingTasks}
        unreadNotifs={unreadNotifs}
        onNavigate={onNavigate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <ChefProjectsDonut
          managedProjects={managedProjects}
          teamTasks={teamTasks}
          today={today}
          onNavigate={onNavigate}
        />
        <TeamWorkloadChart
          managedProjects={managedProjects}
          selectedManagedId={selectedManagedId}
          onSelectManaged={setSelectedManagedId}
          allTasks={allTasks}
          membersByProject={membersByProject}
          today={today}
          onNavigate={onNavigate}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TeamTasksPanel
          teamOngoingTasks={teamOngoingTasks}
          myOngoingTasks={myOngoingTasks}
          selectedManagedId={selectedManagedId}
          today={today}
          onNavigate={onNavigate}
        />
        <OtherParticipations
          participatingProjects={participatingProjects}
          statsByProject={statsByProject}
          functionNames={functionNames}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
};
