/**
 * Formes brutes des réponses de l'API Laravel (avant passage par mappers.ts).
 * Si le backend change un nom de colonne, le compilateur signale tout de suite
 * les mappers à adapter.
 */
import type { Fonction, UserRole } from '../types/sgp';

/** Réponse paginée Laravel : { data, last_page, total, … } */
export interface Paginated<T> {
  data: T[];
  last_page?: number;
  total?: number;
}

export interface RawPersonnel {
  id: number;
  nom: string;
  prenom: string;
  matricule?: string | null;
  poste?: string | null;
  user_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RawUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active?: boolean;
  statut?: 'actif' | 'inactif';
  must_change_password?: boolean;
  personnel_id?: number | null;
  personnel?: RawPersonnel | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Login : { token, user }. Me : { user } ou l'utilisateur directement. */
export interface RawAuthPayload {
  token?: string;
  access_token?: string;
  user?: RawUser;
  personnel?: RawPersonnel | null;
}

/** Ligne de la table pivot projet <-> personnel */
export interface RawPivot {
  projet_id?: number;
  fonction_id: number;
  created_at?: string | null;
  date_retrait?: string | null;
}

/** Un membre = une fiche personnel + son affectation (pivot) */
export interface RawMembre extends RawPersonnel {
  pivot?: RawPivot;
}

export interface RawProjet {
  id: number;
  titre: string;
  description?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  statut: string;
  taches_actives_count?: number | string;
  taches_terminees_count?: number | string;
  taches_en_cours_count?: number | string;
  taches_annulees_count?: number | string;
  taches_en_retard_count?: number | string;
  membres_count?: number | string;
  chefs_noms?: string[];
  membres_actifs?: RawMembre[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RawTache {
  id: number;
  projet_id: number;
  titre: string;
  description?: string | null;
  statut: string;
  priorite?: string | null;
  date_debut?: string | null;
  date_echeance?: string | null;
  responsable_id: number;
  responsable?: RawPersonnel | null;
  projet?: RawProjet | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RawStatistiques {
  taux_avancement?: number | string;
  total_taches?: number | string;
  terminees?: number | string;
  en_cours?: number | string;
  annulees?: number | string;
  en_retard?: number | string;
  par_priorite?: { basse?: number; moyenne?: number; haute?: number };
  charge_par_membre?: Array<{
    personnel_id: number | string;
    total?: number | string;
    terminees?: number | string;
    en_cours?: number | string;
    en_retard?: number | string;
  }>;
}

export interface RawNotification {
  id: string | number;
  type?: string | null;
  /** Objet, ou texte JSON (parfois encodé deux fois selon la configuration de Laravel) */
  data?: unknown;
  read_at?: string | null;
  created_at?: string | null;
}

interface RawCompte {
  name?: string;
  personnel?: Pick<RawPersonnel, 'prenom' | 'nom'> | null;
}

export interface RawMessage {
  id: number;
  projet_id: number;
  user_id: number;
  destinataire_id?: number | null;
  contenu: string;
  auteur?: RawCompte | null;
  destinataire?: RawCompte | null;
  created_at?: string | null;
}

export interface RawMessagesPage extends Paginated<RawMessage> {
  a_plus_ancien?: boolean;
  suppressions?: Array<{ id: number | string; message_id: number | string }>;
  dernier_id_suppression?: number | string;
}

/** Réponse de GET /dashboard : tout le tableau de bord de l'utilisateur en un seul appel. */
export interface RawDashboard {
  /** Date du jour côté serveur ('AAAA-MM-JJ') */
  date: string;
  projets: RawProjet[];
  /** Statistiques par identifiant de projet (charge et priorités : uniquement les projets gérés) */
  stats: Record<string, RawStatistiques>;
  taches: RawTache[];
  /** true si la liste a été coupée à la limite du serveur (les agrégats restent exacts) */
  taches_tronquees: boolean;
  /** Équipe active des projets gérés, par identifiant de projet */
  membres: Record<string, RawMembre[]>;
  fonctions: Fonction[];
  notifications_non_lues: number;
  agregats: {
    global: {
      termine: number;
      en_cours: number;
      en_retard: number;
      annule: number;
      actives: number;
      taux: number;
    };
    mensuel: Array<{ mois: string; planifiees: number; realisees: number; taux_cumule: number }>;
  };
}
