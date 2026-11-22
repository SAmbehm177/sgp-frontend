import { describe, expect, it } from 'vitest';
import { parseHash, toHash } from './router';

describe('parseHash', () => {
  it('retombe sur le tableau de bord quand le hash est vide ou inconnu', () => {
    expect(parseHash('').name).toBe('dashboard');
    expect(parseHash('#/nimporte-quoi').name).toBe('dashboard');
  });

  it('lit un projet et son onglet', () => {
    expect(parseHash('#/projets/12/taches')).toEqual({
      name: 'project-detail',
      params: { id: 12, tab: 'taches' },
    });
    expect(parseHash('#/projets/12').params.tab).toBe('vue-ensemble');
    expect(parseHash('#/projets/12/inconnu').params.tab).toBe('vue-ensemble');
  });

  it('refuse un identifiant de projet invalide', () => {
    expect(parseHash('#/projets/abc').name).toBe('projets');
    expect(parseHash('#/projets/0').name).toBe('projets');
  });

  it('lit le filtre de « Mes tâches »', () => {
    expect(parseHash('#/mes-taches?filter=overdue')).toEqual({
      name: 'mes-taches',
      params: { filter: 'overdue' },
    });
  });
});

describe('toHash', () => {
  it('est l’inverse de parseHash', () => {
    const cas: Array<Parameters<typeof toHash>> = [
      ['dashboard'],
      ['projets'],
      ['projects-new'],
      ['project-detail', { id: 3, tab: 'membres' }],
      ['mes-taches', { filter: 'en_cours' }],
      ['profile'],
    ];
    for (const [name, params] of cas) {
      expect(parseHash(toHash(name, params))).toEqual({ name, params: params ?? {} });
    }
  });
});
