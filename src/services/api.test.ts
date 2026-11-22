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

  it('creates a project with its required project lead', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 1,
          titre: 'Nouveau projet',
          description: '',
          date_debut: '2026-01-01',
          date_fin: '2026-12-31',
          statut: 'en cours',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await api.createProjet({
      titre: 'Nouveau projet',
      description: '',
      date_debut: '2026-01-01',
      date_fin_prevue: '2026-12-31',
      chef_id: 7,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/projets',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          titre: 'Nouveau projet',
          description: '',
          date_debut: '2026-01-01',
          date_fin: '2026-12-31',
          chef_id: 7,
        }),
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

describe('project deletion', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deletes the project with a single request', async () => {
    await api.deleteProjet(1);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/projets/1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

describe('project member role updates', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('updates a member role without removing the member', async () => {
    await api.updateMembreFonction(1, 2, 3);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/projets/1/membres/2',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ fonction_id: 3 }),
      })
    );
  });
});

describe('discussion deletion polling', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests deletion events separately from newer messages', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [],
          a_plus_ancien: false,
          suppressions: [{ id: 4, message_id: 21 }],
          dernier_id_suppression: 4,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await expect(
      api.getMessages(3, { apresId: 25, apresSuppressionId: 3 })
    ).resolves.toEqual({
      messages: [],
      aPlusAncien: false,
      suppressions: [{ id: 4, messageId: 21 }],
      dernierIdSuppression: 4,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/projets/3/messages?apres_id=25&apres_suppression_id=3',
      expect.any(Object)
    );
  });
});

describe('dashboard', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('charge tout le tableau de bord avec une seule requête', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          date: '2026-11-18',
          projets: [],
          stats: {},
          taches: [],
          taches_tronquees: false,
          membres: {},
          fonctions: [],
          notifications_non_lues: 0,
          agregats: { global: { termine: 0, en_cours: 0, en_retard: 0, annule: 0, actives: 0, taux: 0 }, mensuel: [] },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const donnees = await api.getDashboard();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/dashboard');
    expect(donnees.tachesTronquees).toBe(false);
  });
});
