import { Projet, StatistiquesProjet, Tache } from '../../../types/sgp';
import { serieMensuelle, tauxAvancementTaches } from '../../../utils/avancement';
import { tacheEnRetard, tacheEnCoursDansLesDelais } from '../../../utils/taches';

export type ScopeMode = 'global' | 'mine';
export type ProjectStatusFilter = 'all' | 'en_cours' | 'termine';
export type ProjectBarMode = 'rate' | 'status';

export interface DonutSegment {
  key: 'termine' | 'en_cours_ok' | 'en_retard' | 'annule';
  label: string;
  count: number;
  percent: number;
  color: string;
}

export interface MonthBucket {
  monthKey: string;
  label: string;
  plannedDue: number;
  completedInMonth: number;
  cumulativeRate: number;
}

/** Tâches filtrées par périmètre (tous les projets / mes tâches) et, au besoin, par projet. */
export function filtrerTaches(
  allTasks: Tache[],
  scopeMode: ScopeMode,
  personnelId: number | null | undefined,
  selectedProjetId: string
): Tache[] {
  return allTasks.filter((t) => {
    if (scopeMode === 'mine' && personnelId && t.responsable_id !== personnelId) return false;
    if (selectedProjetId !== 'all' && t.projet_id !== Number(selectedProjetId)) return false;
    return true;
  });
}

export function getResponsablesSummary(tasksList: Tache[]): { display: string; full: string } {
  const names: string[] = [];
  const seen = new Set<number>();

  tasksList.forEach((t) => {
    if (t.responsable && !seen.has(t.responsable_id)) {
      seen.add(t.responsable_id);
      names.push(`${t.responsable.prenom} ${t.responsable.nom}`);
    }
  });

  if (names.length === 0) {
    return { display: 'Aucun responsable', full: 'Aucun responsable' };
  }

  const full = names.join(', ');
  if (names.length <= 2) {
    return { display: full, full };
  }
  return {
    display: `${names.slice(0, 2).join(', ')} +${names.length - 2}`,
    full,
  };
}

export function calculerRepartition(tasks: Tache[], today: string) {
  const total = tasks.length;
  const termine = tasks.filter((t) => t.statut === 'termine').length;
  const enCours = tasks.filter((t) => t.statut === 'en_cours').length;
  const enRetard = tasks.filter(
    (t) => tacheEnRetard(t, today)
  ).length;
  const enCoursOk = tasks.filter(
    (t) => tacheEnCoursDansLesDelais(t, today)
  ).length;
  const annule = tasks.filter((t) => t.statut === 'annule').length;

  const segments: DonutSegment[] = [
    {
      key: 'termine',
      label: 'Terminées',
      count: termine,
      percent: 0,
      color: '#16A34A',
    },
    {
      key: 'en_cours_ok',
      label: 'En cours',
      count: enCoursOk,
      percent: 0,
      color: '#2563EB',
    },
    {
      key: 'en_retard',
      label: 'En retard',
      count: enRetard,
      percent: 0,
      color: '#DC2626',
    },
    {
      key: 'annule',
      label: 'Annulées',
      count: annule,
      percent: 0,
      color: '#94A3B8',
    },
  ];

  if (total > 0) {
    const unitsPerPercent = 100;
    const totalUnits = 100 * unitsPerPercent;
    const allocations = segments.map((segment, index) => {
      const exactUnits = (segment.count / total) * totalUnits;
      const units = Math.floor(exactUnits);
      return { index, units, remainder: exactUnits - units };
    });
    const remainingUnits = totalUnits - allocations.reduce((sum, allocation) => sum + allocation.units, 0);

    allocations
      .sort((a, b) => b.remainder - a.remainder)
      .slice(0, remainingUnits)
      .forEach((allocation) => {
        allocation.units += 1;
      });

    allocations.forEach((allocation) => {
      segments[allocation.index].percent = allocation.units / unitsPerPercent;
    });
  }

  const completionRate = tauxAvancementTaches(tasks);
  return { total, completionRate, enCours, enRetard, segments };
}

export function calculerSerieMensuelle(tasks: Tache[]): MonthBucket[] {
  return serieMensuelle(tasks).map((month) => ({
    monthKey: month.cle,
    label: month.label,
    plannedDue: month.planifiees,
    completedInMonth: month.realisees,
    cumulativeRate: month.tauxCumule,
  }));
}

export function construireLignesProjets({
projets,
allTasks,
statsByProject,
projectStatusFilter,
scopeMode,
personnelId,
today,
}: {
projets: Projet[];
allTasks: Tache[];
statsByProject: Record<number, StatistiquesProjet>;
projectStatusFilter: ProjectStatusFilter;
scopeMode: ScopeMode;
personnelId?: number | null;
today: string;
}) {
  const filteredProjects = projets.filter((p) =>
    projectStatusFilter === 'all' ? true : p.statut === projectStatusFilter
  );

  return filteredProjects.map((p) => {
    const tasks =
      scopeMode === 'mine' && personnelId
        ? allTasks.filter((t) => t.projet_id === p.id && t.responsable_id === personnelId)
        : allTasks.filter((t) => t.projet_id === p.id);

    const total = tasks.length;
    const termineTasks = tasks.filter((t) => t.statut === 'termine');
    const enRetardTasks = tasks.filter(
      (t) => tacheEnRetard(t, today)
    );
    const enCoursTasks = tasks.filter(
      (t) => tacheEnCoursDansLesDelais(t, today)
    );
    const enCours = tasks.filter((t) => t.statut === 'en_cours').length;
    const annuleTasks = tasks.filter((t) => t.statut === 'annule');

    const terminees = termineTasks.length;
    const enRetard = enRetardTasks.length;
    const enCoursOk = enCoursTasks.length;
    const annulees = annuleTasks.length;
    const rate = tauxAvancementTaches(tasks);
    const stats = statsByProject[p.id];

    return {
      projet: p,
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
      responsablesSummary: getResponsablesSummary(tasks),
      rate: scopeMode === 'global' ? stats.taux_avancement : rate,
    };
  });
}

export type LigneProjet = ReturnType<typeof construireLignesProjets>[number];
