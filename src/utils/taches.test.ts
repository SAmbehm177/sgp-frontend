import { describe, expect, it } from 'vitest';
import { tacheEnCoursDansLesDelais, tacheEnRetard } from './taches';

const today = '2026-11-18';

describe('tacheEnRetard', () => {
  it('est vrai pour une tâche en cours dont l’échéance est passée', () => {
    expect(tacheEnRetard({ statut: 'en_cours', date_echeance: '2026-11-17' }, today)).toBe(true);
  });

  it('est faux le jour de l’échéance', () => {
    expect(tacheEnRetard({ statut: 'en_cours', date_echeance: today }, today)).toBe(false);
    expect(tacheEnCoursDansLesDelais({ statut: 'en_cours', date_echeance: today }, today)).toBe(true);
  });

  it('ignore les tâches terminées ou annulées', () => {
    expect(tacheEnRetard({ statut: 'termine', date_echeance: '2026-01-01' }, today)).toBe(false);
    expect(tacheEnRetard({ statut: 'annule', date_echeance: '2026-01-01' }, today)).toBe(false);
  });
});
