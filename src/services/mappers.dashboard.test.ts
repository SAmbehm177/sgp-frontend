import { describe, expect, it } from 'vitest';
import { mapDashboard } from './mappers';
import type { RawDashboard } from './apiTypes';

const brut: RawDashboard = {
  date: '2026-11-18',
  projets: [
    {
      id: 7,
      titre: 'Refonte',
      statut: 'en cours',
      date_debut: '2026-01-01',
      date_fin: '2026-12-31',
      taches_actives_count: 4,
      taches_terminees_count: 2,
      membres_actifs: [{ id: 3, nom: 'Martin', prenom: 'Alex', pivot: { fonction_id: 1 } }],
      chefs_noms: ['Alex Martin'],
    },
  ],
  stats: {
    '7': { total_taches: 4, en_cours: 2, terminees: 2, annulees: 0, en_retard: 1, taux_avancement: 50 },
  },
  taches: [
    {
      id: 11,
      projet_id: 7,
      titre: 'Écrire',
      statut: 'terminé',
      priorite: 'haute',
      date_echeance: '2026-11-20',
      responsable_id: 3,
      responsable: { id: 3, nom: 'Martin', prenom: 'Alex' },
      projet: { id: 7, titre: 'Refonte', statut: 'en cours' },
    },
  ],
  taches_tronquees: false,
  membres: { '7': [{ id: 3, nom: 'Martin', prenom: 'Alex', pivot: { fonction_id: 1, projet_id: 7 } }] },
  fonctions: [{ id: 1, libelle: 'Chef de projet' }],
  notifications_non_lues: 2,
  agregats: {
    global: { termine: 2, en_cours: 2, en_retard: 1, annule: 0, actives: 4, taux: 50 },
    mensuel: [{ mois: '2026-11', planifiees: 4, realisees: 2, taux_cumule: 50 }],
  },
};

describe('mapDashboard', () => {
  it('convertit le payload du serveur vers les types du front', () => {
    const donnees = mapDashboard(brut);

    expect(donnees.projets[0]).toMatchObject({ id: 7, statut: 'en_cours', ma_fonction_id: 1, chefs_noms: ['Alex Martin'] });
    expect(donnees.taches[0]).toMatchObject({ id: 11, statut: 'termine', priorite: 'haute' });
    expect(donnees.statsParProjet[7].taches_en_retard).toBe(1);
    expect(donnees.membresParProjet[7][0]).toMatchObject({
      personnel_id: 3,
      fonction_id: 1,
      statut: 'actif',
      fonction: { libelle: 'Chef de projet' },
    });
    expect(donnees.notificationsNonLues).toBe(2);
    expect(donnees.agregats.mensuel[0]).toEqual({ mois: '2026-11', planifiees: 4, realisees: 2, tauxCumule: 50 });
  });

  it('accepte des listes vides (stats et membres sans projet)', () => {
    const donnees = mapDashboard({ ...brut, projets: [], taches: [], stats: {}, membres: {} });

    expect(donnees.projets).toEqual([]);
    expect(donnees.statsParProjet).toEqual({});
    expect(donnees.membresParProjet).toEqual({});
  });
});
