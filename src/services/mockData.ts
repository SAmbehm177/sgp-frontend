import { User, Personnel, Fonction, Projet, MembreProjet, Tache, NotificationItem } from '../types/sgp';

export const INITIAL_FONCTIONS: Fonction[] = [
  { id: 1, libelle: 'Chef de projet', description: 'Responsable du pilotage, planification et affectation des tâches' },
  { id: 2, libelle: 'Membre', description: 'Participant actif à la réalisation des tâches du projet' },
  { id: 3, libelle: 'Expert Technique', description: 'Consultant senior et validation d architecture technique' },
  { id: 4, libelle: 'Référent Qualité', description: 'Contrôle conformité et recette fonctionnelle' },
];

export const INITIAL_USERS: User[] = [
  {
    id: 1,
    name: 'Jean Dupont',
    email: 'admin@sgp.fr',
    role: 'admin',
    is_active: true,
    personnel_id: null,
    created_at: '2026-01-15T09:00:00Z',
  },
  {
    id: 2,
    name: 'Sophie Martin',
    email: 'sophie.martin@sgp.fr',
    role: 'user',
    is_active: true,
    personnel_id: 1,
    created_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 3,
    name: 'Lucas Bernard',
    email: 'lucas.bernard@sgp.fr',
    role: 'user',
    is_active: true,
    personnel_id: 2,
    created_at: '2026-02-05T11:00:00Z',
  },
  {
    id: 4,
    name: 'Amina Koné',
    email: 'amina.kone@sgp.fr',
    role: 'user',
    is_active: true,
    personnel_id: 3,
    created_at: '2026-02-10T14:30:00Z',
  },
  {
    id: 5,
    name: 'Thomas Leroy',
    email: 'thomas.leroy@sgp.fr',
    role: 'user',
    is_active: true,
    personnel_id: 4,
    created_at: '2026-03-01T08:45:00Z',
  },
  {
    id: 6,
    name: 'Marc Desbois (Compte Désactivé)',
    email: 'inactif@sgp.fr',
    role: 'user',
    is_active: false,
    personnel_id: 5,
    created_at: '2026-01-20T16:00:00Z',
  },
];

export const INITIAL_PERSONNEL: Personnel[] = [
  {
    id: 1,
    nom: 'Martin',
    prenom: 'Sophie',
    poste: 'Directrice de Projets IT',
    user_id: 2,
    created_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 2,
    nom: 'Bernard',
    prenom: 'Lucas',
    poste: 'Ingénieur Full-Stack Lead',
    user_id: 3,
    created_at: '2026-02-05T11:00:00Z',
  },
  {
    id: 3,
    nom: 'Koné',
    prenom: 'Amina',
    poste: 'Designer UI/UX & Accessibilité',
    user_id: 4,
    created_at: '2026-02-10T14:30:00Z',
  },
  {
    id: 4,
    nom: 'Leroy',
    prenom: 'Thomas',
    poste: 'Architecte Cloud & DevOps',
    user_id: 5,
    created_at: '2026-03-01T08:45:00Z',
  },
  {
    id: 5,
    nom: 'Desbois',
    prenom: 'Marc',
    poste: 'Consultant Sécurité (Ancien)',
    user_id: 6,
    created_at: '2026-01-20T16:00:00Z',
  },
];

export const INITIAL_PROJETS: Projet[] = [
  {
    id: 1,
    titre: 'Refonte du Portail Client ERP',
    description: 'Modernisation intégrale de l espace client, interconnexion API REST Laravel Sanctum et suivi en temps réel des commandes.',
    date_debut: '2026-08-01',
    date_fin_prevue: '2026-11-30',
    statut: 'en_cours',
    budget: 85000,
    created_at: '2026-07-20T10:00:00Z',
  },
  {
    id: 2,
    titre: 'Application Mobile Logistique & Entrepôt',
    description: 'Numérisation du scanning code-barres et optimisation de la préparation des colis en entrepôt.',
    date_debut: '2026-09-01',
    date_fin_prevue: '2026-12-15',
    statut: 'en_cours',
    budget: 45000,
    created_at: '2026-08-15T14:00:00Z',
  },
  {
    id: 3,
    titre: 'Migration Cloud & Audit Conformité ISO 27001',
    description: 'Transition des clusters de bases de données vers infrastructure souveraine et validation de sécurité.',
    date_debut: '2026-05-01',
    date_fin_prevue: '2026-09-15',
    statut: 'termine',
    budget: 62000,
    created_at: '2026-04-10T09:30:00Z',
  },
];

