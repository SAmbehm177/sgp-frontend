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
  NotificationItem,
  Message,
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
    chefs_noms: Array.isArray(raw.chefs_noms) ? raw.chefs_noms : undefined,
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
    par_priorite: {
      basse: Number(raw.par_priorite?.basse ?? 0),
      moyenne: Number(raw.par_priorite?.moyenne ?? 0),
      haute: Number(raw.par_priorite?.haute ?? 0),
    },
    charge_par_membre: ((raw.charge_par_membre ?? []) as any[]).map((m) => ({
      personnel_id: Number(m.personnel_id),
      total: Number(m.total ?? 0),
      terminees: Number(m.terminees ?? 0),
      en_cours: Number(m.en_cours ?? 0),
      en_retard: Number(m.en_retard ?? 0),
    })),
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

// --- Notifications ---

// Selon la configuration, Laravel peut renvoyer `data` sous forme de texte JSON (parfois encodé deux fois)
function lireDonnees(brut: any): Record<string, any> {
  let data = brut;
  for (let i = 0; i < 2 && typeof data === 'string'; i++) {
    try {
      data = JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data && typeof data === 'object' ? data : {};
}

const TYPES_CONNUS: NotificationItem['type'][] = [
  'tache_affectee',
  'tache_statut_modifie',
  'membre_ajoute',
  'membre_retire',
  'nouveau_message',
];

const TYPE_PAR_CLASSE: Record<string, NotificationItem['type']> = {
  TacheAffectee: 'tache_affectee',
  TacheStatutModifie: 'tache_statut_modifie',
  MembreAjoute: 'membre_ajoute',
  MembreRetire: 'membre_retire',
  NouveauMessage: 'nouveau_message',
};

const MESSAGE_PAR_TYPE: Record<NotificationItem['type'], string> = {
  tache_affectee: 'Une tâche vous a été affectée.',
  tache_statut_modifie: "Le statut d'une tâche a changé.",
  membre_ajoute: 'Vous avez été ajouté à un projet.',
  membre_retire: "Vous avez été retiré d'un projet.",
  nouveau_message: 'Nouveau message dans la discussion d’un projet.',
  autre: '',
};

// Notification Laravel : { id, type, data: { type, message, tache_id, projet_id }, read_at, created_at }
export function mapNotification(raw: any): NotificationItem {
  const data = lireDonnees(raw.data);
  const classe = String(raw.type ?? '').split('\\').pop() ?? '';

  const type: NotificationItem['type'] = TYPES_CONNUS.includes(data.type)
    ? data.type
    : TYPE_PAR_CLASSE[classe] ?? 'autre';

  return {
    id: String(raw.id),
    type,
    message: data.message || MESSAGE_PAR_TYPE[type],
    lue: raw.read_at !== null && raw.read_at !== undefined,
    created_at: raw.created_at ?? '',
    projet_id: data.projet_id !== undefined && data.projet_id !== null ? Number(data.projet_id) : undefined,
    projet_titre: typeof data.projet_titre === 'string' ? data.projet_titre : undefined,
    tache_id: data.tache_id !== undefined && data.tache_id !== null ? Number(data.tache_id) : undefined,
  };
}

// --- Messages (discussion d'un projet) ---

// L'auteur s'affiche avec le nom de sa fiche personnel, à défaut avec le nom du compte (admin)
export function mapMessage(raw: any): Message {
  const p = raw.auteur?.personnel;
  return {
    id: raw.id,
    projet_id: raw.projet_id,
    user_id: raw.user_id,
    contenu: raw.contenu,
    auteur_nom: p ? `${p.prenom} ${p.nom}` : raw.auteur?.name ?? 'Utilisateur',
    created_at: raw.created_at ?? '',
  };
}
