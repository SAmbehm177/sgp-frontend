/**
 * SGP - Système de Gestion de Projet
 * Application React & Tailwind CSS responsive
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProjectsListView } from './components/projects/ProjectsListView';
import { ProjectDetailView } from './components/projects/ProjectDetailView';
import { MyTasksView } from './components/tasks/MyTasksView';
import { AdminView } from './components/admin/AdminView';
import { ProfileView } from './components/profile/ProfileView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { LoginView } from './components/auth/LoginView';
import { ForcePasswordChangeView } from './components/auth/ForcePasswordChangeView';
import { NavigateFn, Route, parseHash, toHash } from './router';

interface Breadcrumb {
  label: string;
  onClick?: () => void;
}

// L'URL (hash) est la seule source de vérité de la navigation : pas d'état dupliqué à garder synchronisé
function subscribeHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash);
  return useMemo(() => parseHash(hash), [hash]);
}

const LIBELLES_FIXES: Partial<Record<Route['name'], string>> = {
  dashboard: 'Tableau de bord',
  projets: 'Projets',
  'mes-taches': 'Mes tâches',
  notifications: 'Notifications',
  administration: 'Administration',
  profile: 'Mon profil',
};

function construireFilAriane(
  route: Route,
  projetTitre: { id: number; titre: string } | null,
  navigate: NavigateFn
): Breadcrumb[] {
  const versProjets = () => navigate('projets');

  if (route.name === 'projects-new') {
    return [{ label: 'Projets', onClick: versProjets }, { label: 'Nouveau projet' }];
  }
  if (route.name === 'project-detail') {
    const titre = projetTitre && projetTitre.id === route.params.id ? projetTitre.titre : 'Projet';
    return [{ label: 'Projets', onClick: versProjets }, { label: titre }];
  }
  const label = LIBELLES_FIXES[route.name];
  return label ? [{ label }] : [];
}

function AppContent() {
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();
  const route = useHashRoute();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projetTitre, setProjetTitre] = useState<{ id: number; titre: string } | null>(null);

  const navigate = useCallback<NavigateFn>((name, params = {}) => {
    window.location.hash = toHash(name, params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Gardes de navigation : session requise, puis droits administrateur pour la création de projet
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      if (route.name !== 'connexion') navigate('connexion');
    } else if (route.name === 'connexion') {
      navigate('dashboard');
    } else if (route.name === 'projects-new' && !isAdmin) {
      navigate('projets');
    }
  }, [isAuthenticated, isLoading, isAdmin, route.name, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-brand-800 rounded-full animate-spin" />
        <p className="text-xs text-slate-500 mt-3 font-medium">Chargement du SGP...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onSuccess={() => navigate('dashboard')} />;
  }

  // Mot de passe provisoire : l'application reste fermée tant qu'il n'est pas remplacé
  if (user?.must_change_password) {
    return <ForcePasswordChangeView />;
  }

  const { name, params } = route;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentRoute={name}
        onNavigate={navigate}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-50">
        <Navbar
          onToggleSidebar={() => setSidebarOpen((ouvert) => !ouvert)}
          currentRoute={name}
          onNavigate={navigate}
          breadcrumbs={construireFilAriane(route, projetTitre, navigate)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {name === 'dashboard' && <DashboardView onNavigate={navigate} />}
          {name === 'projets' && <ProjectsListView onNavigate={navigate} />}
          {name === 'projects-new' && isAdmin && (
            <ProjectsListView onNavigate={navigate} openCreateImmediately />
          )}
          {name === 'project-detail' && params.id !== undefined && (
            <ProjectDetailView
              projetId={params.id}
              initialTab={params.tab ?? 'vue-ensemble'}
              onNavigate={navigate}
              onTitreChange={(id, titre) => setProjetTitre({ id, titre })}
            />
          )}
          {name === 'mes-taches' && <MyTasksView onNavigate={navigate} initialFilter={params.filter} />}
          {name === 'notifications' && <NotificationsView onNavigate={navigate} />}
          {name === 'administration' && <AdminView />}
          {name === 'profile' && <ProfileView onNavigate={navigate} />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <NotificationsProvider>
          <AppContent />
        </NotificationsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
