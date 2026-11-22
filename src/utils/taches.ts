import type { Tache } from '../types/sgp';

type TacheDatee = Pick<Tache, 'statut' | 'date_echeance'>;

/**
 * Une tâche est « en retard » quand elle est encore en cours et que son échéance est passée.
 * `today` : date locale 'AAAA-MM-JJ' (voir getLocalDateString).
 * Règle unique, utilisée par tous les tableaux de bord et listes de tâches.
 */
export const tacheEnRetard = (tache: TacheDatee, today: string): boolean =>
  tache.statut === 'en_cours' && tache.date_echeance < today;

/** En cours et pas encore en retard. */
export const tacheEnCoursDansLesDelais = (tache: TacheDatee, today: string): boolean =>
  tache.statut === 'en_cours' && tache.date_echeance >= today;
