import { describe, expect, it } from 'vitest';
import type { Projet, StatistiquesProjet, Tache } from '../../../types/sgp';
import {
  calculerRepartition,
  construireLignesProjets,
  filtrerTaches,
  getResponsablesSummary,
} from './progressCalculs';

const today = '2026-11-18';

let seq = 0;
const tache = (over: Partial<Tache>): Tache => ({
  id: ++seq,
  projet_id: 1,
  titre: 'T',
  description: '',
  statut: 'en_cours',
  priorite: 'moyenne',
  date_debut: '2026-01-01',
  date_echeance: '2026-12-01',
  responsable_id: 1,
  created_at: '',
  updated_at: '',
  ...over,
});

const projet = (id: number, statut: Projet['statut'] = 'en_cours'): Projet => ({
  id,
  titre: `P${id}`,
  description: '',
  date_debut: '2026-01-01',
  date_fin_prevue: '2027-01-01',
  statut,
  taux_avancement: 0,
  created_at: '',
});

describe('filtrerTaches', () => {
  const taches = [
    tache({ projet_id: 1, responsable_id: 1 }),
    tache({ projet_id: 1, responsable_id: 2 }),
    tache({ projet_id: 2, responsable_id: 1 }),
  ];

  it('garde tout par défaut', () => {
    expect(filtrerTaches(taches, 'global', 1, 'all')).toHaveLength(3);
  });

  it('« Mes tâches » ne garde que celles du responsable', () => {
    expect(filtrerTaches(taches, 'mine', 1, 'all')).toHaveLength(2);
  });

  it('« Mes tâches » sans fiche personnel ne filtre pas (administrateur)', () => {
    expect(filtrerTaches(taches, 'mine', null, 'all')).toHaveLength(3);
  });

  it('filtre par projet', () => {
    expect(filtrerTaches(taches, 'global', 1, '2')).toHaveLength(1);
  });
});

describe('calculerRepartition', () => {
  it('compte les retards dans les tâches en cours tout en séparant les catégories du graphique', () => {
    const { total, enCours, enRetard, segments, completionRate } = calculerRepartition(
      [
        tache({ statut: 'termine' }),
        tache({ statut: 'en_cours', date_echeance: '2026-12-01' }),
        tache({ statut: 'en_cours', date_echeance: '2026-11-01' }),
        tache({ statut: 'annule' }),
      ],
      today
    );

    expect(total).toBe(4);
    expect(enCours).toBe(2);
    expect(enRetard).toBe(1);
    expect(Object.fromEntries(segments.map((s) => [s.key, s.count]))).toEqual({
      termine: 1,
      en_cours_ok: 1,
      en_retard: 1,
      annule: 1,
    });
    expect(segments.map((s) => s.label)).toEqual([
      'Terminées',
      'En cours',
      'En retard',
      'Annulées',
    ]);
    expect(segments.every((s) => s.percent === 25)).toBe(true);
    expect(completionRate).toBe(33); // 1 terminée sur 3 tâches non annulées
  });

  it('ne divise pas par zéro sans tâche', () => {
    const { total, enCours, enRetard, segments } = calculerRepartition([], today);
    expect(total).toBe(0);
    expect(enCours).toBe(0);
    expect(enRetard).toBe(0);
    expect(segments.every((s) => s.percent === 0)).toBe(true);
  });
});

describe('construireLignesProjets', () => {
  const stats: Record<number, StatistiquesProjet> = {
    1: { taux_avancement: 80 } as StatistiquesProjet,
    2: { taux_avancement: 10 } as StatistiquesProjet,
  };
  const taches = [
    tache({ projet_id: 1, statut: 'termine', responsable_id: 1 }),
    tache({ projet_id: 1, statut: 'en_cours', responsable_id: 2 }),
    tache({ projet_id: 2, statut: 'en_cours', responsable_id: 1 }),
  ];
  const base = { projets: [projet(1), projet(2, 'termine')], allTasks: taches, statsByProject: stats, today };

  it('utilise le taux du serveur en vue globale et le taux calculé sur « Mes tâches »', () => {
    const globales = construireLignesProjets({ ...base, projectStatusFilter: 'all', scopeMode: 'global', personnelId: 1 });
    expect(globales.map((l) => l.rate)).toEqual([80, 10]);

    const miennes = construireLignesProjets({ ...base, projectStatusFilter: 'all', scopeMode: 'mine', personnelId: 1 });
    expect(miennes[0].total).toBe(1);
    expect(miennes[0].rate).toBe(100);
  });

  it('filtre les projets par statut', () => {
    const lignes = construireLignesProjets({ ...base, projectStatusFilter: 'termine', scopeMode: 'global', personnelId: 1 });
    expect(lignes.map((l) => l.projet.id)).toEqual([2]);
  });
});

describe('getResponsablesSummary', () => {
  it('reste vide sans tâche', () => {
    expect(getResponsablesSummary([]).full).toBeDefined();
  });
});
