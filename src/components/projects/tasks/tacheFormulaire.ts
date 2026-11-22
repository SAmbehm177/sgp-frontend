import type { Projet, Tache, TaskPriority } from '../../../types/sgp';
import { formatJour } from '../../../utils/format';
import { tacheEnRetard } from '../../../utils/taches';

export const PRIORITES: { id: TaskPriority; label: string }[] = [
  { id: 'basse', label: 'Basse' },
  { id: 'moyenne', label: 'Moyenne' },
  { id: 'haute', label: 'Haute' },
];

export const FORMULAIRE_VIDE = {
  titre: '',
  description: '',
  responsable_id: '' as number | '',
  priorite: 'moyenne' as TaskPriority,
  date_debut: '',
  date_echeance: '',
};
export type ValeursFormulaire = typeof FORMULAIRE_VIDE;
export type ChampFormulaire = keyof ValeursFormulaire;
export type ErreursFormulaire = Partial<Record<ChampFormulaire, string>>;

type BornesProjet = Pick<Projet, 'date_debut' | 'date_fin_prevue'>;

/** Valeurs du formulaire d'édition d'une tâche existante. */
export function formulaireDepuisTache(t: Tache): ValeursFormulaire {
  return {
    titre: t.titre,
    description: t.description,
    responsable_id: t.responsable_id,
    priorite: t.priorite,
    date_debut: t.date_debut ?? '',
    date_echeance: t.date_echeance,
  };
}

/** Date proposée par défaut : ramenée dans les bornes du projet. */
export const borner = (jour: string, projet: BornesProjet): string =>
  jour < projet.date_debut ? projet.date_debut : jour > projet.date_fin_prevue ? projet.date_fin_prevue : jour;

/** Erreurs de saisie (vide si le formulaire est valide). Les dates doivent rester dans la période du projet. */
export function validerFormulaire(form: ValeursFormulaire, projet: BornesProjet): ErreursFormulaire {
  const errors: ErreursFormulaire = {};
  const intervalle = `Les dates doivent être comprises entre le ${formatJour(projet.date_debut)} et le ${formatJour(
    projet.date_fin_prevue
  )} (période du projet).`;

  if (!form.titre.trim()) errors.titre = 'Le titre est obligatoire.';
  if (!form.description.trim()) errors.description = 'La description est obligatoire.';
  if (form.responsable_id === '') errors.responsable_id = 'Désignez un responsable parmi les membres du projet.';
  if (!form.date_debut) errors.date_debut = 'La date de début est obligatoire.';
  if (!form.date_echeance) errors.date_echeance = "La date d'échéance est obligatoire.";
  if (form.date_debut && form.date_echeance && form.date_echeance < form.date_debut) {
    errors.date_echeance = "L'échéance ne peut pas précéder la date de début.";
  }
  if (form.date_debut && (form.date_debut < projet.date_debut || form.date_debut > projet.date_fin_prevue)) {
    errors.date_debut = intervalle;
  }
  if (
    form.date_echeance &&
    (form.date_echeance < projet.date_debut || form.date_echeance > projet.date_fin_prevue) &&
    !errors.date_echeance
  ) {
    errors.date_echeance = intervalle;
  }
  return errors;
}

/** Pourquoi on ne peut pas créer de tâche (null si c'est possible). */
export function raisonBlocageCreation({
  projet,
  isAdmin,
  nbMembres,
}: {
  projet: Pick<Projet, 'statut'>;
  isAdmin: boolean;
  nbMembres: number;
}): string | null {
  if (projet.statut === 'annule') {
    return "Ce projet est annulé : il n'est plus possible d'y ajouter des tâches.";
  }
  if (projet.statut === 'termine') {
    return isAdmin
      ? 'Ce projet est terminé : rouvrez-le avant d’y ajouter des tâches.'
      : 'Ce projet est terminé : contactez un administrateur pour le rouvrir avant d’y ajouter des tâches.';
  }
  if (nbMembres === 0) {
    return "Ajoutez d'abord au moins un membre à l'équipe : une tâche est toujours confiée à un membre du projet.";
  }
  return null;
}

export interface FiltresTaches {
  search: string;
  statut: string;
  priorite: string;
  responsable: string;
  enRetard: boolean;
}

export const FILTRES_VIDES: FiltresTaches = {
  search: '',
  statut: 'all',
  priorite: 'all',
  responsable: 'all',
  enRetard: false,
};

export function filtrerTachesProjet(taches: Tache[], filtres: FiltresTaches, today: string): Tache[] {
  const terme = filtres.search.toLowerCase();
  return taches.filter((t) => {
    const matchesSearch = t.titre.toLowerCase().includes(terme) || t.description.toLowerCase().includes(terme);
    const matchesStatus = filtres.statut === 'all' || t.statut === filtres.statut;
    const matchesPriority = filtres.priorite === 'all' || t.priorite === filtres.priorite;
    const matchesResponsible =
      filtres.responsable === 'all' || t.responsable_id === Number(filtres.responsable);
    const matchesOverdue = !filtres.enRetard || tacheEnRetard(t, today);
    return matchesSearch && matchesStatus && matchesPriority && matchesResponsible && matchesOverdue;
  });
}
