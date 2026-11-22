import { describe, expect, it } from 'vitest';
import type { MembreProjet, Projet, Tache } from '../../../types/sgp';
import { calculerChargeEquipe } from './chefCalculs';

const today = '2026-11-18';

const projet = (id: number): Projet => ({
  id,
  titre: `P${id}`,
  description: '',
  date_debut: '2026-01-01',
  date_fin_prevue: '2027-01-01',
  statut: 'en_cours',
  taux_avancement: 0,
  created_at: '',
});

const membre = (projet_id: number, personnel_id: number, statut: MembreProjet['statut'] = 'actif'): MembreProjet => ({
  id: personnel_id,
  projet_id,
  personnel_id,
  fonction_id: 2,
  date_affectation: '2026-01-01',
  date_retrait: null,
  statut,
  fonction: { id: 2, libelle: 'Membre' },
  personnel: {
    id: personnel_id,
    nom: 'Durand',
    prenom: `Prenom${personnel_id}`,
    matricule: '',
    poste: 'Dev',
    user_id: null,
    created_at: '',
  },
});

let seq = 0;
const tache = (projet_id: number, responsable_id: number, statut: Tache['statut'], echeance: string): Tache => ({
  id: ++seq,
  projet_id,
  titre: 'T',
  description: '',
  statut,
  priorite: 'moyenne',
  date_debut: '2026-01-01',
  date_echeance: echeance,
  responsable_id,
  created_at: '',
  updated_at: '',
});

describe('calculerChargeEquipe', () => {
  const managedProjects = [projet(1), projet(2)];
  const membersByProject = {
    1: [membre(1, 10), membre(1, 11), membre(1, 12, 'retire')],
    2: [membre(2, 10)],
  };
  const allTasks = [
    tache(1, 10, 'termine', '2026-10-01'),
    tache(1, 10, 'en_cours', '2026-11-01'), // en retard
    tache(1, 11, 'en_cours', '2026-12-01'),
    tache(1, 11, 'annule', '2026-12-01'),
    tache(2, 10, 'en_cours', '2026-12-05'),
    tache(1, 12, 'en_cours', '2026-12-01'), // membre retiré : ignoré
  ];
  const base = { managedProjects, allTasks, membersByProject, today };

  it('additionne les tâches de chaque membre actif sur tous les projets pilotés', () => {
    const charge = calculerChargeEquipe({ ...base, selectedManagedId: 'all' });

    expect(charge.map((c) => c.personnelId)).toEqual([10, 11]); // le membre retiré n'apparaît pas
    expect(charge[0]).toMatchObject({ total: 3, terminees: 1, enRetard: 1, enCoursOk: 1, annulees: 0 });
    expect(charge[1]).toMatchObject({ total: 2, terminees: 0, enRetard: 0, enCoursOk: 1, annulees: 1 });
  });

  it('se limite au projet choisi', () => {
    const charge = calculerChargeEquipe({ ...base, selectedManagedId: '2' });

    expect(charge).toHaveLength(1);
    expect(charge[0]).toMatchObject({ personnelId: 10, total: 1, enCoursOk: 1 });
  });
});
