import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./session', () => ({
  API_BASE_URL: 'http://localhost:8000/api',
  session: {
    getToken: vi.fn(() => null),
    setToken: vi.fn(),
  },
}));

import { api } from './api';

describe('partial updates', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('updates a project with PATCH and sends only changed fields', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 1,
          titre: 'Nouveau titre',
          description: 'Description',
          date_debut: '2026-01-01',
          date_fin: '2026-12-31',
          statut: 'en cours',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await api.updateProjet(1, { titre: 'Nouveau titre' });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/projets/1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ titre: 'Nouveau titre' }),
      })
    );
  });

  it('updates a task with PATCH and sends only changed fields', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 2,
          projet_id: 1,
          titre: 'Nouvelle tâche',
          description: 'Description',
          statut: 'en cours',
          priorite: 'moyenne',
          date_debut: '2026-01-01',
          date_echeance: '2026-02-01',
          responsable_id: 3,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await api.updateTache(2, { titre: 'Nouvelle tâche' });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/taches/2',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ titre: 'Nouvelle tâche' }),
      })
    );
  });
});
