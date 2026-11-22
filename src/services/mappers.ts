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
  DonneesDashboard,
} from '../types/sgp';
import type {
  RawAuthPayload,
  RawDashboard,
  RawMembre,
  RawMessage,
  RawNotification,
  RawPersonnel,
  RawProjet,
  RawStatistiques,
  RawTache,
  RawUser,
} from './apiTypes';

// --- Petits utilitaires de conversion ---

// Les dates arrivent en 'AAAA-MM-JJ' (ou en ISO complet) : on garde seulement le jour
const jour = (valeur: unknown): string => (valeur ? String(valeur).slice(0, 10) : '');

// Compteur facultatif : absent -> undefined (et non 0), pour distinguer « inconnu » de « zéro »
const compteur = (valeur: number | string | undefined): number | undefined =>
  valeur !== undefined ? Number(valeur) : undefined;

const nomComplet = (p: { prenom: string; nom: string }): string => `${p.prenom} ${p.nom}`;

// --- Personnel & comptes ---

export function mapPersonnel(raw: RawPersonnel | null | undefined, userId?: number): Personnel | null {
  if (!raw) return null;
  return {
    id: raw.id,
    nom: raw.nom,
    prenom: raw.prenom,
    matricule: raw.matricule ?? '',
    poste: raw.poste ?? '',
    user_id: raw.user_id ?? userId ?? null,
    created_at: raw.created_at ?? '',
    updated_at: raw.updated_at ?? undefined,
  };
}

/** Variante pour les listes : écarte les entrées vides. */
export function mapPersonnels(items: Array<RawPersonnel | null | undefined>): Personnel[] {
  return items.map((p) => mapPersonnel(p)).filter((p): p is Personnel => p !== null);
}

export function mapUser(raw: RawUser): User {
  // Le backend stocke status = 'actif' | 'inactif' ; le front manipule is_active (booléen)
  const isActive = typeof raw.is_active === 'boolean' ? raw.is_active : raw.statut === 'actif';

  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    is_active: isActive,
    must_change_password: !!raw.must_change_password,
    personnel_id: raw.personnel?.id ?? raw.personnel_id ?? null,
    poste: raw.personnel?.poste ?? undefined,
    matricule: raw.personnel?.matricule ?? undefined,
    created_at: raw.created_at ?? '',
    updated_at: raw.updated_at ?? undefined,
  };
}

/**
 * Accepte { token, user: {..., personnel?} } (login) ou { user } / user direct (me).
 */
export function mapAuthPayload(raw: RawAuthPayload | RawUser): {
  user: User;
  personnel: Personnel | null;
  token?: string;
} {
  const enveloppe = raw as RawAuthPayload;
  const rawUser = enveloppe.user ?? (raw as RawUser);
  const user = mapUser(rawUser);
  const personnel = mapPersonnel(rawUser.personnel ?? enveloppe.personnel, user.id);
  return { user, personnel, token: enveloppe.token ?? enveloppe.access_token };
}

// --- Projets ---

// Statuts du backend ('en cours' | 'terminé' | 'annulé') -> statuts du front
const STATUT_PROJET: Record<string, ProjectStatus> = {
  'en cours': 'en_cours',
  'terminé': 'termine',
  'annulé': 'annule',
};

export function mapProjet(raw: RawProjet): Projet {
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
    membres_count: compteur(raw.membres_count),
    taches_en_cours: compteur(raw.taches_en_cours_count),
    taches_terminees: compteur(raw.taches_terminees_count),
    taches_annulees: compteur(raw.taches_annulees_count),
    taches_en_retard: compteur(raw.taches_en_retard_count),
    chefs_noms: Array.isArray(raw.chefs_noms) ? raw.chefs_noms : undefined,
    created_at: raw.created_at ?? '',
    updated_at: raw.updated_at ?? undefined,
  };
}

