// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MembreProjet, Projet, Tache } from '../../types/sgp';

const { toast, apiMock } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  apiMock: {
    getTaches: vi.fn(),
    createTache: vi.fn(),
    updateTache: vi.fn(),
    updateTaskStatus: vi.fn(),
    deleteTache: vi.fn(),
  },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    personnel: { id: 1, nom: 'Moi', prenom: 'Alex', matricule: '', poste: '', user_id: 1, created_at: '' },
    isAdmin: false,
  }),
}));
vi.mock('../../context/ToastContext', () => ({ useToast: () => toast }));
vi.mock('../../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/api')>()),
  api: apiMock,
}));

import { ProjectTasksView } from './ProjectTasksView';

const jour = (d: number) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
};
const perso = (id: number) => ({ id, nom: `Nom${id}`, prenom: `Prenom${id}`, matricule: '', poste: '', user_id: null, created_at: '' });
const projet: Projet = {
  id: 9, titre: 'Projet 9', description: '', date_debut: jour(-200), date_fin_prevue: jour(400),
  statut: 'en_cours', taux_avancement: 0, created_at: '',
};
const membres: MembreProjet[] = [1, 2].map((id) => ({
  id, projet_id: 9, personnel_id: id, fonction_id: 2, date_affectation: '', date_retrait: null, statut: 'actif', personnel: perso(id),
}));
const tache = (id: number, titre: string, statut: Tache['statut'], echeance: number, resp: number): Tache => ({
  id, projet_id: 9, titre, description: `Description de ${titre}`, statut, priorite: 'haute',
  date_debut: jour(-30), date_echeance: jour(echeance), responsable_id: resp, responsable: perso(resp), created_at: '', updated_at: '',
});
const taches = [
  tache(1, 'Rédiger le cahier', 'en_cours', 5, 1),
  tache(2, 'Maquettes', 'en_cours', -3, 2),
  tache(3, 'Recette', 'termine', -10, 2),
];

const changer = (c: HTMLElement, sel: string, valeur: string) =>
  fireEvent.change(c.querySelector(sel) as Element, { target: { value: valeur } });

function monter(canManage = true) {
  const onChanged = vi.fn();
  const rendu = render(
    <ProjectTasksView projet={projet} membres={membres} canManage={canManage} onChanged={onChanged} onOpenTeam={() => {}} />
  );
  return { ...rendu, onChanged };
}

