/**
 * SGP Storage - Gestion de l'état local et persistance
 * Implémente toutes les règles de gestion du cahier des charges
 */

import {
  User,
  Personnel,
  Fonction,
  Projet,
  MembreProjet,
  Tache,
  NotificationItem,
  StatistiquesProjet,
  TaskStatus,
  TaskPriority,
  ProjectStatus,
} from '../types/sgp';
import {
  INITIAL_USERS,
  INITIAL_PERSONNEL,
  INITIAL_FONCTIONS,
  INITIAL_PROJETS,
  INITIAL_MEMBRES,
  INITIAL_TACHES,
  INITIAL_NOTIFICATIONS,
} from './mockData';

const STORAGE_KEYS = {
  USERS: 'sgp_users_v1',
  PERSONNEL: 'sgp_personnel_v1',
  FONCTIONS: 'sgp_fonctions_v1',
  PROJETS: 'sgp_projets_v1',
  MEMBRES: 'sgp_membres_v1',
  TACHES: 'sgp_taches_v1',
  NOTIFICATIONS: 'sgp_notifications_v1',
  CURRENT_USER_ID: 'sgp_current_user_id_v1',
  API_BASE_URL: 'sgp_api_base_url_v1',
  AUTH_TOKEN: 'sgp_auth_token_v1',
  USE_MOCK: 'sgp_use_mock_v1',
};

