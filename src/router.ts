/**
 * Routage par hash (#/…) : une seule source de vérité, l'URL.
 * Fonctions pures (sans React) : faciles à tester et à relire.
 */
import type { ProjectTab, RouteParams } from './types/sgp';

export type RouteName =
  | 'dashboard'
  | 'projets'
  | 'projects-new'
  | 'project-detail'
  | 'mes-taches'
  | 'notifications'
  | 'administration'
  | 'profile'
  | 'connexion';

export interface Route {
  name: RouteName;
  params: RouteParams;
}

export type NavigateFn = (route: RouteName, params?: RouteParams) => void;

export const ONGLETS_PROJET: readonly ProjectTab[] = [
  'vue-ensemble',
  'taches',
  'membres',
  'discussion',
  'statistiques',
];

// Segment d'URL <-> nom de route (pages sans paramètre)
const SEGMENTS: Partial<Record<RouteName, string>> = {
  dashboard: 'tableau-de-bord',
  projets: 'projets',
  'mes-taches': 'mes-taches',
  notifications: 'notifications',
  administration: 'administration',
  profile: 'profil',
  connexion: 'connexion',
};

const ROUTES_PAR_SEGMENT = new Map<string, RouteName>(
  Object.entries(SEGMENTS).map(([name, segment]) => [segment as string, name as RouteName])
);

/** '#/projets/12/taches' -> { name: 'project-detail', params: { id: 12, tab: 'taches' } } */
export function parseHash(hash: string): Route {
  const [chemin, requete = ''] = hash.replace(/^#\/?/, '').split('?');
  const [base, second, tab] = chemin.split('/');

  if (base === 'projets' && second === 'nouveau') return { name: 'projects-new', params: {} };

  if (base === 'projets' && second) {
    const id = Number(second);
    // Identifiant invalide (#/projets/abc) : on retombe sur la liste plutôt que d'appeler l'API avec NaN
    if (!Number.isInteger(id) || id <= 0) return { name: 'projets', params: {} };
    return {
      name: 'project-detail',
      params: { id, tab: ONGLETS_PROJET.find((o) => o === tab) ?? 'vue-ensemble' },
    };
  }

  const name = ROUTES_PAR_SEGMENT.get(base) ?? 'dashboard';
  const filter = new URLSearchParams(requete).get('filter') ?? undefined;
  return { name, params: filter ? { filter } : {} };
}

/** Inverse de parseHash : { name: 'mes-taches', params: { filter: 'overdue' } } -> '#/mes-taches?filter=overdue' */
export function toHash(name: RouteName, params: RouteParams = {}): string {
  if (name === 'projects-new') return '#/projets/nouveau';
  if (name === 'project-detail') {
    return `#/projets/${params.id}${params.tab ? `/${params.tab}` : ''}`;
  }
  const base = `#/${SEGMENTS[name] ?? SEGMENTS.dashboard}`;
  return params.filter ? `${base}?filter=${encodeURIComponent(params.filter)}` : base;
}