describe('ProjectTasksView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getTaches.mockResolvedValue(taches);
    apiMock.createTache.mockResolvedValue({});
    apiMock.updateTache.mockResolvedValue({});
    apiMock.updateTaskStatus.mockResolvedValue({});
    apiMock.deleteTache.mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('liste les tâches du projet et signale celles en retard', async () => {
    const { findByText, getByText } = monter();
    await findByText('Rédiger le cahier');

    expect(getByText('Tâches du projet (3)')).toBeTruthy();
    expect(getByText('1 en retard')).toBeTruthy();
    const tacheEnRetard = getByText('Maquettes').closest('tr');
    expect(tacheEnRetard?.textContent).toContain('En cours');
    expect(tacheEnRetard?.textContent).toContain('En retard');
    expect(apiMock.getTaches).toHaveBeenCalledWith(9);
  });

  it('crée une tâche avec les valeurs saisies, puis recharge la liste et le projet', async () => {
    const { container, findByText, getByText, onChanged } = monter();
    await findByText('Maquettes');

    fireEvent.click(getByText('Créer une tâche', { selector: 'button' }));
    changer(container, '#tache-titre', '  Nouvelle tâche ');
    changer(container, '#tache-description', 'Une description');
    changer(container, '#tache-priorite', 'haute');
    changer(container, '#tache-echeance', jour(20));
    fireEvent.submit(container.querySelector('form') as Element);

    await waitFor(() => expect(apiMock.createTache).toHaveBeenCalledTimes(1));
    expect(apiMock.createTache.mock.calls[0][0]).toMatchObject({
      projet_id: 9,
      titre: 'Nouvelle tâche',
      description: 'Une description',
      priorite: 'haute',
      responsable_id: 1, // le chef est proposé par défaut comme responsable
      date_echeance: jour(20),
    });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(apiMock.getTaches).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenCalledWith('Tâche créée', expect.stringContaining('Nouvelle tâche'));
  });

  it('refuse un formulaire vide sans appeler l’API', async () => {
    const { container, findByText, getByText } = monter();
    await findByText('Maquettes');

    fireEvent.click(getByText('Créer une tâche', { selector: 'button' }));
    fireEvent.submit(container.querySelector('form') as Element);

    expect(container.textContent).toContain('Le titre est obligatoire.');
    expect(apiMock.createTache).not.toHaveBeenCalled();
  });

  it('n’envoie le responsable que s’il change lors d’une modification', async () => {
    const { container, findByLabelText } = monter();
    fireEvent.click(await findByLabelText('Modifier « Maquettes »'));
    fireEvent.submit(container.querySelector('form') as Element);

    await waitFor(() => expect(apiMock.updateTache).toHaveBeenCalledTimes(1));
    expect(apiMock.updateTache.mock.calls[0][1]).not.toHaveProperty('responsable_id');
  });

  it('change le statut d’une tâche', async () => {
    const { findByLabelText } = monter(false);
    fireEvent.click(await findByLabelText('Marquer « Rédiger le cahier » comme terminée'));

    await waitFor(() => expect(apiMock.updateTaskStatus).toHaveBeenCalledWith(1, 'termine'));
  });

  it('actualise la liste automatiquement pour refléter les changements faits par un autre membre', async () => {
    vi.useFakeTimers();
    const tachesTerminees = taches.map((item) =>
      item.id === 1 ? { ...item, statut: 'termine' as const } : item
    );
    apiMock.getTaches.mockResolvedValueOnce(taches).mockResolvedValueOnce(tachesTerminees);

    const { getByText } = monter(false);
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(apiMock.getTaches).toHaveBeenCalledTimes(2);
    expect(getByText('Rédiger le cahier').closest('tr')?.textContent).toContain('Terminé');
  });

  it('un simple membre ne peut agir que sur ses propres tâches et ne peut ni créer ni supprimer', async () => {
    const { findByText, queryByLabelText, queryByText } = monter(false);
    await findByText('Maquettes');

    expect(queryByLabelText('Marquer « Maquettes » comme terminée')).toBeNull(); // tâche d'un collègue
    expect(queryByLabelText('Marquer « Rédiger le cahier » comme terminée')).not.toBeNull();
    expect(queryByLabelText('Supprimer « Maquettes »')).toBeNull();
    expect(queryByText('Créer une tâche')).toBeNull();
  });

  it('confirme avant de supprimer', async () => {
    const { findByLabelText, getByText } = monter();
    fireEvent.click(await findByLabelText('Supprimer « Recette »'));
    expect(apiMock.deleteTache).not.toHaveBeenCalled();

    fireEvent.click(getByText('Supprimer', { selector: 'button' }));
    await waitFor(() => expect(apiMock.deleteTache).toHaveBeenCalledWith(3));
  });

  it('filtre la liste par recherche et par retard', async () => {
    const { container, findByText, getByText, queryByText } = monter();
    await findByText('Maquettes');

    fireEvent.change(container.querySelector('input[type="text"]') as Element, { target: { value: 'maquet' } });
    expect(queryByText('Rédiger le cahier')).toBeNull();
    expect(queryByText('Maquettes')).not.toBeNull();

    fireEvent.change(container.querySelector('input[type="text"]') as Element, { target: { value: '' } });
    fireEvent.click(getByText('En retard', { selector: 'button' }));
    expect(queryByText('Rédiger le cahier')).toBeNull();
    expect(queryByText('Maquettes')).not.toBeNull();
  });

  it('propose de réessayer quand le chargement échoue', async () => {
    apiMock.getTaches.mockRejectedValueOnce(new Error('Réseau indisponible')).mockResolvedValue(taches);
    const { findByText, getByText } = monter();

    await findByText('Réseau indisponible');
    fireEvent.click(getByText('Réessayer'));
    await findByText('Rédiger le cahier');
  });
});