export const INITIAL_MEMBRES: MembreProjet[] = [
  // Projet 1: Refonte ERP
  {
    id: 1,
    projet_id: 1,
    personnel_id: 1, // Sophie Martin
    fonction_id: 1,  // Chef de projet
    date_affectation: '2026-08-01',
    date_retrait: null,
    statut: 'actif',
  },
  {
    id: 2,
    projet_id: 1,
    personnel_id: 2, // Lucas Bernard
    fonction_id: 2,  // Membre
    date_affectation: '2026-08-01',
    date_retrait: null,
    statut: 'actif',
  },
  {
    id: 3,
    projet_id: 1,
    personnel_id: 3, // Amina Koné
    fonction_id: 2,  // Membre
    date_affectation: '2026-08-05',
    date_retrait: null,
    statut: 'actif',
  },
  {
    id: 4,
    projet_id: 1,
    personnel_id: 4, // Thomas Leroy
    fonction_id: 3,  // Expert technique
    date_affectation: '2026-08-10',
    date_retrait: null,
    statut: 'actif',
  },

  // Projet 2: Mobile Logistique (Lucas est Chef de projet ici pour illustrer les rôles croisés !)
  {
    id: 5,
    projet_id: 2,
    personnel_id: 2, // Lucas Bernard
    fonction_id: 1,  // Chef de projet !
    date_affectation: '2026-09-01',
    date_retrait: null,
    statut: 'actif',
  },
  {
    id: 6,
    projet_id: 2,
    personnel_id: 1, // Sophie Martin
    fonction_id: 2,  // Membre
    date_affectation: '2026-09-01',
    date_retrait: null,
    statut: 'actif',
  },
  {
    id: 7,
    projet_id: 2,
    personnel_id: 4, // Thomas Leroy
    fonction_id: 2,  // Membre
    date_affectation: '2026-09-05',
    date_retrait: null,
    statut: 'actif',
  },

  // Projet 3: Migration Cloud (Terminé, avec un membre retiré pour tester le filtre "anciens membres")
  {
    id: 8,
    projet_id: 3,
    personnel_id: 4, // Thomas Leroy
    fonction_id: 1,  // Chef de projet
    date_affectation: '2026-05-01',
    date_retrait: null,
    statut: 'actif',
  },
  {
    id: 9,
    projet_id: 3,
    personnel_id: 2, // Lucas Bernard
    fonction_id: 2,  // Membre
    date_affectation: '2026-05-01',
    date_retrait: null,
    statut: 'actif',
  },
  {
    id: 10,
    projet_id: 3,
    personnel_id: 5, // Marc Desbois
    fonction_id: 3,  // Expert technique
    date_affectation: '2026-05-01',
    date_retrait: '2026-07-31',
    statut: 'retire',
  },
];

