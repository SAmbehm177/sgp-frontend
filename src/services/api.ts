/**
 * SGP API Client
 * Couche d'accès unique aux ressources de l'API Laravel Sanctum
 * Bascule transparente avec le moteur local de simulation conforme aux règles SGP
 */

import { sgpStorage } from './storage';
import {
  mapAuthPayload,
  mapUser,
  mapProjet,
  mapMembre,
  mapPersonnel,
  mapStatistiques,
  mapTache,
  STATUT_PROJET_VERS_API,
  STATUT_TACHE_VERS_API,
} from './mappers';
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
} from '../types/sgp';

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
  blockingTasks?: Tache[];
}

export interface RegisterPayload {
  prenom: string;
  nom: string;
  poste: string;
  email: string;
  password: string;
  password_confirmation: string;
}

class ApiService {
  private getHeaders(): HeadersInit {
    const token = sgpStorage.getAuthToken();
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // Effectue un appel HTTP vers Laravel Sanctum
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = sgpStorage.getApiBaseUrl().replace(/\/$/, '');
    const url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const hadToken = !!sgpStorage.getAuthToken();

    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...(options.headers || {}),
        },
      });

      if (!res.ok) {
        let errData: any = {};
        try {
          errData = await res.json();
        } catch {
          errData = { message: res.statusText };
        }

        const apiErr: ApiError = {
          status: res.status,
          message: errData.message || `Erreur serveur (${res.status})`,
          errors: errData.errors,
        };

        // Session expirée uniquement si un jeton existait (un 401 au login = mauvais identifiants)
        if (res.status === 401 && hadToken) {
          sgpStorage.setAuthToken(null);
          sgpStorage.setCurrentUserId(null);
          window.dispatchEvent(new CustomEvent('sgp:unauthorized'));
        }

        throw apiErr;
      }

      if (res.status === 204) return {} as T;
      const text = await res.text();
      return (text ? JSON.parse(text) : {}) as T;
    } catch (err: any) {
      if (err.status) {
        throw err;
      }
      // Erreur réseau de connexion vers l'API Laravel
      console.error(`[SGP] API injoignable (${baseUrl}). Vérifiez que 'php artisan serve' tourne sur le port 8000.`);
      throw {
        status: 0,
        message: 'Le serveur est injoignable pour le moment. Vérifiez votre connexion puis réessayez.',
      };

    }
  }

  private async requestAll<T = any>(path: string): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const separateur = path.includes('?') ? '&' : '?';
    const raw = await this.request<any>(`${path}${separateur}page=${page}`);
    if (Array.isArray(raw)) return raw as T[];
    items.push(...((raw.data ?? []) as T[]));
    lastPage = raw.last_page ?? 1;
    page += 1;
  } while (page <= lastPage);

  return items;
  }

  // --- Authentification & Session ---
  public async login(
    email: string,
    password: string
  ): Promise<{ user: User; personnel: Personnel | null; token: string }> {
    if (sgpStorage.isUsingMock()) {
      const user = sgpStorage.getUserByEmail(email);
      if (!user) {
        throw {
          status: 422,
          message: 'Identifiants incorrects. Veuillez vérifier votre adresse email.',
          errors: { email: ['Aucun compte associé à cette adresse.'] },
        } as ApiError;
      }

      // Compte inactif refusé avec message explicite
      if (!user.is_active) {
        throw {
          status: 403,
          message: "Votre compte est inactif ou désactivé par l'administrateur.",
          errors: { email: ['Compte désactivé.'] },
        } as ApiError;
      }

      const mockToken = `mock-token-${user.id}-${Date.now()}`;
      sgpStorage.setAuthToken(mockToken);
      sgpStorage.setCurrentUserId(user.id);
      return { user, personnel: sgpStorage.getPersonnelByUserId(user.id) || null, token: mockToken };
    }

    // Appel réel Sanctum : POST /api/login -> { token, user: { ..., personnel? } }
    const raw = await this.request<any>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const { user, personnel, token } = mapAuthPayload(raw);
    if (!token) {
      throw { status: 500, message: "Réponse de connexion invalide : jeton absent." } as ApiError;
    }
    sgpStorage.setAuthToken(token);
    sgpStorage.setCurrentUserId(user.id);
    return { user, personnel, token };
  }

  public async register(
  data: RegisterPayload
): Promise<{ user: User; personnel: Personnel | null; token: string }> {
  if (sgpStorage.isUsingMock()) {
    throw {
      status: 400,
      message: "L'inscription n'est pas disponible en mode simulation.",
    } as ApiError;
  }

  const raw = await this.request<any>('/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const { user, personnel, token } = mapAuthPayload(raw);
  if (!token) {
    throw { status: 500, message: "Réponse d'inscription invalide : jeton absent." } as ApiError;
  }
  sgpStorage.setAuthToken(token);
  sgpStorage.setCurrentUserId(user.id);
  return { user, personnel, token };
}

  public async logout(): Promise<void> {
    if (sgpStorage.isUsingMock()) {
      sgpStorage.setAuthToken(null);
      sgpStorage.setCurrentUserId(null);
      return;
    }

    try {
      await this.request('/logout', { method: 'POST' });
    } finally {
      sgpStorage.setAuthToken(null);
      sgpStorage.setCurrentUserId(null);
    }
  }

  // Restaure la session au chargement de la page
  public async getMe(): Promise<{ user: User; personnel: Personnel | null }> {
    if (!sgpStorage.getAuthToken()) {
      throw { status: 401, message: 'Non authentifié' } as ApiError;
    }

    if (sgpStorage.isUsingMock()) {
      const user = sgpStorage.getUserById(sgpStorage.getCurrentUserId());
      if (!user || !user.is_active) {
        throw { status: 401, message: 'Non authentifié ou compte inactif' } as ApiError;
      }
      return { user, personnel: sgpStorage.getPersonnelByUserId(user.id) || null };
    }

    // GET /api/me -> { user: {..., personnel?} } ou l'utilisateur directement
    const raw = await this.request<any>('/me');
    const { user, personnel } = mapAuthPayload(raw);
    if (!user.is_active) {
      throw { status: 403, message: 'Compte inactif.' } as ApiError;
    }
    return { user, personnel };
  }

  // --- Projets ---
  public async getProjets(): Promise<Projet[]> {
    if (sgpStorage.isUsingMock()) {
      return sgpStorage.getProjets();
    }
    const items = await this.requestAll<any>('/projets');
    // Pour un membre, l'API joint sa propre affectation (fonction) à chaque projet
    return items.map((raw) => ({
      ...mapProjet(raw),
      ma_fonction_id: raw.membres_actifs?.[0]?.pivot?.fonction_id,
    }));
  }

  public async getProjet(id: number): Promise<Projet> {
    if (sgpStorage.isUsingMock()) {
      const p = sgpStorage.getProjetById(id);
      if (!p) throw { status: 404, message: 'Projet introuvable' } as ApiError;
      return p;
    }
    return mapProjet(await this.request<any>(`/projets/${id}`));
  }

  // Détail d'un projet avec son équipe active et les fonctions disponibles
  public async getProjetDetail(
    id: number
  ): Promise<{ projet: Projet; membres: MembreProjet[]; fonctions: Fonction[] }> {
    if (sgpStorage.isUsingMock()) {
      const p = sgpStorage.getProjetById(id);
      if (!p) throw { status: 404, message: 'Projet introuvable' } as ApiError;
      return {
        projet: p,
        membres: sgpStorage.getMembresByProjet(id).filter((m) => m.statut === 'actif'),
        fonctions: sgpStorage.getFonctions(),
      };
    }

    const [raw, fonctions] = await Promise.all([
      this.request<any>(`/projets/${id}`),
      this.getFonctions(),
    ]);
    return {
      projet: mapProjet(raw),
      membres: (raw.membres_actifs ?? []).map((m: any) => mapMembre(m, id, fonctions)),
      fonctions,
    };
  }

  public async createProjet(data: {
    titre: string;
    description: string;
    date_debut: string;
    date_fin_prevue: string;
    budget?: number;
    chef_personnel_id?: number;
  }): Promise<Projet> {
    if (sgpStorage.isUsingMock()) {
      return sgpStorage.createProjet(data);
    }
    // Le backend gère titre, description, date_debut, date_fin (le chef s'ajoute ensuite via l'équipe)
    const raw = await this.request<any>('/projets', {
      method: 'POST',
      body: JSON.stringify({
        titre: data.titre,
        description: data.description,
        date_debut: data.date_debut,
        date_fin: data.date_fin_prevue,
      }),
    });
    return mapProjet(raw);
  }

  public async updateProjet(id: number, data: Partial<Projet>): Promise<Projet> {
    if (sgpStorage.isUsingMock()) {
      return sgpStorage.updateProjet(id, data);
    }
    // Le backend attend date_fin et un statut en toutes lettres ('en cours', 'terminé', 'annulé')
    const body: Record<string, any> = {};
    if (data.titre !== undefined) body.titre = data.titre;
    if (data.description !== undefined) body.description = data.description;
    if (data.date_debut !== undefined) body.date_debut = data.date_debut;
    if (data.date_fin_prevue !== undefined) body.date_fin = data.date_fin_prevue;
    if (data.statut !== undefined) body.statut = STATUT_PROJET_VERS_API[data.statut];

    const raw = await this.request<any>(`/projets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return mapProjet(raw);
  }

  public async getProjetStats(projetId: number): Promise<StatistiquesProjet> {
    if (sgpStorage.isUsingMock()) {
      return sgpStorage.getStatistiquesProjet(projetId);
    }
    return mapStatistiques(await this.request<any>(`/projets/${projetId}/stats`));
  }

  // --- Membres de projet ---
  public async getMembres(projetId: number): Promise<MembreProjet[]> {
    if (sgpStorage.isUsingMock()) {
      return sgpStorage.getMembresByProjet(projetId);
    }
    return (await this.getProjetDetail(projetId)).membres;
  }

  public async addMembre(data: {
    projet_id: number;
    personnel_id: number;
    fonction_id: number;
  }): Promise<void> {
    if (sgpStorage.isUsingMock()) {
      sgpStorage.addMembreToProjet(data);
      return;
    }
    await this.request(`/projets/${data.projet_id}/membres`, {
      method: 'POST',
      body: JSON.stringify({ personnel_id: data.personnel_id, fonction_id: data.fonction_id }),
    });
  }

  // Retrait d'un membre (le backend refuse s'il reste des tâches en cours ou si c'est le dernier chef)
  public async removeMembre(projetId: number, personnelId: number): Promise<void> {
    if (sgpStorage.isUsingMock()) {
      const membre = sgpStorage
        .getMembresByProjet(projetId)
        .find((m) => m.personnel_id === personnelId && m.statut === 'actif');
      if (membre) sgpStorage.removeMembreFromProjet(membre.id);
      return;
    }
    await this.request(`/projets/${projetId}/membres/${personnelId}`, { method: 'DELETE' });
  }

  public async reassignTasks(
    projetId: number,
    fromPersonnelId: number,
    toPersonnelId: number
  ): Promise<void> {
    if (sgpStorage.isUsingMock()) {
      sgpStorage.reassignTasks(fromPersonnelId, toPersonnelId, projetId);
      return;
    }
    await this.request(`/projets/${projetId}/reassign-tasks`, {
      method: 'POST',
      body: JSON.stringify({ from_personnel_id: fromPersonnelId, to_personnel_id: toPersonnelId }),
    });
  }
  // --- Tâches ---
  public async getTaches(projetId?: number): Promise<Tache[]> {
    if (sgpStorage.isUsingMock()) {
      return projetId ? sgpStorage.getTachesByProjet(projetId) : sgpStorage.getTaches();
    }
    // Côté API, les tâches se lisent par projet (ou via /mes-taches)
    if (!projetId) return [];
    const items = await this.requestAll<any>(`/projets/${projetId}/taches`);
    return items.map(mapTache);
  }

  public async getMyTasks(userId?: number): Promise<Tache[]> {
    if (sgpStorage.isUsingMock()) {
      const uId = userId || sgpStorage.getCurrentUserId();
      const personnel = sgpStorage.getPersonnelByUserId(uId);
      if (!personnel) return [];
      return sgpStorage.getTachesByPersonnel(personnel.id);
    }
    const items = await this.requestAll<any>('/mes-taches');
    return items.map(mapTache);
  }

  // Une tâche a un seul responsable, membre actif du projet (vérifié par le backend)
  public async createTache(data: {
    projet_id: number;
    titre: string;
    description: string;
    priorite: TaskPriority;
    date_debut: string;
    date_echeance: string;
    responsable_id: number;
  }): Promise<Tache> {
    if (sgpStorage.isUsingMock()) {
      return sgpStorage.createTache(data);
    }
    const raw = await this.request<any>(`/projets/${data.projet_id}/taches`, {
      method: 'POST',
      body: JSON.stringify({
        titre: data.titre,
        description: data.description,
        priorite: data.priorite,
        date_debut: data.date_debut,
        date_echeance: data.date_echeance,
        responsable_id: data.responsable_id,
      }),
    });
    return mapTache(raw);
  }

  // Modification partielle (PATCH) : seuls les champs fournis sont envoyés
  public async updateTache(id: number, data: Partial<Tache>): Promise<Tache> {
    if (sgpStorage.isUsingMock()) {
      return sgpStorage.updateTache(id, data);
    }
    const body: Record<string, any> = {};
    if (data.titre !== undefined) body.titre = data.titre;
    if (data.description !== undefined) body.description = data.description;
    if (data.priorite !== undefined) body.priorite = data.priorite;
    if (data.date_debut !== undefined) body.date_debut = data.date_debut;
    if (data.date_echeance !== undefined) body.date_echeance = data.date_echeance;
    if (data.responsable_id !== undefined) body.responsable_id = data.responsable_id;

    const raw = await this.request<any>(`/taches/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return mapTache(raw);
  }

  // Statut modifiable par le responsable de la tâche, un chef de projet ou un admin
  public async updateTaskStatus(
    taskId: number,
    statut: TaskStatus,
    currentUserId: number
  ): Promise<Tache> {
    if (sgpStorage.isUsingMock()) {
      return sgpStorage.updateTaskStatus(taskId, statut, currentUserId);
    }
    const raw = await this.request<any>(`/taches/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ statut: STATUT_TACHE_VERS_API[statut] }),
    });
    return mapTache(raw);
  }

  // Suppression (chef de projet ou admin)
  public async deleteTache(taskId: number): Promise<void> {
    if (sgpStorage.isUsingMock()) {
      throw { status: 400, message: 'Suppression indisponible en mode simulation.' } as ApiError;
    }
    await this.request(`/taches/${taskId}`, { method: 'DELETE' });
  }

  // --- Notifications ---
  public async getNotifications(userId?: number): Promise<NotificationItem[]> {
    if (sgpStorage.isUsingMock()) {
      const uId = userId || sgpStorage.getCurrentUserId();
      return sgpStorage.getNotifications(uId);
    }
    return this.request<NotificationItem[]>('/notifications');
  }

  public async markNotificationAsRead(id: number): Promise<void> {
    if (sgpStorage.isUsingMock()) {
      sgpStorage.markNotificationAsRead(id);
      return;
    }
    await this.request(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  public async markAllNotificationsAsRead(userId?: number): Promise<void> {
    if (sgpStorage.isUsingMock()) {
      const uId = userId || sgpStorage.getCurrentUserId();
      sgpStorage.markAllNotificationsAsRead(uId);
      return;
    }
    await this.request('/notifications/mark-all-read', { method: 'POST' });
  }

  // --- Administration ---
  public async getUsers(): Promise<User[]> {
    if (sgpStorage.isUsingMock()) {
      return sgpStorage.getUsers();
    }
    const items = await this.requestAll<any>('/users');
    return items.map(mapUser);
  }

  public async getPersonnel(): Promise<Personnel[]> {
    if (sgpStorage.isUsingMock()) {
      return sgpStorage.getPersonnel();
    }
    return this.request<Personnel[]>('/admin/personnel');
  }

  public async getFonctions(): Promise<Fonction[]> {
    if (sgpStorage.isUsingMock()) {
      return sgpStorage.getFonctions();
    }
    return this.request<Fonction[]>('fonctions');
  }

  // RÈGLE 1 & 2 : Formulaire unique compte + fiche, matricule unique
  public async createCompteAndPersonnel(data: {
    nom: string;
    prenom: string;
    email: string;
    poste: string;
    matricule: string;
    telephone?: string;
    role?: 'admin' | 'user';
  }): Promise<{ user: User; personnel: Personnel }> {
    if (sgpStorage.isUsingMock()) {
      return sgpStorage.createCompteAndPersonnel(data);
    }
    return this.request<{ user: User; personnel: Personnel }>('/admin/comptes-personnel', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Activation / désactivation d'un compte (administrateur). Désactiver coupe aussi les sessions ouvertes.
  public async setUserActive(userId: number, active: boolean): Promise<User> {
    if (sgpStorage.isUsingMock()) {
      return sgpStorage.toggleUserActivation(userId);
    }
    const raw = await this.request<any>(`/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ statut: active ? 'actif' : 'inactif' }),
    });
    return mapUser(raw);
  }

  public async createFonction(data: { libelle: string; description?: string }): Promise<Fonction> {
    if (sgpStorage.isUsingMock()) {
      return sgpStorage.createFonction(data.libelle, data.description);
    }
    return this.request<Fonction>('/admin/fonctions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Test de ping API vers Laravel port 8000
  public async testApiConnection(url: string): Promise<{ ok: boolean; status: number; message: string }> {
    try {
      const cleanUrl = url.replace(/\/$/, '');
      const res = await fetch(`${cleanUrl}/ping`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      return {
        ok: res.ok,
        status: res.status,
        message: res.ok ? 'Connexion réussie avec l API Laravel' : `Erreur HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        message: err.message || 'Impossible de contacter le serveur distant (vérifiez CORS et port 8000).',
      };
    }
  }

  // Recherche dans l'annuaire (admin et chefs de projet) : GET /personnels?q=
  public async searchPersonnel(q: string): Promise<Personnel[]> {
    if (sgpStorage.isUsingMock()) {
      const terme = q.toLowerCase();
      return sgpStorage.getPersonnel().filter((p) => `${p.prenom} ${p.nom}`.toLowerCase().includes(terme));
    }
    const raw = await this.request<any>(q ? `/personnels?q=${encodeURIComponent(q)}` : '/personnels');
    return ((raw.data ?? raw) as any[])
      .map((p) => mapPersonnel(p))
      .filter((p): p is Personnel => p !== null);
  }
}

export const api = new ApiService();
