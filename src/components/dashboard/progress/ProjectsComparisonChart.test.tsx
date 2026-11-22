// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Projet, StatistiquesProjet } from '../../../types/sgp';
import { ProjectsComparisonChart } from './ProjectsComparisonChart';

const projets: Projet[] = [
  { id: 1, titre: 'Alpha', description: '', date_debut: '', date_fin_prevue: '', statut: 'en_cours', created_at: '' },
  { id: 2, titre: 'Beta', description: '', date_debut: '', date_fin_prevue: '', statut: 'en_cours', created_at: '' },
];

const statsByProject: Record<number, StatistiquesProjet> = {
  1: { taux_avancement: 0, total_taches: 0, taches_terminees: 0, taches_en_cours: 0, taches_annulees: 0, taches_en_retard: 0, par_priorite: { basse: 0, moyenne: 0, haute: 0 }, charge_par_membre: [] },
  2: { taux_avancement: 0, total_taches: 0, taches_terminees: 0, taches_en_cours: 0, taches_annulees: 0, taches_en_retard: 0, par_priorite: { basse: 0, moyenne: 0, haute: 0 }, charge_par_membre: [] },
};

describe('ProjectsComparisonChart', () => {
  afterEach(() => cleanup());

  it('affiche tous les projets par défaut', () => {
    const { getByRole } = render(
      <ProjectsComparisonChart
        projets={projets}
        allTasks={[]}
        statsByProject={statsByProject}
        scopeMode="global"
        today="2026-11-20"
        focusProjetId="all"
        onNavigate={() => {}}
      />
    );

    expect(
      (getByRole('combobox', { name: 'Sélectionner un projet à afficher dans le diagramme' }) as HTMLSelectElement)
        .value
    ).toBe('all');
  });
});
