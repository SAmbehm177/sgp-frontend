import { describe, expect, it } from 'vitest';
import { repartitionGlobale, repartitionProjet, serieMensuelle, libelleMois } from './avancement';
import { Projet, Tache } from '../types/sgp';

const projet = (compteurs: Partial<Projet>): Projet => ({
  id: 1,
  titre: 'P',
  description: '',
  date_debut: '2026-01-01',
  date_fin_prevue: '2026-12-31',
  statut: 'en_cours',
  created_at: '',
  ...compteurs,
});

const tache = (statut: Tache['statut'], date_echeance: string): Tache => ({
  id: 1,
  projet_id: 1,
  titre: 'T',
  description: '',
  statut,
  priorite: 'moyenne',
  date_debut: '2026-01-01',
  date_echeance,
  responsable_id: 1,
  created_at: '',
  updated_at: '',
});

describe('repartitionProjet', () => {
  it('sépare les tâches en retard des tâches en cours et calcule le taux sur les tâches actives', () => {
    const r = repartitionProjet(
      projet({ taches_terminees: 3, taches_en_cours: 5, taches_en_retard: 2, taches_annulees: 4 })
    );

    expect(r).toEqual({ termine: 3, enCours: 3, enRetard: 2, annule: 4, actives: 8, taux: 38 });
  });

  it('gère un projet sans compteurs ni tâches', () => {
    expect(repartitionProjet(projet({}))).toMatchObject({ actives: 0, taux: 0 });
  });

  it('ne produit jamais de nombre négatif si les compteurs sont incohérents', () => {
    expect(repartitionProjet(projet({ taches_en_cours: 1, taches_en_retard: 3 })).enCours).toBe(0);
  });
});

describe('repartitionGlobale', () => {
  it('additionne les répartitions de plusieurs projets', () => {
    const r = repartitionGlobale([
      projet({ taches_terminees: 2, taches_en_cours: 2 }),
      projet({ id: 2, taches_terminees: 2, taches_en_cours: 2, taches_en_retard: 1 }),
    ]);

    expect(r).toMatchObject({ termine: 4, enCours: 3, enRetard: 1, actives: 8, taux: 50 });
  });
});

describe('serieMensuelle', () => {
  it('renvoie une série vide sans tâche exploitable', () => {
    expect(serieMensuelle([])).toEqual([]);
    expect(serieMensuelle([tache('annule', '2026-11-10')])).toEqual([]);
  });

  it('comble les mois sans échéance et cumule le taux de réalisation', () => {
    const serie = serieMensuelle([
      tache('termine', '2026-09-10'),
      tache('en_cours', '2026-09-20'),
      tache('termine', '2026-11-05'),
    ]);

    expect(serie.map((m) => m.cle)).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(serie.map((m) => m.planifiees)).toEqual([2, 0, 1]);
    expect(serie.map((m) => m.realisees)).toEqual([1, 0, 1]);
    expect(serie.map((m) => m.tauxCumule)).toEqual([50, 50, 67]);
  });

  it('garde les derniers mois mais calcule le cumul sur toute la période', () => {
    const serie = serieMensuelle([tache('termine', '2025-01-10'), tache('en_cours', '2026-11-10')], 3);

    expect(serie.map((m) => m.cle)).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(serie[2].tauxCumule).toBe(50);
  });
});

describe('libelleMois', () => {
  it('formate en français', () => {
    expect(libelleMois('2026-02')).toBe('Fév 26');
  });
});
