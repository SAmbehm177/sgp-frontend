/**
 * Mappers API Laravel -> types du front.
 * Un seul endroit où l'on traduit les noms de colonnes du backend
 * (ex: users.status = 'actif'|'inactif') vers les types de src/types/sgp.ts.
 */
import {
  User,
  Personnel,
  Projet,
  ProjectStatus,
  MembreProjet,
  Fonction,
  StatistiquesProjet,
  Tache,
  TaskStatus,
  TaskPriority,
} from '../types/sgp';

export function mapPersonnel(raw: any, userId?: number): Personnel | null {
  if (!raw) return null;
  return {
    id: raw.id,
    nom: raw.nom,
    prenom: raw.prenom,
    poste: raw.poste ?? '',
    user_id: raw.user_id ?? userId ?? 0,
    created_at: raw.created_at ?? '',
    updated_at: raw.updated_at ?? undefined,
  };
}

export function mapUser(raw: any): User {
  // Le backend stocke status = 'actif' | 'inactif' ; le front manipule is_active (booléen)
  const isActive =
    typeof raw.is_active === 'boolean' ? raw.is_active : raw.statut === 'actif';

  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    is_active: isActive,
    personnel_id: raw.personnel?.id ?? raw.personnel_id ?? null,
    poste: raw.personnel?.poste ?? undefined,
    created_at: raw.created_at ?? '',
    updated_at: raw.updated_at ?? undefined,
  };
}

/**
 * Accepte { token, user: {..., personnel?} } (login) ou { user } / user direct (me).
 */
export function mapAuthPayload(raw: any): {
  user: User;
  personnel: Personnel | null;
  token?: string;
} {
  const rawUser = raw.user ?? raw;
  const user = mapUser(rawUser);
  const personnel = mapPersonnel(rawUser.personnel ?? raw.personnel, user.id);
  return { user, personnel, token: raw.token ?? raw.access_token };
}

// --- Projets ---

// Statuts du backend ('en cours' | 'terminé' | 'annulé') -> statuts du front
const STATUT_PROJET: Record<string, ProjectStatus> = {
  'en cours': 'en_cours',
  'terminé': 'termine',
  'annulé': 'annule',
};

// Les dates arrivent en 'AAAA-MM-JJ' (ou en ISO complet) : on garde seulement le jour
const jour = (valeur: any): string => (valeur ? String(valeur).slice(0, 10) : '');

export function mapProjet(raw: any): Projet {
  const actives = Number(raw.taches_actives_count ?? 0);
  const terminees = Number(raw.taches_terminees_count ?? 0);

  return {
    id: raw.id,
    titre: raw.titre,
    description: raw.description ?? '',
    date_debut: jour(raw.date_debut),
    date_fin_prevue: jour(raw.date_fin),
    statut: STATUT_PROJET[raw.statut] ?? 'en_cours',
    taux_avancement: actives > 0 ? Math.round((terminees / actives) * 100) : 0,
    membres_count: raw.membres_count !== undefined ? Number(raw.membres_count) : undefined,
    taches_en_cours: raw.taches_en_cours_count !== undefined ? Number(raw.taches_en_cours_count) : undefined,
    taches_terminees: raw.taches_terminees_count !== undefined ? Number(raw.taches_terminees_count) : undefined,
    taches_annulees: raw.taches_annulees_count !== undefined ? Number(raw.taches_annulees_count) : undefined,
    taches_en_retard: raw.taches_en_retard_count !== undefined ? Number(raw.taches_en_retard_count) : undefined,
    created_at: raw.created_at ?? '',
    updated_at: raw.updated_at ?? undefined,
  };
}

// Statuts du front -> statuts attendus par le backend (pas d'équivalent pour 'suspendu')
export const STATUT_PROJET_VERS_API: Record<ProjectStatus, string> = {
  en_cours: 'en cours',
  termine: 'terminé',
  suspendu: 'en cours',
  annule: 'annulé',
};

// --- Équipe d'un projet ---

// Un élément de `membres_actifs` = une fiche personnel + son `pivot` (fonction, retrait)
export function mapMembre(raw: any, projetId: number, fonctions: Fonction[]): MembreProjet {
  const pivot = raw.pivot ?? {};
  const retire = !!pivot.date_retrait;

  return {
    id: raw.id,
    projet_id: pivot.projet_id ?? projetId,
    personnel_id: raw.id,
    fonction_id: pivot.fonction_id,
    date_affectation: jour(pivot.created_at),
    date_retrait: retire ? jour(pivot.date_retrait) : null,
    statut: retire ? 'retire' : 'actif',
    fonction: fonctions.find((f) => f.id === pivot.fonction_id),
    personnel: mapPersonnel(raw) ?? undefined,
  };
}

// --- Statistiques d'un projet ---

export function mapStatistiques(raw: any): StatistiquesProjet {
  return {
    taux_avancement: Number(raw.taux_avancement ?? 0),
    total_taches: Number(raw.total_taches ?? 0),
    taches_terminees: Number(raw.terminees ?? 0),
    taches_en_cours: Number(raw.en_cours ?? 0),
    taches_annulees: Number(raw.annulees ?? 0),
    taches_en_retard: Number(raw.en_retard ?? 0),
  };
}
// --- Tâches ---

// Statuts du backend ('en cours' | 'terminé' | 'annulé') <-> statuts du front
const STATUT_TACHE: Record<string, TaskStatus> = {
  'en cours': 'en_cours',
  'terminé': 'termine',
  'annulé': 'annule',
};

export const STATUT_TACHE_VERS_API: Record<TaskStatus, string> = {
  en_cours: 'en cours',
  termine: 'terminé',
  annule: 'annulé',
};

export function mapTache(raw: any): Tache {
  return {
    id: raw.id,
    projet_id: raw.projet_id,
    titre: raw.titre,
    description: raw.description ?? '',
    statut: STATUT_TACHE[raw.statut] ?? 'en_cours',
    priorite: (raw.priorite ?? 'moyenne') as TaskPriority,
    date_debut: jour(raw.date_debut),
    date_echeance: jour(raw.date_echeance),
    responsable_id: raw.responsable_id,
    responsable: mapPersonnel(raw.responsable) ?? undefined,
    projet: raw.projet ? mapProjet(raw.projet) : undefined,
    created_at: raw.created_at ?? '',
    updated_at: raw.updated_at ?? '',
  };
}