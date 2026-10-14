/**
 * SGP - Système de Gestion de Projet
 * Application React & Tailwind CSS responsive
 */

import React, { useState, useEffect } from 'react';
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
import { RegisterView } from './components/auth/RegisterView';

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Navigation state
  const [currentRoute, setCurrentRoute] = useState<string>('dashboard');
  const [routeParams, setRouteParams] = useState<any>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projetTitre, setProjetTitre] = useState<{ id: number; titre: string } | null>(null);

  // Synchronisation avec l'URL Hash pour le support des liens profonds
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (!hash) {
        setCurrentRoute('dashboard');
        return;
      }

      const parts = hash.split('/');
      const base = parts[0];

      if (base === 'connexion') {
        setCurrentRoute('connexion');
      } else if (base === 'inscription') {
        setCurrentRoute('inscription');
      } else if (base === 'projets') {
        if (parts[1] === 'nouveau') {
          setCurrentRoute('projects-new');
        } else if (parts[1]) {
          setCurrentRoute('project-detail');
          setRouteParams({ id: Number(parts[1]), tab: parts[2] || 'vue-ensemble' });
        } else {
          setCurrentRoute('projets');
        }
      } else if (base === 'mes-taches') {
        setCurrentRoute('mes-taches');
      } else if (base === 'notifications') {
        setCurrentRoute('notifications');
      } else if (base === 'administration') {
        setCurrentRoute('administration');
      } else if (base === 'profil') {
        setCurrentRoute('profile');
      } else {
        setCurrentRoute('dashboard');
      }
    };

    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  // Garde de session : sans session -> #/connexion ; avec session sur #/connexion -> tableau de bord
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const pagesPubliques = ['#/connexion', '#/inscription'];
      if (!pagesPubliques.includes(window.location.hash)) window.location.hash = '#/connexion';
    } else if (currentRoute === 'connexion' || currentRoute === 'inscription') {
      navigate('dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, currentRoute]);

  const navigate = (route: string, params: any = {}) => {
    setCurrentRoute(route);
    setRouteParams(params);

    // Update hash
    if (route === 'dashboard') window.location.hash = '#/tableau-de-bord';
    else if (route === 'projets') window.location.hash = '#/projets';
    else if (route === 'projects-new') window.location.hash = '#/projets/nouveau';
    else if (route === 'project-detail')
      window.location.hash = `#/projets/${params.id}${params.tab ? `/${params.tab}` : ''}`;
    else if (route === 'mes-taches') window.location.hash = '#/mes-taches';
    else if (route === 'notifications') window.location.hash = '#/notifications';
    else if (route === 'administration') window.location.hash = '#/administration';
    else if (route === 'profile') window.location.hash = '#/profil';
    else if (route === 'connexion') window.location.hash = '#/connexion';
    else if (route === 'inscription') window.location.hash = '#/inscription';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Breadcrumbs calculés pour le Top Bar Contract
  const getBreadcrumbs = () => {
    const crumbs: Array<{ label: string; onClick?: () => void }> = [];

    if (currentRoute === 'dashboard') {
      crumbs.push({ label: 'Tableau de bord' });
    } else if (currentRoute === 'projets') {
      crumbs.push({ label: 'Projets' });
    } else if (currentRoute === 'projects-new') {
      crumbs.push({ label: 'Projets', onClick: () => navigate('projets') });
      crumbs.push({ label: 'Nouveau projet' });
    } else if (currentRoute === 'project-detail') {
      crumbs.push({ label: 'Projets', onClick: () => navigate('projets') });
      crumbs.push({
        label: projetTitre && projetTitre.id === routeParams.id ? projetTitre.titre : 'Projet',
      });
    } else if (currentRoute === 'mes-taches') {
      crumbs.push({ label: 'Mes tâches' });
    } else if (currentRoute === 'notifications') {
      crumbs.push({ label: 'Notifications' });
    } else if (currentRoute === 'administration') {
      crumbs.push({ label: 'Administration' });
    } else if (currentRoute === 'profile') {
      crumbs.push({ label: 'Mon profil' });
    }

    return crumbs;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-brand-800 rounded-full animate-spin" />
        <p className="text-xs text-slate-500 mt-3 font-medium">Chargement du SGP...</p>
      </div>
    );
  }

  // Not authenticated -> show Login
  if (!isAuthenticated) {
    return currentRoute === 'inscription' ? (
      <RegisterView
        onSuccess={() => navigate('dashboard')}
        onGoToLogin={() => navigate('connexion')}
      />
    ) : (
      <LoginView
        onSuccess={() => navigate('dashboard')}
        onGoToRegister={() => navigate('inscription')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentRoute={currentRoute}
        onNavigate={(route) => navigate(route)}
      />

      {/* Main Viewport Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Navbar */}
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          currentRoute={currentRoute}
          onNavigate={(route, params) => navigate(route, params)}
          breadcrumbs={getBreadcrumbs()}
        />

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentRoute === 'dashboard' && <DashboardView onNavigate={navigate} />}

          {currentRoute === 'projets' && <ProjectsListView onNavigate={navigate} />}

          {currentRoute === 'projects-new' && (
            <ProjectsListView onNavigate={navigate} openCreateImmediately={true} />
          )}

          {currentRoute === 'project-detail' && (
            <ProjectDetailView
              projetId={routeParams.id}
              initialTab={routeParams.tab || 'vue-ensemble'}
              onNavigate={navigate}
              onTitreChange={(id, titre) => setProjetTitre({ id, titre })}
            />
          )}

          {currentRoute === 'mes-taches' && (
            <MyTasksView onNavigate={navigate} initialFilter={routeParams.filter} />
          )}

          {currentRoute === 'notifications' && <NotificationsView onNavigate={navigate} />}

          {currentRoute === 'administration' && <AdminView />}

          {currentRoute === 'profile' && <ProfileView onNavigate={navigate} />}
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