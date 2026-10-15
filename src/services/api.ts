/**
 * SGP API Client
 * Couche d'accès unique à l'API Laravel (Sanctum)
 */

import { session, API_BASE_URL } from './session';
import {
  mapAuthPayload,
  mapUser,
  mapProjet,
  mapMembre,
  mapPersonnel,
  mapStatistiques,
  mapTache,
  mapNotification,
  mapMessage,
  STATUT_PROJET_VERS_API,
  STATUT_TACHE_VERS_API,
} from './mappers';
import {
  User,
  Personnel,
  Fonction,
  Projet,
  Tache,
  StatistiquesProjet,
  NotificationItem,
  TaskStatus,
  TaskPriority,
  MembreProjet,
  Message,
} from '../types/sgp';

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
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
    const token = session.getToken();
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // Effectue un appel HTTP vers l'API Laravel
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = API_BASE_URL.replace(/\/$/, '');
    const url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const hadToken = !!session.getToken();

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
          session.setToken(null);
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
      // Erreur réseau : le détail technique reste dans la console, pas à l'écran
      console.error(`[SGP] API injoignable (${baseUrl}). Vérifiez que 'php artisan serve' tourne sur le port 8000.`);
      throw {
        status: 0,
        message: 'Le serveur est injoignable pour le moment. Vérifiez votre connexion puis réessayez.',
      };
    }
  }

  // Parcourt toutes les pages d'une route paginée Laravel ({ data, last_page, ... })
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

  // --- Authentification & session ---
  public async login(
    email: string,
    password: string
  ): Promise<{ user: User; personnel: Personnel | null; token: string }> {
    // POST /api/login -> { token, user: { ..., personnel? } }
    const raw = await this.request<any>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const { user, personnel, token } = mapAuthPayload(raw);
    if (!token) {
      throw { status: 500, message: 'Réponse de connexion invalide : jeton absent.' } as ApiError;
    }
    session.setToken(token);
    return { user, personnel, token };
  }

  // Inscription libre : POST /api/register -> { token, user: { ..., personnel } } (connecte directement)
  public async register(
    data: RegisterPayload
  ): Promise<{ user: User; personnel: Personnel | null; token: string }> {
    const raw = await this.request<any>('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const { user, personnel, token } = mapAuthPayload(raw);
    if (!token) {
      throw { status: 500, message: "Réponse d'inscription invalide : jeton absent." } as ApiError;
    }
    session.setToken(token);
    return { user, personnel, token };
  }

  public async logout(): Promise<void> {
    try {
      await this.request('/logout', { method: 'POST' });
    } finally {
      session.setToken(null);
    }
  }

  // Restaure la session au chargement de la page
  public async getMe(): Promise<{ user: User; personnel: Personnel | null }> {
    if (!session.getToken()) {
      throw { status: 401, message: 'Non authentifié' } as ApiError;
    }

    // GET /api/me -> l'utilisateur avec sa fiche personnel
    const raw = await this.request<any>('/me');
    const { user, personnel } = mapAuthPayload(raw);
    if (!user.is_active) {
      throw { status: 403, message: 'Compte inactif.' } as ApiError;
    }
    return { user, personnel };
  }

  // --- Projets ---
  public async getProjets(): Promise<Projet[]> {
    const items = await this.requestAll<any>('/projets');
    // Pour un membre, l'API joint sa propre affectation (fonction) à chaque projet
    return items.map((raw) => ({
      ...mapProjet(raw),
      ma_fonction_id: raw.membres_actifs?.[0]?.pivot?.fonction_id,
    }));
  }

  // Suppression d'un projet (administrateur) : ses tâches et son équipe sont supprimées avec lui
  public async deleteProjet(id: number): Promise<void> {
    await this.request(`/projets/${id}`, { method: 'DELETE' });
  }

  // Détail d'un projet avec son équipe active et les fonctions disponibles
  public async getProjetDetail(
    id: number
  ): Promise<{ projet: Projet; membres: MembreProjet[]; fonctions: Fonction[] }> {
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
  }): Promise<Projet> {
    // Le chef de projet se désigne ensuite depuis l'équipe du projet
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
    return mapStatistiques(await this.request<any>(`/projets/${projetId}/stats`));
  }

  // --- Membres de projet ---
  public async addMembre(data: {
    projet_id: number;
    personnel_id: number;
    fonction_id: number;
  }): Promise<void> {
    await this.request(`/projets/${data.projet_id}/membres`, {
      method: 'POST',
      body: JSON.stringify({ personnel_id: data.personnel_id, fonction_id: data.fonction_id }),
    });
  }

  // Retrait d'un membre (le backend refuse s'il reste des tâches en cours ; seul l'administrateur peut retirer le chef)
  public async removeMembre(projetId: number, personnelId: number): Promise<void> {
    await this.request(`/projets/${projetId}/membres/${personnelId}`, { method: 'DELETE' });
  }

  // --- Tâches ---
  public async getTaches(projetId: number): Promise<Tache[]> {
    const items = await this.requestAll<any>(`/projets/${projetId}/taches`);
    return items.map(mapTache);
  }

  public async getMyTasks(): Promise<Tache[]> {
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
  public async updateTaskStatus(taskId: number, statut: TaskStatus): Promise<Tache> {
    const raw = await this.request<any>(`/taches/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ statut: STATUT_TACHE_VERS_API[statut] }),
    });
    return mapTache(raw);
  }

  // Suppression (chef de projet ou admin)
  public async deleteTache(taskId: number): Promise<void> {
    await this.request(`/taches/${taskId}`, { method: 'DELETE' });
  }

  // Une tâche (avec son responsable)
  public async getTache(id: number): Promise<Tache> {
    return mapTache(await this.request<any>(`/taches/${id}`));
  }

  // Tâches en cours de tous les projets, par échéance (administrateur) : les 20 premières
  public async getUpcomingTasks(): Promise<Tache[]> {
    const raw = await this.request<any>('/taches');
    return ((raw.data ?? []) as any[]).map(mapTache);
  }
  
  // --- Discussion du projet ---
  // Sans option : les 30 derniers messages. avantId : les 30 précédents. apresId : les nouveaux (sondage).
  public async getMessages(
    projetId: number,
    opts: { avantId?: number; apresId?: number } = {}
  ): Promise<{ messages: Message[]; aPlusAncien: boolean }> {
    const params = new URLSearchParams();
    if (opts.avantId !== undefined) params.set('avant_id', String(opts.avantId));
    if (opts.apresId !== undefined) params.set('apres_id', String(opts.apresId));
    const qs = params.toString();

    const raw = await this.request<any>(`/projets/${projetId}/messages${qs ? `?${qs}` : ''}`);
    return {
      messages: ((raw.data ?? []) as any[]).map(mapMessage),
      aPlusAncien: !!raw.a_plus_ancien,
    };
  }

  public async sendMessage(projetId: number, contenu: string): Promise<Message> {
    const raw = await this.request<any>(`/projets/${projetId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ contenu }),
    });
    return mapMessage(raw);
  }

  // Suppression : l'auteur, un chef de projet ou l'admin
  public async deleteMessage(id: number): Promise<void> {
    await this.request(`/messages/${id}`, { method: 'DELETE' });
  }

  // --- Notifications ---
  // Les 20 plus récentes
  public async getNotifications(): Promise<NotificationItem[]> {
    const raw = await this.request<any>('/notifications');
    return ((raw.data ?? []) as any[]).map(mapNotification);
  }

  // Toutes les notifications (page dédiée)
  public async getAllNotifications(): Promise<NotificationItem[]> {
    const items = await this.requestAll<any>('/notifications');
    return items.map(mapNotification);
  }

  // Nombre de notifications non lues (le total de la liste filtrée)
  public async getUnreadCount(): Promise<number> {
    const raw = await this.request<any>('/notifications?non_lues=1');
    return Number(raw.total ?? 0);
  }

  public async markNotificationRead(id: string): Promise<void> {
    await this.request(`/notifications/${id}/lu`, { method: 'PATCH' });
  }

  public async markAllNotificationsRead(): Promise<void> {
    await this.request('/notifications/lu', { method: 'POST' });
  }

  // --- Fonctions et annuaire ---
  public async getFonctions(): Promise<Fonction[]> {
    return this.request<Fonction[]>('/fonctions');
  }

  // Recherche dans l'annuaire (admin et chefs de projet) : GET /personnels?q=
  public async searchPersonnel(q: string): Promise<Personnel[]> {
    const raw = await this.request<any>(q ? `/personnels?q=${encodeURIComponent(q)}` : '/personnels');
    return ((raw.data ?? raw) as any[])
      .map((p) => mapPersonnel(p))
      .filter((p): p is Personnel => p !== null);
  }

  // --- Administration des comptes ---
  public async getUsers(): Promise<User[]> {
    const items = await this.requestAll<any>('/users');
    return items.map(mapUser);
  }

  // Activation / désactivation d'un compte (administrateur). Désactiver coupe aussi les sessions ouvertes.
  public async setUserActive(userId: number, active: boolean): Promise<User> {
    const raw = await this.request<any>(`/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ statut: active ? 'actif' : 'inactif' }),
    });
    return mapUser(raw);
  }
}

export const api = new ApiService();