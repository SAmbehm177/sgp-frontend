import { describe, it, expect } from 'vitest';
import { determinerMode, projetsDiriges } from './dashboardMode';
import { Fonction, Projet } from '../../types/sgp';

const fonctions: Fonction[] = [
  { id: 1, libelle: 'Chef de projet' },
  { id: 2, libelle: 'Membre' },
];
const projet = (id: number, ma_fonction_id?: number): Projet => ({
  id,
  titre: `P${id}`,
  description: '',
  date_debut: '',
  date_fin_prevue: '',
  statut: 'en_cours',
  created_at: '',
  ma_fonction_id,
});

describe('determinerMode', () => {
  it("l'administrateur est toujours en mode admin", () => {
    expect(determinerMode(true, [projet(1, 1)], fonctions)).toBe('admin');
  });

  it('chef dès qu’un projet est dirigé, même si les autres sont en tant que membre', () => {
    const projets = [projet(1, 2), projet(2, 1)];
    expect(determinerMode(false, projets, fonctions)).toBe('chef');
    expect(projetsDiriges(projets, fonctions).map((p) => p.id)).toEqual([2]);
  });

  it('membre sans projet dirigé, ou sans fonctions chargées', () => {
    expect(determinerMode(false, [projet(1, 2)], fonctions)).toBe('membre');
    expect(determinerMode(false, [projet(1, 1)], [])).toBe('membre');
    expect(determinerMode(false, [], fonctions)).toBe('membre');
  });
});
