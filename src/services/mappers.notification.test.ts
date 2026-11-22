import { describe, expect, it } from 'vitest';
import { mapNotification } from './mappers';
import { ongletNotification, titreNotification } from '../utils/format';

describe('notification « fonction modifiée »', () => {
  const brute = {
    id: 'abc',
    type: 'App\\Notifications\\FonctionModifiee',
    data: {
      type: 'fonction_modifiee',
      projet_id: 7,
      projet_titre: 'Refonte',
      fonction: 'Membre',
      message: 'Votre fonction dans le projet « Refonte » est maintenant « Membre ».',
    },
    read_at: null,
    created_at: '2026-11-19T10:00:00Z',
  };

  it('est reconnue par son type, avec le message du serveur', () => {
    expect(mapNotification(brute)).toMatchObject({
      type: 'fonction_modifiee',
      message: 'Votre fonction dans le projet « Refonte » est maintenant « Membre ».',
      projet_id: 7,
      lue: false,
    });
  });

  it('est reconnue par la classe Laravel quand le type manque dans les données', () => {
    expect(mapNotification({ ...brute, data: { projet_id: 7 } })).toMatchObject({
      type: 'fonction_modifiee',
      message: 'Votre fonction dans un projet a changé.',
    });
  });

  it('a son propre titre et ouvre l’onglet de l’équipe', () => {
    expect(titreNotification('fonction_modifiee')).toBe('Fonction modifiée');
    expect(ongletNotification('fonction_modifiee')).toBe('membres');
  });
});
