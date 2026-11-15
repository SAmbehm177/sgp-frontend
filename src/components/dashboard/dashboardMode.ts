import { Fonction, Projet } from '../../types/sgp';

// Trois façons de voir le tableau de bord
export type DashboardMode = 'admin' | 'chef' | 'membre';

export const LIBELLE_CHEF = 'Chef de projet';

// « Chef de projet » est une fonction par projet (et non un rôle global) :
// on retrouve les projets dirigés grâce à la fonction que l'API joint à chaque projet (ma_fonction_id).
export function projetsDiriges(projets: Projet[], fonctions: Fonction[]): Projet[] {
  const idChef = fonctions.find((f) => f.libelle === LIBELLE_CHEF)?.id;
  if (idChef === undefined) return [];
  return projets.filter((p) => p.ma_fonction_id === idChef);
}

export function determinerMode(isAdmin: boolean, projets: Projet[], fonctions: Fonction[]): DashboardMode {
  if (isAdmin) return 'admin';
  return projetsDiriges(projets, fonctions).length > 0 ? 'chef' : 'membre';
}
