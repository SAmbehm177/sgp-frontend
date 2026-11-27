import { describe, expect, it } from 'vitest';
import { parsePath, toPath } from './router';

describe('parsePath', () => {
  it('retombe sur le tableau de bord quand le chemin est vide ou inconnu', () => {
    expect(parsePath('').name).toBe('dashboard');
    expect(parsePath('/').name).toBe('dashboard');
    expect(parsePath('/nimporte-quoi').name).toBe('dashboard');
  });

  it('lit un projet et son onglet', () => {
    expect(parsePath('/projets/12/taches')).toEqual({
      name: 'project-detail',
      params: { id: 12, tab: 'taches' },
    });
    expect(parsePath('/projets/12').params.tab).toBe('vue-ensemble');
    expect(parsePath('/projets/12/inconnu').params.tab).toBe('vue-ensemble');
  });

  it('refuse un identifiant de projet invalide', () => {
    expect(parsePath('/projets/abc').name).toBe('projets');
    expect(parsePath('/projets/0').name).toBe('projets');
  });

  it('lit le filtre de « Mes tâches »', () => {
    expect(parsePath('/mes-taches?filter=overdue')).toEqual({
      name: 'mes-taches',
      params: { filter: 'overdue' },
    });
  });
});

describe('toPath', () => {
  it('est l’inverse de parsePath', () => {
    const cas: Array<Parameters<typeof toPath>> = [
      ['dashboard'],
      ['projets'],
      ['projects-new'],
      ['project-detail', { id: 3, tab: 'membres' }],
      ['mes-taches', { filter: 'en_cours' }],
      ['profile'],
    ];
    for (const [name, params] of cas) {
      expect(parsePath(toPath(name, params))).toEqual({ name, params: params ?? {} });
    }
  });
});