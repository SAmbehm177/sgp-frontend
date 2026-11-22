// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Fonction, MembreProjet, Projet } from '../../../types/sgp';

const { toast, apiMock } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  apiMock: { transfererChefProjet: vi.fn() },
}));

vi.mock('../../../context/ToastContext', () => ({ useToast: () => toast }));
vi.mock('../../../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../services/api')>()),
  api: apiMock,
}));

import { ChangeChefModal } from './ChangeChefModal';

const projet: Projet = {
  id: 9, titre: 'Refonte', description: '', date_debut: '2026-01-01', date_fin_prevue: '2027-01-01',
  statut: 'en_cours', taux_avancement: 0, created_at: '',
};
const fonctions: Fonction[] = [
  { id: 1, libelle: 'Chef de projet' },
  { id: 2, libelle: 'Membre' },
  { id: 3, libelle: 'Expert technique' },
];
const membre = (id: number, prenom: string, fonction_id: number): MembreProjet => ({
  id, projet_id: 9, personnel_id: id, fonction_id, date_affectation: '', date_retrait: null, statut: 'actif',
  fonction: fonctions.find((f) => f.id === fonction_id),
  personnel: { id, nom: 'Durand', prenom, matricule: '', poste: '', user_id: null, created_at: '' },
});
const ancien = membre(1, 'Alice', 1);
const membres = [ancien, membre(2, 'Bruno', 2), membre(3, 'Chloé', 3)];

function monter(over: { membres?: MembreProjet[] } = {}) {
  const onClose = vi.fn();
  const onChanged = vi.fn();
  const rendu = render(
    <ChangeChefModal
      projet={projet}
      ancienChef={ancien}
      membres={over.membres ?? membres}
      fonctions={fonctions}
      onClose={onClose}
      onChanged={onChanged}
    />
  );
  return { ...rendu, onClose, onChanged };
}

describe('ChangeChefModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.transfererChefProjet.mockResolvedValue(undefined);
  });
  afterEach(() => cleanup());

  it('propose tous les membres sauf le chef actuel, et garde l’ancien chef dans le projet par défaut', () => {
    const { getByLabelText, container } = monter();
    const options = Array.from((getByLabelText(/Nouveau chef de projet/) as HTMLSelectElement).options).map((o) => o.textContent);

    expect(options).toEqual(['Sélectionnez un membre actif...', 'Bruno Durand (Membre)', 'Chloé Durand (Expert technique)']);
    expect((container.querySelector('input[type="radio"]') as HTMLInputElement).checked).toBe(true);
    // « Membre » est proposée d'abord ; « Chef de projet » n'est pas proposée à l'ancien chef
    const fonctionsAncien = Array.from((getByLabelText('Fonction de l’ancien chef') as HTMLSelectElement).options).map((o) => o.textContent);
    expect(fonctionsAncien).toEqual(['Membre', 'Expert technique']);
    expect((getByLabelText('Fonction de l’ancien chef') as HTMLSelectElement).value).toBe('2');
  });

  it('ne peut pas être validé tant qu’aucun successeur n’est choisi', () => {
    const { getByText } = monter();
    expect((getByText('Changer de chef', { selector: 'button' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('change le chef en gardant l’ancien dans le projet avec la fonction choisie', async () => {
    const { getByLabelText, getByText, onChanged, onClose } = monter();

    fireEvent.change(getByLabelText(/Nouveau chef de projet/), { target: { value: '2' } });
    fireEvent.change(getByLabelText('Fonction de l’ancien chef'), { target: { value: '3' } });
    expect(getByText(/Après validation/).textContent).toContain('restera dans le projet (Expert technique)');
    fireEvent.click(getByText('Changer de chef', { selector: 'button' }));

    await waitFor(() => expect(apiMock.transfererChefProjet).toHaveBeenCalledWith(9, 1, 2, {
      retirerAncienChef: false,
      fonctionAncienChefId: 3,
    }));
    expect(toast.success).toHaveBeenCalledWith('Chef de projet changé', expect.stringContaining('Alice Durand reste membre du projet'));
    expect(onChanged).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('peut aussi retirer l’ancien chef du projet', async () => {
    const { getByLabelText, getByText, container } = monter();

    fireEvent.change(getByLabelText(/Nouveau chef de projet/), { target: { value: '3' } });
    fireEvent.click(container.querySelectorAll('input[type="radio"]')[1]);
    expect((getByLabelText('Fonction de l’ancien chef') as HTMLSelectElement).disabled).toBe(true);
    fireEvent.click(getByText('Changer de chef', { selector: 'button' }));

    await waitFor(() => expect(apiMock.transfererChefProjet).toHaveBeenCalledWith(9, 1, 3, {
      retirerAncienChef: true,
      fonctionAncienChefId: undefined,
    }));
    expect(toast.success).toHaveBeenCalledWith('Chef de projet changé', expect.stringContaining('a été retiré du projet'));
  });

  it('affiche l’erreur du serveur et laisse la fenêtre ouverte', async () => {
    apiMock.transfererChefProjet.mockRejectedValue(
      Object.assign(new Error('Ce membre a encore des tâches en cours'), { status: 422 })
    );
    const { getByLabelText, getByText, findByRole, onClose, onChanged } = monter();

    fireEvent.change(getByLabelText(/Nouveau chef de projet/), { target: { value: '2' } });
    fireEvent.click(getByText('Changer de chef', { selector: 'button' }));

    expect((await findByRole('alert')).textContent).toContain('Ce membre a encore des tâches en cours');
    expect(onClose).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('explique qu’il faut d’abord ajouter un membre quand le chef est seul', () => {
    const { getByRole, queryByText } = monter({ membres: [ancien] });

    expect(getByRole('alert').textContent).toContain('Ajoutez d’abord un autre membre');
    expect(queryByText('Changer de chef', { selector: 'button' })).toBeNull();
  });
});