class SgpStorage {
  private load<T>(key: string, fallback: T): T {
    // Hors mode simulation, aucune donnée de démonstration : les listes restent vides
    if (!this.isUsingMock() && Array.isArray(fallback)) return [] as unknown as T;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private save<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.error('Storage save error:', err);
    }
  }

  // Initialisation / Reset
  public resetToDefaults(): void {
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.PERSONNEL);
    localStorage.removeItem(STORAGE_KEYS.FONCTIONS);
    localStorage.removeItem(STORAGE_KEYS.PROJETS);
    localStorage.removeItem(STORAGE_KEYS.MEMBRES);
    localStorage.removeItem(STORAGE_KEYS.TACHES);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    this.save(STORAGE_KEYS.USERS, INITIAL_USERS);
    this.save(STORAGE_KEYS.PERSONNEL, INITIAL_PERSONNEL);
    this.save(STORAGE_KEYS.FONCTIONS, INITIAL_FONCTIONS);
    this.save(STORAGE_KEYS.PROJETS, INITIAL_PROJETS);
    this.save(STORAGE_KEYS.MEMBRES, INITIAL_MEMBRES);
    this.save(STORAGE_KEYS.TACHES, INITIAL_TACHES);
    this.save(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  }

  // Config API
  public getApiBaseUrl(): string {
    return (
      localStorage.getItem(STORAGE_KEYS.API_BASE_URL) ||
      (import.meta.env.VITE_API_URL as string | undefined) ||
      'http://localhost:8000/api'
    );
  }

  public setApiBaseUrl(url: string): void {
    localStorage.setItem(STORAGE_KEYS.API_BASE_URL, url);
  }

  public getAuthToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  public setAuthToken(token: string | null): void {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }
  }

  public isUsingMock(): boolean {
    const val = localStorage.getItem(STORAGE_KEYS.USE_MOCK);
    return val === 'true'; // Par défaut : vraie API Laravel (le mode simulation doit être activé explicitement)
  }

  public setUseMock(useMock: boolean): void {
    localStorage.setItem(STORAGE_KEYS.USE_MOCK, useMock ? 'true' : 'false');
  }

  // Utilisateur connecté
  public getCurrentUserId(): number {
    const val = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    return val ? parseInt(val, 10) : 0; // 0 = aucun utilisateur connecté
  }

  public setCurrentUserId(id: number | null): void {
    if (id !== null) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, id.toString());
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    }
  }

  // Users
  public getUsers(): User[] {
    return this.load<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  public getUserById(id: number): User | undefined {
    return this.getUsers().find((u) => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public updateUser(id: number, patch: Partial<User>): User {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('Utilisateur introuvable');
    const updated = { ...users[idx], ...patch, updated_at: new Date().toISOString() };
    users[idx] = updated;
    this.save(STORAGE_KEYS.USERS, users);
    return updated;
  }

  // Personnel
  public getPersonnel(): Personnel[] {
    const personnel = this.load<Personnel[]>(STORAGE_KEYS.PERSONNEL, INITIAL_PERSONNEL);
    const users = this.getUsers();
    return personnel.map((p) => ({
      ...p,
      user: users.find((u) => u.id === p.user_id),
    }));
  }

  public getPersonnelById(id: number): Personnel | undefined {
    const all = this.getPersonnel();
    return all.find((p) => p.id === id);
  }

  public getPersonnelByUserId(userId: number): Personnel | undefined {
    const all = this.getPersonnel();
    return all.find((p) => p.user_id === userId);
  }



  // RÈGLE 1 : Formulaire unique de création Compte + Fiche personnel
  public createCompteAndPersonnel(params: {
    nom: string;
    prenom: string;
    email: string;
    poste: string;
    telephone?: string;
    role?: 'admin' | 'user';
  }): { user: User; personnel: Personnel } {

    if (this.getUserByEmail(params.email)) {
      throw {
        status: 422,
        errors: { email: ['Cette adresse courriel est déjà utilisée par un autre compte.'] },
        message: 'Adresse email déjà utilisée.',
      };
    }

    const users = this.getUsers();
    const personnelList = this.load<Personnel[]>(STORAGE_KEYS.PERSONNEL, INITIAL_PERSONNEL);

    const newUserId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
    const newPersonnelId = personnelList.length > 0 ? Math.max(...personnelList.map((p) => p.id)) + 1 : 1;

    const newUser: User = {
      id: newUserId,
      name: `${params.prenom.trim()} ${params.nom.trim()}`,
      email: params.email.trim(),
      role: params.role || 'user',
      is_active: true,
      personnel_id: newPersonnelId,
      created_at: new Date().toISOString(),
    };

    const newPersonnel: Personnel = {
      id: newPersonnelId,
      nom: params.nom.trim(),
      prenom: params.prenom.trim(),
      poste: params.poste.trim(),
      user_id: newUserId,
      created_at: new Date().toISOString(),
      user: newUser,
    };

    users.push(newUser);
    personnelList.push(newPersonnel);

    this.save(STORAGE_KEYS.USERS, users);
    this.save(STORAGE_KEYS.PERSONNEL, personnelList);

    // Notification système
    this.addNotification({
      user_id: 1, // Admin notification
      titre: 'Nouveau compte & personnel créés',
      message: `Le compte de ${newUser.name} a été créé.`,
      type: 'systeme',
    });

    return { user: newUser, personnel: newPersonnel };
  }

  // RÈGLE 5 : Activation / Désactivation de compte
  public toggleUserActivation(userId: number): User {
    const user = this.getUserById(userId);
    if (!user) throw new Error('Utilisateur non trouvé');
    const updated = this.updateUser(userId, { is_active: !user.is_active });
    return updated;
  }

  // Fonctions
  public getFonctions(): Fonction[] {
    return this.load<Fonction[]>(STORAGE_KEYS.FONCTIONS, INITIAL_FONCTIONS);
  }

  public createFonction(libelle: string, description?: string): Fonction {
    const list = this.getFonctions();
    const newId = list.length > 0 ? Math.max(...list.map((f) => f.id)) + 1 : 1;
    const item: Fonction = {
      id: newId,
      libelle: libelle.trim(),
      description: description?.trim(),
      created_at: new Date().toISOString(),
    };
    list.push(item);
    this.save(STORAGE_KEYS.FONCTIONS, list);
    return item;
  }

  // Projets
  public getProjets(): Projet[] {
    return this.load<Projet[]>(STORAGE_KEYS.PROJETS, INITIAL_PROJETS);
  }

  public getProjetById(id: number): Projet | undefined {
    return this.getProjets().find((p) => p.id === id);
  }

  public createProjet(params: {
    titre: string;
    description: string;
    date_debut: string;
    date_fin_prevue: string;
    budget?: number;
    chef_personnel_id?: number;
  }): Projet {
    const projets = this.getProjets();
    const newId = projets.length > 0 ? Math.max(...projets.map((p) => p.id)) + 1 : 1;
    const newProjet: Projet = {
      id: newId,
      titre: params.titre.trim(),
      description: params.description.trim(),
      date_debut: params.date_debut,
      date_fin_prevue: params.date_fin_prevue,
      statut: 'en_cours',
      budget: params.budget,
      created_at: new Date().toISOString(),
    };
    projets.push(newProjet);
    this.save(STORAGE_KEYS.PROJETS, projets);

    // If a project manager was selected, assign them as Chef de projet
    if (params.chef_personnel_id) {
      this.addMembreToProjet({
        projet_id: newId,
        personnel_id: params.chef_personnel_id,
        fonction_id: 1, // Chef de projet
      });
    }

    return newProjet;
  }

  public updateProjet(id: number, patch: Partial<Projet>): Projet {
    const projets = this.getProjets();
    const idx = projets.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Projet introuvable');
    const updated = { ...projets[idx], ...patch, updated_at: new Date().toISOString() };
    projets[idx] = updated;
    this.save(STORAGE_KEYS.PROJETS, projets);
    return updated;
  }

  // Membres d'un projet
  public getMembresByProjet(projet_id: number): MembreProjet[] {
    const membres = this.load<MembreProjet[]>(STORAGE_KEYS.MEMBRES, INITIAL_MEMBRES);
    const personnelList = this.getPersonnel();
    const fonctions = this.getFonctions();

    return membres
      .filter((m) => m.projet_id === projet_id)
      .map((m) => ({
        ...m,
        personnel: personnelList.find((p) => p.id === m.personnel_id),
        fonction: fonctions.find((f) => f.id === m.fonction_id),
      }));
  }

  public getMembres(): MembreProjet[] {
    const membres = this.load<MembreProjet[]>(STORAGE_KEYS.MEMBRES, INITIAL_MEMBRES);
    const personnelList = this.getPersonnel();
    const fonctions = this.getFonctions();
    return membres.map((m) => ({
      ...m,
      personnel: personnelList.find((p) => p.id === m.personnel_id),
      fonction: fonctions.find((f) => f.id === m.fonction_id),
    }));
  }

  public addMembreToProjet(params: {
    projet_id: number;
    personnel_id: number;
    fonction_id: number;
  }): MembreProjet {
    const list = this.load<MembreProjet[]>(STORAGE_KEYS.MEMBRES, INITIAL_MEMBRES);

    // Check if already an active member
    const existing = list.find(
      (m) => m.projet_id === params.projet_id && m.personnel_id === params.personnel_id && m.statut === 'actif'
    );
    if (existing) {
      throw {
        status: 422,
        errors: { personnel_id: ['Ce collaborateur est déjà membre actif de ce projet.'] },
        message: 'Membre déjà présent sur ce projet.',
      };
    }

    const newId = list.length > 0 ? Math.max(...list.map((m) => m.id)) + 1 : 1;
    const newMembre: MembreProjet = {
      id: newId,
      projet_id: params.projet_id,
      personnel_id: params.personnel_id,
      fonction_id: params.fonction_id,
      date_affectation: new Date().toISOString().split('T')[0],
      date_retrait: null,
      statut: 'actif',
    };
    list.push(newMembre);
    this.save(STORAGE_KEYS.MEMBRES, list);
    return newMembre;
  }

  // RÈGLE 4 : Retrait d'un membre avec vérification stricte des tâches en cours
  public removeMembreFromProjet(membreId: number): { success: boolean; membre?: MembreProjet } {
    const membres = this.load<MembreProjet[]>(STORAGE_KEYS.MEMBRES, INITIAL_MEMBRES);
    const idx = membres.findIndex((m) => m.id === membreId);
    if (idx === -1) throw new Error('Membre introuvable');

    const membre = membres[idx];
    const personnelId = membre.personnel_id;
    const projetId = membre.projet_id;

    // Check if member has active tasks on this project
    const activeTasks = this.getTachesByProjet(projetId).filter(
      (t) => t.responsable_id === personnelId && t.statut === 'en_cours'
    );

    if (activeTasks.length > 0) {
      const err = {
        status: 422,
        code: 'MEMBER_HAS_ACTIVE_TASKS',
        message: 'Impossible de retirer ce membre : des tâches en cours lui sont encore assignées.',
        blockingTasks: activeTasks,
      };
      throw err;
    }

    // Set status to 'retire' and record date_retrait
    membres[idx] = {
      ...membre,
      statut: 'retire',
      date_retrait: new Date().toISOString().split('T')[0],
    };

    this.save(STORAGE_KEYS.MEMBRES, membres);
    return { success: true, membre: membres[idx] };
  }

  // Tâches
  public getTaches(): Tache[] {
    const taches = this.load<Tache[]>(STORAGE_KEYS.TACHES, INITIAL_TACHES);
    const personnel = this.getPersonnel();
    const projets = this.getProjets();
    return taches.map((t) => ({
      ...t,
      responsable: personnel.find((p) => p.id === t.responsable_id),
      projet: projets.find((p) => p.id === t.projet_id),
    }));
  }

  public getTachesByProjet(projetId: number): Tache[] {
    return this.getTaches().filter((t) => t.projet_id === projetId);
  }

  public getTachesByPersonnel(personnelId: number): Tache[] {
    return this.getTaches().filter((t) => t.responsable_id === personnelId);
  }

  // RÈGLE 3 : Une tâche a un seul responsable, OBLIGATOIREMENT membre ACTIF du projet
  public createTache(params: {
    projet_id: number;
    titre: string;
    description: string;
    priorite: TaskPriority;
    date_echeance: string;
    responsable_id: number;
  }): Tache {
    // Validate responsible person is an ACTIVE member of the project
    const activeMembers = this.getMembresByProjet(params.projet_id).filter((m) => m.statut === 'actif');
    const isMemberActive = activeMembers.some((m) => m.personnel_id === params.responsable_id);

    if (!isMemberActive) {
      throw {
        status: 422,
        errors: { responsable_id: ['Le responsable doit obligatoirement être un membre actif du projet.'] },
        message: 'Responsable invalide.',
      };
    }

    const taches = this.load<Tache[]>(STORAGE_KEYS.TACHES, INITIAL_TACHES);
    const newId = taches.length > 0 ? Math.max(...taches.map((t) => t.id)) + 1 : 1;
    const now = new Date().toISOString();

    const newTache: Tache = {
      id: newId,
      projet_id: params.projet_id,
      titre: params.titre.trim(),
      description: params.description.trim(),
      statut: 'en_cours',
      priorite: params.priorite,
      date_echeance: params.date_echeance,
      responsable_id: params.responsable_id,
      created_at: now,
      updated_at: now,
    };

    taches.push(newTache);
    this.save(STORAGE_KEYS.TACHES, taches);

    // Create notification for the assignee
    const respPersonnel = this.getPersonnelById(params.responsable_id);
    const projet = this.getProjetById(params.projet_id);
    if (respPersonnel?.user_id) {
      this.addNotification({
        user_id: respPersonnel.user_id,
        titre: 'Nouvelle tâche assignée',
        message: `Vous avez été assigné à la tâche « ${newTache.titre} » sur le projet ${projet?.titre || ''}.`,
        type: 'affectation_tache',
        data: { tache_id: newId, projet_id: params.projet_id },
      });
    }

    return newTache;
  }

  public updateTache(
    id: number,
    params: Partial<Omit<Tache, 'id' | 'projet_id' | 'created_at'>>
  ): Tache {
    const taches = this.load<Tache[]>(STORAGE_KEYS.TACHES, INITIAL_TACHES);
    const idx = taches.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Tâche introuvable');

    const current = taches[idx];

    // If changing responsable, verify they are an active member
    if (params.responsable_id && params.responsable_id !== current.responsable_id) {
      const activeMembers = this.getMembresByProjet(current.projet_id).filter((m) => m.statut === 'actif');
      const isMemberActive = activeMembers.some((m) => m.personnel_id === params.responsable_id);
      if (!isMemberActive) {
        throw {
          status: 422,
          errors: { responsable_id: ['Le responsable doit être un membre actif du projet.'] },
          message: 'Responsable invalide.',
        };
      }
    }

    const updated: Tache = {
      ...current,
      ...params,
      updated_at: new Date().toISOString(),
    };

    taches[idx] = updated;
    this.save(STORAGE_KEYS.TACHES, taches);
    return updated;
  }

  // RÈGLE 6 : Changement de statut avec vérification des permissions
  public updateTaskStatus(
    taskId: number,
    newStatus: TaskStatus,
    currentUserId: number
  ): Tache {
    const task = this.getTaches().find((t) => t.id === taskId);
    if (!task) throw new Error('Tâche introuvable');

    const currentUser = this.getUserById(currentUserId);
    if (!currentUser) throw new Error('Utilisateur non connecté');

    // Verification: user is admin, OR user is task responsable, OR user is chef de projet on this project
    const isAdmin = currentUser.role === 'admin';
    const userPersonnel = this.getPersonnelByUserId(currentUserId);
    const isResponsable = userPersonnel && userPersonnel.id === task.responsable_id;

    let isChef = false;
    if (userPersonnel) {
      const projectMembers = this.getMembresByProjet(task.projet_id);
      const memberEntry = projectMembers.find((m) => m.personnel_id === userPersonnel.id && m.statut === 'actif');
      isChef = memberEntry?.fonction?.libelle === 'Chef de projet';
    }

    if (!isAdmin && !isResponsable && !isChef) {
      throw {
        status: 403,
        message: 'Seul le responsable de la tâche, le chef de projet ou un administrateur peut modifier son statut.',
      };
    }

    const oldStatus = task.statut;
    const updated = this.updateTache(taskId, { statut: newStatus });

    // Notification for Chef de projet if changed by responsible member
    if (isResponsable && !isChef && !isAdmin) {
      const projectMembers = this.getMembresByProjet(task.projet_id);
      const chefMember = projectMembers.find(
        (m) => m.fonction?.libelle === 'Chef de projet' && m.statut === 'actif'
      );
      if (chefMember?.personnel?.user_id) {
        this.addNotification({
          user_id: chefMember.personnel.user_id,
          titre: 'Mise à jour de statut de tâche',
          message: `${currentUser.name} a passé la tâche « ${task.titre} » de ${oldStatus} à ${newStatus}.`,
          type: 'changement_statut',
          data: { tache_id: taskId, projet_id: task.projet_id },
        });
      }
    }

    return updated;
  }

  // Reassignment of tasks (used when removing a member)
  public reassignTasks(fromPersonnelId: number, toPersonnelId: number, projetId: number): void {
    const taches = this.load<Tache[]>(STORAGE_KEYS.TACHES, INITIAL_TACHES);
    const activeMembers = this.getMembresByProjet(projetId).filter((m) => m.statut === 'actif');
    const isTargetActive = activeMembers.some((m) => m.personnel_id === toPersonnelId);
    if (!isTargetActive) {
      throw new Error('Le collaborateur cible doit être un membre actif du projet.');
    }

    let modified = false;
    taches.forEach((t) => {
      if (t.projet_id === projetId && t.responsable_id === fromPersonnelId && t.statut === 'en_cours') {
        t.responsable_id = toPersonnelId;
        t.updated_at = new Date().toISOString();
        modified = true;
      }
    });

    if (modified) {
      this.save(STORAGE_KEYS.TACHES, taches);
    }
  }

  // Statistiques calculées par projet (Section 5.8)
  public getStatistiquesProjet(projetId: number): StatistiquesProjet {
    const tasks = this.getTachesByProjet(projetId);
    const today = new Date().toISOString().split('T')[0];

    const total = tasks.length;
    const terminees = tasks.filter((t) => t.statut === 'termine').length;
    const en_cours = tasks.filter((t) => t.statut === 'en_cours').length;
    const annulees = tasks.filter((t) => t.statut === 'annule').length;
    // En retard: échéance dépassée sans statut terminé
    const en_retard = tasks.filter((t) => t.statut !== 'termine' && t.date_echeance < today).length;

    const taux_avancement = total > 0 ? Math.round((terminees / total) * 100) : 0;

    return {
      taux_avancement,
      total_taches: total,
      taches_terminees: terminees,
      taches_en_cours: en_cours,
      taches_annulees: annulees,
      taches_en_retard: en_retard,
    };
  }

  // Notifications (Section 5.7)
  public getNotifications(userId: number): NotificationItem[] {
    const list = this.load<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    return list.filter((n) => n.user_id === userId).sort((a, b) => b.id - a.id);
  }

  public getUnreadNotificationCount(userId: number): number {
    return this.getNotifications(userId).filter((n) => !n.lue).length;
  }

  public markNotificationAsRead(id: number): void {
    const list = this.load<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const idx = list.findIndex((n) => n.id === id);
    if (idx !== -1) {
      list[idx].lue = true;
      this.save(STORAGE_KEYS.NOTIFICATIONS, list);
    }
  }

  public markAllNotificationsAsRead(userId: number): void {
    const list = this.load<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    list.forEach((n) => {
      if (n.user_id === userId) {
        n.lue = true;
      }
    });
    this.save(STORAGE_KEYS.NOTIFICATIONS, list);
  }

  public addNotification(params: {
    user_id: number;
    titre: string;
    message: string;
    type: NotificationItem['type'];
    data?: { tache_id?: number; projet_id?: number };
  }): NotificationItem {
    const list = this.load<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const newId = list.length > 0 ? Math.max(...list.map((n) => n.id)) + 1 : 1;
    const item: NotificationItem = {
      id: newId,
      user_id: params.user_id,
      titre: params.titre,
      message: params.message,
      type: params.type,
      lue: false,
      created_at: new Date().toISOString(),
      data: params.data,
    };
    list.push(item);
    this.save(STORAGE_KEYS.NOTIFICATIONS, list);
    return item;
  }

  // Helper pour déterminer le rôle effectif d'un utilisateur sur un projet donné (Section 3)
  public getUserRoleOnProject(
    userId: number,
    projetId: number
  ): 'admin' | 'chef_de_projet' | 'membre' | 'non_membre' {
    const user = this.getUserById(userId);
    if (!user) return 'non_membre';
    if (user.role === 'admin') return 'admin';

    const personnel = this.getPersonnelByUserId(userId);
    if (!personnel) return 'non_membre';

    const members = this.getMembresByProjet(projetId);
    const memberEntry = members.find((m) => m.personnel_id === personnel.id && m.statut === 'actif');

    if (!memberEntry) return 'non_membre';
    if (memberEntry.fonction?.libelle === 'Chef de projet') return 'chef_de_projet';
    return 'membre';
  }
}

export const sgpStorage = new SgpStorage();