/** Projet d'une liste : l'API joint, pour un membre, sa propre affectation (donc sa fonction dans le projet). */
export function mapProjetListe(raw: RawProjet): Projet {
  return { ...mapProjet(raw), ma_fonction_id: raw.membres_actifs?.[0]?.pivot?.fonction_id };
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
export function mapMembre(raw: RawMembre, projetId: number, fonctions: Fonction[]): MembreProjet {
  const pivot = raw.pivot;
  const retire = !!pivot?.date_retrait;

  return {
    id: raw.id,
    projet_id: pivot?.projet_id ?? projetId,
    personnel_id: raw.id,
    fonction_id: pivot?.fonction_id ?? 0,
    date_affectation: jour(pivot?.created_at),
    date_retrait: retire ? jour(pivot?.date_retrait) : null,
    statut: retire ? 'retire' : 'actif',
    fonction: fonctions.find((f) => f.id === pivot?.fonction_id),
    personnel: mapPersonnel(raw) ?? undefined,
  };
}

// --- Statistiques d'un projet ---

export function mapStatistiques(raw: RawStatistiques): StatistiquesProjet {
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
    charge_par_membre: (raw.charge_par_membre ?? []).map((m) => ({
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

export function mapTache(raw: RawTache): Tache {
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
function lireDonnees(brut: unknown): Record<string, unknown> {
  let data = brut;
  for (let i = 0; i < 2 && typeof data === 'string'; i++) {
    try {
      data = JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
}

const TYPES_CONNUS: ReadonlyArray<NotificationItem['type']> = [
  'tache_affectee',
  'tache_statut_modifie',
  'membre_ajoute',
  'membre_retire',
  'fonction_modifiee',
  'nouveau_message',
];

const estTypeConnu = (valeur: unknown): valeur is NotificationItem['type'] =>
  TYPES_CONNUS.includes(valeur as NotificationItem['type']);

const TYPE_PAR_CLASSE: Record<string, NotificationItem['type']> = {
  TacheAffectee: 'tache_affectee',
  TacheStatutModifie: 'tache_statut_modifie',
  MembreAjoute: 'membre_ajoute',
  MembreRetire: 'membre_retire',
  FonctionModifiee: 'fonction_modifiee',
  NouveauMessage: 'nouveau_message',
};

const MESSAGE_PAR_TYPE: Record<NotificationItem['type'], string> = {
  tache_affectee: 'Une tâche vous a été affectée.',
  tache_statut_modifie: "Le statut d'une tâche a changé.",
  membre_ajoute: 'Vous avez été ajouté à un projet.',
  membre_retire: "Vous avez été retiré d'un projet.",
  fonction_modifiee: 'Votre fonction dans un projet a changé.',
  nouveau_message: 'Nouveau message dans la discussion d’un projet.',
  autre: '',
};

const nombreOuUndefined = (valeur: unknown): number | undefined =>
  valeur !== undefined && valeur !== null ? Number(valeur) : undefined;

// Notification Laravel : { id, type, data: { type, message, tache_id, projet_id }, read_at, created_at }
export function mapNotification(raw: RawNotification): NotificationItem {
  const data = lireDonnees(raw.data);
  const classe = String(raw.type ?? '').split('\\').pop() ?? '';
  const type: NotificationItem['type'] = estTypeConnu(data.type)
    ? data.type
    : (TYPE_PAR_CLASSE[classe] ?? 'autre');

  return {
    id: String(raw.id),
    type,
    message: (typeof data.message === 'string' && data.message) || MESSAGE_PAR_TYPE[type],
    lue: raw.read_at !== null && raw.read_at !== undefined,
    created_at: raw.created_at ?? '',
    projet_id: nombreOuUndefined(data.projet_id),
    projet_titre: typeof data.projet_titre === 'string' ? data.projet_titre : undefined,
    tache_id: nombreOuUndefined(data.tache_id),
  };
}

// --- Messages (discussion d'un projet) ---

// L'auteur s'affiche avec le nom de sa fiche personnel, à défaut avec le nom du compte (admin)
export function mapMessage(raw: RawMessage): Message {
  const p = raw.auteur?.personnel;
  const d = raw.destinataire?.personnel;
  return {
    id: raw.id,
    projet_id: raw.projet_id,
    user_id: raw.user_id,
    destinataire_id: raw.destinataire_id ?? null,
    destinataire_nom: d ? nomComplet(d) : (raw.destinataire?.name ?? null),
    contenu: raw.contenu,
    auteur_nom: p ? nomComplet(p) : (raw.auteur?.name ?? 'Utilisateur'),
    created_at: raw.created_at ?? '',
  };
}

// --- Tableau de bord ---

// JSON : un objet indexé par identifiant (les clés deviennent du texte) -> Record<number, …>
const parIdentifiant = <A, B>(objet: Record<string, A>, convertir: (valeur: A, id: number) => B): Record<number, B> =>
  Object.fromEntries(Object.entries(objet).map(([id, valeur]) => [Number(id), convertir(valeur, Number(id))]));

export function mapDashboard(raw: RawDashboard): DonneesDashboard {
  return {
    date: raw.date,
    projets: raw.projets.map(mapProjetListe),
    taches: raw.taches.map(mapTache),
    tachesTronquees: raw.taches_tronquees,
    statsParProjet: parIdentifiant(raw.stats, mapStatistiques),
    membresParProjet: parIdentifiant(raw.membres, (membres, projetId) =>
      membres.map((m) => mapMembre(m, projetId, raw.fonctions))
    ),
    fonctions: raw.fonctions,
    notificationsNonLues: raw.notifications_non_lues,
    agregats: {
      global: raw.agregats.global,
      mensuel: raw.agregats.mensuel.map((m) => ({
        mois: m.mois,
        planifiees: m.planifiees,
        realisees: m.realisees,
        tauxCumule: m.taux_cumule,
      })),
    },
  };
}
