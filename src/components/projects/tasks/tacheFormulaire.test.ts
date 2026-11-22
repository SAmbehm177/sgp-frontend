import { describe, expect, it } from 'vitest';
import type { Tache } from '../../../types/sgp';
import {
  FILTRES_VIDES,
  FORMULAIRE_VIDE,
  borner,
  filtrerTachesProjet,
  raisonBlocageCreation,
  validerFormulaire,
} from './tacheFormulaire';

const projet = { date_debut: '2026-03-01', date_fin_prevue: '2026-12-31' };
const valide = {
  ...FORMULAIRE_VIDE,
  titre: 'Titre',
  description: 'Description',
  responsable_id: 4,
  date_debut: '2026-04-01',
  date_echeance: '2026-05-01',
};

describe('validerFormulaire', () => {
  it('accepte un formulaire complet', () => {
    expect(validerFormulaire(valide, projet)).toEqual({});
  });

  it('exige titre, description, responsable et dates', () => {
    expect(Object.keys(validerFormulaire(FORMULAIRE_VIDE, projet)).sort()).toEqual(
      ['date_debut', 'date_echeance', 'description', 'responsable_id', 'titre'].sort()
    );
  });

  it('refuse une échéance antérieure au début', () => {
    const erreurs = validerFormulaire({ ...valide, date_echeance: '2026-03-15' }, projet);
    expect(erreurs.date_echeance).toMatch(/précéder/);
  });

  it('refuse des dates hors de la période du projet', () => {
    expect(validerFormulaire({ ...valide, date_debut: '2026-02-01' }, projet).date_debut).toMatch(/période du projet/);
    expect(validerFormulaire({ ...valide, date_echeance: '2027-01-01' }, projet).date_echeance).toMatch(/période du projet/);
  });
});

describe('borner', () => {
  it('ramène la date dans les bornes du projet', () => {
    expect(borner('2026-01-01', projet)).toBe('2026-03-01');
    expect(borner('2027-01-01', projet)).toBe('2026-12-31');
    expect(borner('2026-06-01', projet)).toBe('2026-06-01');
  });
});

describe('raisonBlocageCreation', () => {
  it('explique pourquoi on ne peut pas créer de tâche', () => {
    expect(raisonBlocageCreation({ projet: { statut: 'annule' }, isAdmin: true, nbMembres: 3 })).toMatch(/annulé/);
    expect(raisonBlocageCreation({ projet: { statut: 'termine' }, isAdmin: true, nbMembres: 3 })).toMatch(/rouvrez-le/);
    expect(raisonBlocageCreation({ projet: { statut: 'termine' }, isAdmin: false, nbMembres: 3 })).toMatch(/administrateur/);
    expect(raisonBlocageCreation({ projet: { statut: 'en_cours' }, isAdmin: false, nbMembres: 0 })).toMatch(/membre/);
  });

  it('autorise la création sur un projet en cours avec une équipe', () => {
    expect(raisonBlocageCreation({ projet: { statut: 'en_cours' }, isAdmin: false, nbMembres: 2 })).toBeNull();
  });
});

describe('filtrerTachesProjet', () => {
  const t = (over: Partial<Tache>): Tache => ({
    id: 1, projet_id: 1, titre: 'Rédiger', description: 'le cahier', statut: 'en_cours', priorite: 'haute',
    date_debut: '2026-01-01', date_echeance: '2026-12-01', responsable_id: 1, created_at: '', updated_at: '', ...over,
  });
  const today = '2026-11-18';
  const liste = [
    t({ id: 1 }),
    t({ id: 2, titre: 'Maquettes', description: '', statut: 'termine', priorite: 'basse', responsable_id: 2 }),
    t({ id: 3, titre: 'Recette', date_echeance: '2026-11-01' }),
  ];
  const ids = (f: Partial<typeof FILTRES_VIDES>) => filtrerTachesProjet(liste, { ...FILTRES_VIDES, ...f }, today).map((x) => x.id);

  it('cherche dans le titre et la description, sans tenir compte de la casse', () => {
    expect(ids({ search: 'CAHIER' })).toEqual([1, 3]);
    expect(ids({ search: 'maquet' })).toEqual([2]);
  });

  it('combine statut, priorité, responsable et retard', () => {
    expect(ids({ statut: 'termine' })).toEqual([2]);
    expect(ids({ priorite: 'basse' })).toEqual([2]);
    expect(ids({ responsable: '2' })).toEqual([2]);
    expect(ids({ enRetard: true })).toEqual([3]);
  });
});