export const INITIAL_TACHES: Tache[] = [
  // Projet 1
  {
    id: 1,
    projet_id: 1,
    titre: 'Spécification de l API Sanctum & Schéma JSON',
    description: 'Définition des endpoints Laravel 12 pour les tokens Sanctum, gestion des statuts de compte et middleware de rôles.',
    statut: 'termine',
    priorite: 'haute',
    date_echeance: '2026-08-20',
    responsable_id: 2, // Lucas Bernard
    created_at: '2026-08-02T09:00:00Z',
    updated_at: '2026-08-19T17:30:00Z',
  },
  {
    id: 2,
    projet_id: 1,
    titre: 'Intégration du Design System responsive (Tailwind)',
    description: 'Réalisation des gabarits, formulaires, tables paginées et composants modaux conformes aux maquettes UX.',
    statut: 'termine',
    priorite: 'moyenne',
    date_echeance: '2026-09-10',
    responsable_id: 3, // Amina Koné
    created_at: '2026-08-10T10:00:00Z',
    updated_at: '2026-09-08T15:20:00Z',
  },
  {
    id: 3,
    projet_id: 1,
    titre: 'Développement du module de validation des membres',
    description: 'Implémentation de la règle de gestion bloquant le retrait de membres disposant de tâches en cours.',
    statut: 'en_cours',
    priorite: 'haute',
    date_echeance: '2026-10-12', // Échéance proche !
    responsable_id: 2, // Lucas Bernard
    created_at: '2026-09-15T11:00:00Z',
    updated_at: '2026-09-15T11:00:00Z',
  },
  {
    id: 4,
    projet_id: 1,
    titre: 'Recette de sécurité et test d étanchéité des tokens',
    description: 'Vérifier la déconnexion automatique en cas de réponse HTTP 401 et l affichage du message en cas de compte désactivé.',
    statut: 'en_cours',
    priorite: 'urgente',
    date_echeance: '2026-10-01', // Date dépassée -> Tâche en retard !
    responsable_id: 4, // Thomas Leroy
    created_at: '2026-09-18T14:00:00Z',
    updated_at: '2026-09-18T14:00:00Z',
  },
  {
    id: 5,
    projet_id: 1,
    titre: 'Validation finale par le Chef de projet',
    description: 'Revue générale des statistiques d avancement et signature du procès-verbal de recette.',
    statut: 'en_cours',
    priorite: 'moyenne',
    date_echeance: '2026-10-25',
    responsable_id: 1, // Sophie Martin
    created_at: '2026-09-22T08:30:00Z',
    updated_at: '2026-09-22T08:30:00Z',
  },
  {
    id: 6,
    projet_id: 1,
    titre: 'Exportation des rapports d audit en format CSV/PDF',
    description: 'Module d exportation des indicateurs de charge de travail.',
    statut: 'annule',
    priorite: 'basse',
    date_echeance: '2026-09-30',
    responsable_id: 3, // Amina Koné
    created_at: '2026-08-25T11:00:00Z',
    updated_at: '2026-09-28T16:00:00Z',
  },

  // Projet 2
  {
    id: 7,
    projet_id: 2,
    titre: 'Conception ergonomique du mode hors-ligne pour terminaux mobiles',
    description: 'Création du flux de synchronisation des scans en cas de perte de connectivité Wi-Fi en zone de stockage.',
    statut: 'en_cours',
    priorite: 'haute',
    date_echeance: '2026-10-15',
    responsable_id: 2, // Lucas Bernard
    created_at: '2026-09-02T10:00:00Z',
    updated_at: '2026-09-02T10:00:00Z',
  },
  {
    id: 8,
    projet_id: 2,
    titre: 'Intégration du lecteur Zebra TC21',
    description: 'Branchement du SDK de numérisation laser et tests d endurance.',
    statut: 'en_cours',
    priorite: 'urgente',
    date_echeance: '2026-09-25', // Date dépassée -> Tâche en retard !
    responsable_id: 4, // Thomas Leroy
    created_at: '2026-09-05T14:00:00Z',
    updated_at: '2026-09-05T14:00:00Z',
  },
  {
    id: 9,
    projet_id: 2,
    titre: 'Rédaction du manuel utilisateur logistique',
    description: 'Guide pas-à-pas illustré pour les préparateurs de commandes.',
    statut: 'termine',
    priorite: 'basse',
    date_echeance: '2026-09-20',
    responsable_id: 1, // Sophie Martin
    created_at: '2026-09-01T09:00:00Z',
    updated_at: '2026-09-18T16:45:00Z',
  },

  // Projet 3 (Terminé)
  {
    id: 10,
    projet_id: 3,
    titre: 'Bascule DNS et certficats SSL/TLS',
    description: 'Déploiement des clés RSA 4096 bits et vérification OCSP Stapling.',
    statut: 'termine',
    priorite: 'haute',
    date_echeance: '2026-08-30',
    responsable_id: 4, // Thomas Leroy
    created_at: '2026-05-10T10:00:00Z',
    updated_at: '2026-08-28T18:00:00Z',
  },
  {
    id: 11,
    projet_id: 3,
    titre: 'Audit externe ISO 27001',
    description: 'Audits des procédures de sauvegarde chiffrée et de reprise d activité.',
    statut: 'termine',
    priorite: 'haute',
    date_echeance: '2026-09-10',
    responsable_id: 4, // Thomas Leroy
    created_at: '2026-06-01T09:00:00Z',
    updated_at: '2026-09-12T12:00:00Z',
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 1,
    user_id: 3, // Lucas Bernard
    titre: 'Nouvelle affectation de tâche',
    message: 'Vous avez été désigné responsable de la tâche « Spécification de l API Sanctum & Schéma JSON » sur le projet Refonte du Portail Client ERP.',
    type: 'affectation_tache',
    lue: true,
    created_at: '2026-08-02T09:05:00Z',
    data: { tache_id: 1, projet_id: 1 },
  },
  {
    id: 2,
    user_id: 3, // Lucas Bernard
    titre: 'Nouvelle affectation de tâche',
    message: 'Vous avez été désigné responsable de la tâche « Développement du module de validation des membres » sur le projet Refonte du Portail Client ERP.',
    type: 'affectation_tache',
    lue: false,
    created_at: '2026-09-15T11:05:00Z',
    data: { tache_id: 3, projet_id: 1 },
  },
  {
    id: 3,
    user_id: 2, // Sophie Martin (Chef de projet)
    titre: 'Changement de statut de tâche',
    message: 'Lucas Bernard a passé la tâche « Spécification de l API Sanctum & Schéma JSON » au statut « Terminé ».',
    type: 'changement_statut',
    lue: false,
    created_at: '2026-08-19T17:35:00Z',
    data: { tache_id: 1, projet_id: 1 },
  },
  {
    id: 4,
    user_id: 2, // Sophie Martin
    titre: 'Alerte échéance dépassée',
    message: 'La tâche « Recette de sécurité et test d étanchéité des tokens » a dépassé sa date d échéance fixée au 01/10/2026.',
    type: 'systeme',
    lue: false,
    created_at: '2026-10-02T08:00:00Z',
    data: { tache_id: 4, projet_id: 1 },
  },
  {
    id: 5,
    user_id: 1, // Jean Dupont (Admin)
    titre: 'Nouveau compte utilisateur créé',
    message: 'Le compte et la fiche personnel de Thomas Leroy (PERS-0013) ont été créés avec succès.',
    type: 'systeme',
    lue: true,
    created_at: '2026-03-01T08:46:00Z',
  },
];
