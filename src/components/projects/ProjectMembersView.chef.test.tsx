// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Fonction, MembreProjet, Projet } from '../../types/sgp';

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }),
}));
vi.mock('../../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/api')>()),
  api: { transfererChefProjet: vi.fn(), searchPersonnels: vi.fn().mockResolvedValue([]) },
}));

import { ProjectMembersView } from './ProjectMembersView';

const projet: Projet = {
  id: 9, titre: 'Refonte', description: '', date_debut: '2026-01-01', date_fin_prevue: '2027-01-01',
  statut: 'en_cours', taux_avancement: 0, created_at: '',
};
const fonctions: Fonction[] = [
  { id: 1, libelle: 'Chef de projet' },
  { id: 2, libelle: 'Membre' },
];
const membre = (id: number, prenom: string, fonction_id: number): MembreProjet => ({
  id, projet_id: 9, personnel_id: id, fonction_id, date_affectation: '', date_retrait: null, statut: 'actif',
  fonction: fonctions.find((f) => f.id === fonction_id),
  personnel: { id, nom: 'Durand', prenom, matricule: '', poste: '', user_id: null, created_at: '' },
});
const membres = [membre(1, 'Alice', 1), membre(2, 'Bruno', 2)];

const monter = (isAdmin: boolean) =>
  render(
    <ProjectMembersView projet={projet} membres={membres} fonctions={fonctions} canManage isAdmin={isAdmin} onChanged={() => {}} />
  );

describe('ProjectMembersView : changer de chef de projet', () => {
  afterEach(() => cleanup());

  it('propose « changer de chef » à l’administrateur, sur la ligne du chef uniquement', () => {
    const { getAllByLabelText, queryByLabelText } = monter(true);

    expect(getAllByLabelText(/Changer le chef de projet/)).toHaveLength(1);
    expect(queryByLabelText(/Changer le chef de projet \(actuellement Bruno/)).toBeNull();
  });

  it('ne le propose pas à un chef de projet non administrateur', () => {
    const { queryByLabelText } = monter(false);
    expect(queryByLabelText(/Changer le chef de projet/)).toBeNull();
  });

  it('ouvre la fenêtre de changement de chef', () => {
    const { getByLabelText, getByText } = monter(true);

    fireEvent.click(getByLabelText(/Changer le chef de projet/));

    expect(getByText('Changer de chef de projet', { selector: 'h2,h3' })).toBeTruthy();
  });

  it('oriente vers « changer de chef » quand on édite la fonction du chef', () => {
    const { getByLabelText, getByText } = monter(true);

    fireEvent.click(getByLabelText('Modifier la fonction de Alice Durand'));
    expect(getByText(/Un projet doit toujours avoir un chef/)).toBeTruthy();

    fireEvent.click(getByText('Changer de chef de projet', { selector: 'button' }));
    expect(getByText('Changer de chef de projet', { selector: 'h2,h3' })).toBeTruthy();
  });
});
