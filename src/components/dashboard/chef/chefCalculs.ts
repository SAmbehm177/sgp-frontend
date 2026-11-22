import { MembreProjet, Projet, Tache } from '../../../types/sgp';

/** Charge d'un collaborateur sur les projets pilotés (compteurs de statuts disjoints). */
export interface ChargeCollaborateur {
  personnelId: number;
  fullName: string;
  shortName: string;
  poste: string;
  roles: Set<string>;
  primaryProjetId: number;
  total: number;
  terminees: number;
  enCoursOk: number;
  enRetard: number;
  annulees: number;
}

/**
 * Charge de l'équipe : pour chaque membre actif des projets pilotés (ou d'un seul), ses tâches
 * terminées, en cours, en retard et annulées. Triée par volume puis par retard.
 */
export function calculerChargeEquipe({
managedProjects,
selectedManagedId,
allTasks,
membersByProject,
today,
}: {
managedProjects: Projet[];
selectedManagedId: string;
allTasks: Tache[];
membersByProject: Record<number, MembreProjet[]>;
today: string;
}): ChargeCollaborateur[] {
  const scopeProjects =
    selectedManagedId === 'all'
      ? managedProjects
      : managedProjects.filter((p) => String(p.id) === selectedManagedId);

  const byPersonnel = new Map<number, ChargeCollaborateur>();

  scopeProjects.forEach((p) => {
    const members = (membersByProject[p.id] ?? []).filter((m) => m.statut === 'actif');

    members.forEach((m) => {
      if (!m.personnel) return;
      const existing = byPersonnel.get(m.personnel_id) || {
        personnelId: m.personnel_id,
        fullName: `${m.personnel.prenom} ${m.personnel.nom}`,
        shortName: `${m.personnel.prenom} ${m.personnel.nom.charAt(0)}.`,
        poste: m.personnel.poste,
        roles: new Set<string>(),
        primaryProjetId: p.id,
        total: 0,
        terminees: 0,
        enCoursOk: 0,
        enRetard: 0,
        annulees: 0,
      };
      if (m.fonction?.libelle) {
        existing.roles.add(m.fonction.libelle);
      }
      byPersonnel.set(m.personnel_id, existing);
    });
  });

  const scopeProjectIds = new Set(scopeProjects.map((p) => p.id));
  allTasks
    .filter((t) => scopeProjectIds.has(t.projet_id))
    .forEach((t) => {
      const entry = byPersonnel.get(t.responsable_id);
      if (!entry) return;
      entry.total += 1;
      if (t.statut === 'termine') {
        entry.terminees += 1;
      } else if (t.statut === 'annule') {
        entry.annulees += 1;
      } else if (t.date_echeance < today) {
        entry.enRetard += 1;
      } else {
        entry.enCoursOk += 1;
      }
    });

  return Array.from(byPersonnel.values()).sort(
    (a, b) => b.total - a.total || b.enRetard - a.enRetard
  );
}
