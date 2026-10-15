import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { api } from '../../services/api';
import { Projet, Tache } from '../../types/sgp';
import { ProgressBar } from '../common/ProgressBar';
import { TaskStatusBadge, TaskPriorityBadge, ProjectStatusBadge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { formatJour } from '../../utils/format';
import { FolderKanban, AlertCircle } from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (route: string, params?: any) => void;
}

const aujourdhui = () => new Date().toISOString().split('T')[0];

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user, personnel, isAdmin } = useAuth();
  const { unreadCount } = useNotifications();

  // « Mode membre » : le compte a une fiche personnel, donc des tâches qui lui sont confiées.
  // Un administrateur sans fiche voit à la place les tâches de tous les projets.
  const modeMembre = !!personnel;

  const [projets, setProjets] = useState<Projet[]>([]);
  const [taches, setTaches] = useState<Tache[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoadError(null);
    const [resProjets, resTaches] = await Promise.allSettled([
      api.getProjets(),
      modeMembre ? api.getMyTasks() : isAdmin ? api.getUpcomingTasks() : Promise.resolve([] as Tache[]),
    ]);

    if (resProjets.status === 'fulfilled') {
      setProjets(resProjets.value);
    } else {
      setLoadError(resProjets.reason?.message || 'Impossible de charger le tableau de bord.');
    }

    // Si seules les tâches échouent, on affiche simplement une liste vide
    setTaches(resTaches.status === 'fulfilled' ? resTaches.value : []);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const today = aujourdhui();

  // Projets
  const actifs = projets.filter((p) => p.statut === 'en_cours');
  const recents = projets.slice(0, 3); // l'API renvoie les plus récents d'abord

  // Compteurs de tâches : les miennes (membre) ou celles de tous les projets (admin)
  const somme = (champ: 'taches_en_cours' | 'taches_en_retard') =>
    projets.reduce((total, p) => total + (p[champ] ?? 0), 0);

  const mesEnCours = taches.filter((t) => t.statut === 'en_cours');
  const mesEnRetard = mesEnCours.filter((t) => t.date_echeance < today);

  const compteurs = modeMembre
    ? {
        enCours: mesEnCours.length,
        enRetard: mesEnRetard.length,
      }
    : {
        enCours: somme('taches_en_cours'),
        enRetard: somme('taches_en_retard'),
      };

  const aEcheanceProche = [...mesEnCours]
    .sort((a, b) => a.date_echeance.localeCompare(b.date_echeance))
    .slice(0, 5);

  // Nouvel inscrit : pas encore de projet ni de tâche
  const nouvelArrivant = !isLoading && !loadError && !isAdmin && projets.length === 0 && taches.length === 0;

  type Kpi = {
    label: string;
    value: number;
    detail: string;
    valueClass?: string;
    detailClass?: string;
    onClick?: () => void;
  };

  const kpis: Kpi[] = [
    {
      label: 'Projets actifs',
      value: actifs.length,
      detail: `Sur ${projets.length} projet${projets.length > 1 ? 's' : ''} au total`,
      onClick: () => onNavigate('projets'),
    },
    {
      label: modeMembre ? 'Mes tâches en cours' : 'Tâches en cours',
      value: compteurs.enCours,
      detail: modeMembre ? 'À traiter et clôturer' : 'Tous projets confondus',
      onClick: modeMembre ? () => onNavigate('mes-taches') : undefined,
    },
    {
      label: 'Tâches en retard',
      value: compteurs.enRetard,
      detail: 'Échéance dépassée',
      valueClass: compteurs.enRetard > 0 ? 'text-rose-600' : undefined,
      detailClass: compteurs.enRetard > 0 ? 'text-rose-500' : undefined,
      onClick: modeMembre ? () => onNavigate('mes-taches', { filter: 'overdue' }) : undefined,
    },
    {
      label: 'Notifications',
      value: unreadCount,
      detail: unreadCount > 0 ? 'Messages non lus' : 'À jour',
      onClick: () => onNavigate('notifications'),
    },
  ];

  const lienSection = 'text-xs font-medium text-brand-800 hover:text-brand-950 transition-colors';

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Tableau de bord</h1>
          <p className="text-xs text-slate-500 mt-1">
            Bienvenue, <span className="font-semibold text-slate-700">{user?.name}</span>. Vue d'ensemble de vos
            projets et échéances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => onNavigate('projects-new')}
              className="px-3.5 py-2 text-xs font-medium text-white bg-brand-800 hover:bg-brand-900 rounded-lg transition-colors shadow-xs"
            >
              Nouveau projet
            </button>
          )}
          {modeMembre && (
            <button
              onClick={() => onNavigate('mes-taches')}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Mes tâches
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 p-4 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={() => {
              setIsLoading(true);
              load();
            }}
            className="px-3 py-1.5 font-medium text-rose-800 bg-white border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors shrink-0"
          >
            Réessayer
          </button>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      )}

      {nouvelArrivant && (
        <EmptyState
          icon={<FolderKanban className="w-6 h-6" />}
          title="Bienvenue sur SGP"
          description="Vous n'appartenez encore à aucun projet. Un chef de projet ou un administrateur doit vous ajouter pour que vos projets et vos tâches apparaissent ici."
        />
      )}

      {!isLoading && !loadError && !nouvelArrivant && (
        <>
          {/* Indicateurs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((k) => {
              const contenu = (
                <>
                  <span className="text-xs font-medium text-slate-500">{k.label}</span>
                  <p className={`text-2xl font-bold font-mono tabular-nums mt-2 ${k.valueClass ?? 'text-slate-900'}`}>
                    {k.value}
                  </p>
                  <p className={`text-[11px] mt-1 ${k.detailClass ?? 'text-slate-400'}`}>{k.detail}</p>
                </>
              );

              return k.onClick ? (
                <button
                  key={k.label}
                  onClick={k.onClick}
                  className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-brand-200 hover:shadow-xs transition-all"
                >
                  {contenu}
                </button>
              ) : (
                <div key={k.label} className="bg-white p-4 rounded-xl border border-slate-200">
                  {contenu}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tâches à échéance proche */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 h-fit">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {modeMembre ? 'Mes tâches à échéance proche' : 'Tâches à échéance proche'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Triées par date d'échéance la plus urgente.</p>
                </div>
                {modeMembre && (
                  <button onClick={() => onNavigate('mes-taches')} className={lienSection}>
                    Voir tout
                  </button>
                )}
              </div>

              <div className="mt-3 divide-y divide-slate-100">
                {aEcheanceProche.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Aucune tâche en cours actuellement.
                  </div>
                ) : (
                  aEcheanceProche.map((tache) => {
                    const enRetard = tache.date_echeance < today;

                    return (
                      <button
                        key={tache.id}
                        onClick={() => onNavigate('project-detail', { id: tache.projet_id, tab: 'taches' })}
                        className="w-full text-left py-3 px-2 rounded-lg hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <TaskPriorityBadge priority={tache.priorite} />
                            <h3 className="text-xs font-semibold text-slate-900 truncate">{tache.titre}</h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500 mt-1">
                            <span className="text-brand-800 font-medium truncate max-w-[200px]">
                              {tache.projet?.titre ?? `Projet #${tache.projet_id}`}
                            </span>
                            {!modeMembre && tache.responsable && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>
                                  {tache.responsable.prenom} {tache.responsable.nom}
                                </span>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <span className={`font-mono ${enRetard ? 'text-rose-600 font-bold' : ''}`}>
                              Échéance : {formatJour(tache.date_echeance)}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <TaskStatusBadge status={tache.statut} isOverdue={enRetard} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Colonne latérale */}
            <div className="space-y-6">
              {/* Projets récents */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 h-fit">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Projets récents</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Avancement et chef de projet</p>
                  </div>
                  <button onClick={() => onNavigate('projets')} className={lienSection}>
                    Tous
                  </button>
                </div>

                <div className="mt-3 space-y-4">
                  {recents.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">Aucun projet pour le moment.</p>
                  ) : (
                    recents.map((projet) => {
                      const terminees = projet.taches_terminees ?? 0;
                      const nonAnnulees = (projet.taches_en_cours ?? 0) + terminees;
                      const chefs = projet.chefs_noms ?? [];
                      const taux = projet.taux_avancement ?? 0;

                      return (
                        <button
                          key={projet.id}
                          onClick={() => onNavigate('project-detail', { id: projet.id })}
                          className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{projet.titre}</h3>
                            <ProjectStatusBadge status={projet.statut} />
                          </div>

                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                            {projet.description || 'Aucune description.'}
                          </p>

                          <div className="mt-3">
                            <ProgressBar
                              progress={taux}
                              size="sm"
                              colorClass={taux >= 100 ? 'bg-emerald-600' : 'bg-brand-700'}
                            />
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                            <span className="truncate max-w-[150px]">
                              {chefs.length > 0 ? `Chef : ${chefs.join(', ')}` : 'Sans chef'}
                            </span>
                            <span className="font-mono tabular-nums text-slate-600 shrink-0">
                              {terminees}/{nonAnnulees} tâches
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};