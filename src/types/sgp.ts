/**
 * SGP - Types TypeScript
 * Système de Gestion de Projet
 */

export type UserRole = 'admin' | 'user';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  personnel_id?: number | null;
  created_at: string;
  updated_at?: string;
  poste?: string;
  matricule?: string;
}

export interface Personnel {
  id: number;
  nom: string;
  prenom: string;
  matricule: string;
  poste: string;
  user_id: number | null; // null : personnel sans compte (l'accès est accordé par l'administrateur)
  created_at: string;
  updated_at?: string;
  user?: User;
}

export interface Fonction {
  id: number;
  libelle: string; // Ex: 'Chef de projet', 'Membre', 'Expert technique'
  description?: string;
  created_at?: string;
}

export type ProjectStatus = 'en_cours' | 'termine' | 'suspendu' | 'annule';

export interface Projet {
  id: number;
  titre: string;
  description: string;
  date_debut: string;
  date_fin_prevue: string;
  statut: ProjectStatus;
  budget?: number;
  created_at: string;
  updated_at?: string;
  taux_avancement?: number;
  membres_count?: number; 
  taches_en_cours?: number; // compteurs de tâches (fournis par la liste des projets)
  taches_terminees?: number;
  taches_annulees?: number;
  taches_en_retard?: number;
  chefs_noms?: string[];
  ma_fonction_id?: number;
}

export type MemberStatus = 'actif' | 'retire';

export interface ChargeMembre {
  personnel_id: number;
  total: number; // tâches non annulées
  terminees: number;
  en_cours: number;
  en_retard: number;
}

export interface MembreProjet {
  id: number;
  projet_id: number;
  personnel_id: number;
  fonction_id: number;
  date_affectation: string;
  date_retrait: string | null;
  statut: MemberStatus;
  fonction?: Fonction;
  personnel?: Personnel;
}

export type TaskStatus = 'en_cours' | 'termine' | 'annule';
export type TaskPriority = 'basse' | 'moyenne' | 'haute' | 'urgente';

export interface Tache {
  id: number;
  projet_id: number;
  titre: string;
  description: string;
  statut: TaskStatus;
  priorite: TaskPriority;
  date_debut: string;
  date_echeance: string;
  responsable_id: number; // Personnel ID
  responsable?: Personnel;
  projet?: Projet;
  created_at: string;
  updated_at: string;
  
}

export type NotificationType =
  | 'tache_affectee'
  | 'tache_statut_modifie'
  | 'membre_ajoute'
  | 'membre_retire'
  | 'nouveau_message'
  | 'autre';

export interface NotificationItem {
  id: string; // identifiant unique (UUID) généré par Laravel
  type: NotificationType;
  message: string;
  lue: boolean;
  created_at: string;
  projet_id?: number;
  projet_titre?: string; 
  tache_id?: number;
}

export interface Message {
  id: number;
  projet_id: number;
  user_id: number; // compte utilisateur de l'auteur (l'admin n'a pas de fiche personnel)
  destinataire_id: number | null; // facultatif : sans destinataire, le message s'adresse à tout le projet
  destinataire_nom: string | null;
  contenu: string;
  auteur_nom: string;
  created_at: string;
}

export interface StatistiquesProjet {
  taux_avancement: number; // % (taches terminées / total * 100)
  total_taches: number;
  taches_terminees: number;
  taches_en_cours: number;
  taches_annulees: number;
  taches_en_retard: number;
  // Détails réservés à l'administrateur et aux chefs de projet (vides pour un simple membre)
  par_priorite: { basse: number; moyenne: number; haute: number };
  charge_par_membre: ChargeMembre[];
}

export interface ChargeMembre {
  personnel_id: number;
  total: number; // tâches non annulées
  terminees: number;
  en_cours: number;
  en_retard: number;
}

export interface ApiConfig {
  baseUrl: string;
  useMock: boolean;
  token: string | null;
}

// Paramètres transmis lors d'une navigation interne (hash routing)
export type ProjectTab = 'vue-ensemble' | 'taches' | 'membres' | 'discussion' | 'statistiques';

export interface RouteParams {
  id?: number;
  tab?: ProjectTab;
  filter?: string;
}
