import React from 'react';
import { Personnel, Projet, RouteParams, Tache } from '../../types/sgp';
import { ProgressBar } from '../common/ProgressBar';
import { TaskStatusBadge, TaskPriorityBadge, ProjectStatusBadge } from '../common/Badge';
import { formatJour } from '../../utils/format';

type Naviguer = (route: string, params?: RouteParams) => void;

// Données chargées une fois par DashboardView et partagées par les trois tableaux de bord
export interface DashboardData {
  projets: Projet[];
  taches: Tache[]; // mes tâches (compte avec fiche) ou tâches à venir (admin sans fiche)
  tachesProjets: Tache[]; // toutes les tâches des projets visibles
  graphiquesLoading: boolean;
  graphiquesPartiels: boolean;
  personnel: Personnel | null;
  unreadCount: number;
  today: string;
  onNavigate: Naviguer;
}

export const lienSection = 'text-xs font-medium text-brand-800 hover:text-brand-950 transition-colors';

// --- Indicateurs ---

export type Kpi = {
  label: string;
  value: number | string;
  detail: string;
  valueClass?: string;
  detailClass?: string;
  onClick?: () => void;
};

export const KpiGrid: React.FC<{ kpis: Kpi[] }> = ({ kpis }) => (
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
);

// --- Carte générique ---

export const Card: React.FC<{
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, action, className = '', children }) => (
  <div className={`bg-white rounded-xl border border-slate-200 p-5 h-fit ${className}`}>
    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
      <div>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && (
        <button onClick={action.onClick} className={lienSection}>
          {action.label}
        </button>
      )}
    </div>
    <div className="mt-3">{children}</div>
  </div>
);

// --- Tâches à échéance proche ---

export const EcheancesCard: React.FC<{
  titre: string;
  taches: Tache[];
  today: string;
  afficherResponsable: boolean;
  voirTout?: boolean;
  onNavigate: Naviguer;
}> = ({ titre, taches, today, afficherResponsable, voirTout, onNavigate }) => {
  const aEcheanceProche = taches
    .filter((t) => t.statut === 'en_cours')
    .sort((a, b) => a.date_echeance.localeCompare(b.date_echeance))
    .slice(0, 5);

  return (
    <Card
      title={titre}
      subtitle="Triées par date d'échéance la plus urgente."
      action={voirTout ? { label: 'Voir tout', onClick: () => onNavigate('mes-taches') } : undefined}
    >
      <div className="divide-y divide-slate-100">
        {aEcheanceProche.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">Aucune tâche en cours actuellement.</div>
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
                    {afficherResponsable && tache.responsable && (
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
    </Card>
  );
};

// --- Projets récents ---

export const ProjetsRecentsCard: React.FC<{ projets: Projet[]; onNavigate: Naviguer }> = ({
  projets,
  onNavigate,
}) => {
  const recents = projets.slice(0, 3); // l'API renvoie les plus récents d'abord

  return (
    <Card
      title="Projets récents"
      subtitle="Avancement et chef de projet"
      action={{ label: 'Tous', onClick: () => onNavigate('projets') }}
    >
      <div className="space-y-4">
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
    </Card>
  );
};

// --- Zone des graphiques : squelette pendant le chargement des tâches, avertissement si incomplet ---

export const GraphiquesZone: React.FC<{
  loading: boolean;
  partiels: boolean;
  children: React.ReactNode;
}> = ({ loading, partiels, children }) => {
  if (loading) {
    return (
      <div
        className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse"
        aria-busy="true"
        aria-label="Chargement des graphiques"
      />
    );
  }

  return (
    <>
      {partiels && (
        <p role="status" className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Les tâches de certains projets n'ont pas pu être chargées : les graphiques peuvent être incomplets.
        </p>
      )}
      {children}
    </>
  );
};
