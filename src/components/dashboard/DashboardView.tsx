import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Projet, Tache } from '../../types/sgp';
import { ProgressBar } from '../common/ProgressBar';
import { ProjectStatusBadge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { formatJour } from '../../utils/format';
import { FolderKanban, AlertCircle } from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (route: string, params?: any) => void;
}

const aujourdhui = () => new Date().toISOString().split('T')[0];

const dateDuJour = () => {
  const texte = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
};

// Carte « répartition » : total, barre segmentée et légende
const RepartitionTaches: React.FC<{
  titre: string;
  terminees: number;
  enCours: number;
  annulees: number;
  enRetard: number;
}> = ({ titre, terminees, enCours, annulees, enRetard }) => {
  const total = terminees + enCours + annulees;

  const segments = [
    { label: 'Terminées', n: terminees, bar: 'bg-emerald-700', text: 'text-emerald-700' },
    { label: 'En cours', n: enCours, bar: 'bg-brand-700', text: 'text-brand-700' },
    { label: 'Annulées', n: annulees, bar: 'bg-slate-300', text: 'text-slate-500' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 h-fit">
      <h2 className="text-sm font-bold text-slate-900">{titre}</h2>

      <div className="mt-4 flex items-end justify-between">
        <span className="text-4xl font-bold tabular-nums text-slate-900">{total}</span>
        <span className="text-[11px] text-slate-500 pb-1.5">
          {total > 1 ? 'tâches au total' : 'tâche au total'}
        </span>
      </div>

      <div
        className="mt-4 flex gap-1 h-2"
        role="img"
        aria-label={segments.map((s) => `${s.label} : ${s.n}`).join(', ')}
      >
        {total === 0 ? (
          <div className="flex-1 rounded-full bg-slate-100" />
        ) : (
          segments
            .filter((s) => s.n > 0)
            .map((s) => (
              <div key={s.label} className={`rounded-full ${s.bar}`} style={{ flex: s.n }} />
            ))
        )}
      </div>

      <div className="mt-4 space-y-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between text-xs">
            <span className={`font-medium ${s.text}`}>
              {s.label}
              {s.label === 'En cours' && enRetard > 0 && (
                <span className="ml-2 text-[11px] font-semibold text-rose-600">dont {enRetard} en retard</span>
              )}
            </span>
            <span className="font-semibold tabular-nums text-slate-700">{s.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user, personnel, isAdmin } = useAuth();

  const [projets, setProjets] = useState<Projet[]>([]);
  const [taches, setTaches] = useState<Tache[]>([]);
  const [aDesTaches, setADesTaches] = useState(false); // faux pour un compte sans fiche personnel (admin)
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoadError(null);
    const [resProjets, resTaches] = await Promise.allSettled([api.getProjets(), api.getMyTasks()]);

    if (resProjets.status === 'fulfilled') {
      setProjets(resProjets.value);
    } else {
      setLoadError(resProjets.reason?.message || 'Impossible de charger le tableau de bord.');
    }

    if (resTaches.status === 'fulfilled') {
      setTaches(resTaches.value);
      setADesTaches(true);
    } else {
      // 404 : pas de fiche personnel. Toute autre erreur : on masque simplement la partie « tâches ».
      setTaches([]);
      setADesTaches(false);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const today = aujourdhui();
  const enCours = projets.filter((p) => p.statut === 'en_cours');
  const termines = projets.filter((p) => p.statut === 'termine');
  const annules = projets.filter((p) => p.statut === 'annule');
  const avancementMoyen =
    enCours.length > 0
      ? Math.round(enCours.reduce((somme, p) => somme + (p.taux_avancement ?? 0), 0) / enCours.length)
      : 0;

  const mesEnCours = taches.filter((t) => t.statut === 'en_cours');
  const mesEnRetard = mesEnCours.filter((t) => t.date_echeance < today);
  const mesTerminees = taches.filter((t) => t.statut === 'termine');
  const mesAnnulees = taches.filter((t) => t.statut === 'annule');
  const prochaines = [...mesEnCours].sort((a, b) => a.date_echeance.localeCompare(b.date_echeance)).slice(0, 5);

  const projetsParEcheance = [...enCours]
    .sort((a, b) => a.date_fin_prevue.localeCompare(b.date_fin_prevue))
    .slice(0, 5);

  // Somme d'un compteur de tâches sur tous les projets visibles (admin)
  const somme = (champ: 'taches_en_cours' | 'taches_terminees' | 'taches_annulees' | 'taches_en_retard') =>
    projets.reduce((total, p) => total + (p[champ] ?? 0), 0);

  const prenom = personnel?.prenom || user?.name || '';

  type Kpi = { label: string; value: string | number; valueClass?: string; onClick?: () => void };

  const kpis: Kpi[] = aDesTaches
    ? [
        { label: 'Projets en cours', value: enCours.length, onClick: () => onNavigate('projets') },
        { label: 'Mes tâches en cours', value: mesEnCours.length, onClick: () => onNavigate('mes-taches') },
        {
          label: 'Tâches en retard',
          value: mesEnRetard.length,
          valueClass: mesEnRetard.length > 0 ? 'text-rose-600' : undefined,
          onClick: () => onNavigate('mes-taches', { filter: 'overdue' }),
        },
        { label: 'Tâches terminées', value: mesTerminees.length, onClick: () => onNavigate('mes-taches') },
      ]
    : [
        { label: 'Projets en cours', value: enCours.length, onClick: () => onNavigate('projets') },
        { label: 'Projets terminés', value: termines.length, onClick: () => onNavigate('projets') },
        { label: 'Avancement moyen', value: `${avancementMoyen} %` },
        { label: 'Projets au total', value: projets.length, onClick: () => onNavigate('projets') },
      ];

  const ligneProjet = (p: Projet) => (
    <button
      key={p.id}
      onClick={() => onNavigate('project-detail', { id: p.id })}
      className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-900 truncate">{p.titre}</span>
        <ProjectStatusBadge status={p.statut} />
      </div>
      <div className="mt-2">
        <ProgressBar
          progress={p.taux_avancement ?? 0}
          size="sm"
          colorClass={(p.taux_avancement ?? 0) >= 100 ? 'bg-emerald-600' : 'bg-brand-700'}
        />
      </div>
      <div className="mt-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
        Échéance {formatJour(p.date_fin_prevue)}
      </div>
    </button>
  );

  const lienSection = 'text-xs font-medium text-brand-800 hover:text-brand-950';

  // Nouvel inscrit : pas encore de projet ni de tâche
  const nouvelArrivant = !isLoading && !loadError && !isAdmin && projets.length === 0 && taches.length === 0;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Bonjour{prenom ? `, ${prenom}` : ''}
          </h1>
          <p className="text-xs text-slate-500 mt-1">{dateDuJour()}</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => onNavigate('projects-new')}
            className="px-3.5 py-2 text-xs font-medium text-white bg-brand-800 hover:bg-brand-900 rounded-lg transition-colors shadow-xs shrink-0"
          >
            Nouveau projet
          </button>
        )}
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
                  <p className="text-[11px] font-medium text-slate-500">{k.label}</p>
                  <p className={`text-3xl font-bold tabular-nums mt-2 ${k.valueClass ?? 'text-slate-900'}`}>
                    {k.value}
                  </p>
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
            {/* Colonne principale */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 h-fit">
              {aDesTaches ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-slate-900">Mes prochaines échéances</h2>
                    <button onClick={() => onNavigate('mes-taches')} className={lienSection}>
                      Toutes mes tâches
                    </button>
                  </div>

                  {prochaines.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">Aucune tâche en cours.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {prochaines.map((t) => {
                        const retard = t.date_echeance < today;
                        return (
                          <button
                            key={t.id}
                            onClick={() => onNavigate('project-detail', { id: t.projet_id, tab: 'taches' })}
                            className="w-full flex items-center justify-between gap-3 py-3 text-left hover:bg-slate-50 px-2 -mx-2 rounded-lg transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">{t.titre}</p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {t.projet?.titre ?? `Projet #${t.projet_id}`}
                              </p>
                            </div>
                            <span
                              className={`text-[11px] font-mono tabular-nums whitespace-nowrap ${
                                retard ? 'text-rose-700 font-semibold' : 'text-slate-600'
                              }`}
                            >
                              {retard && 'En retard · '}
                              {formatJour(t.date_echeance)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-slate-900">Projets en cours</h2>
                    <button onClick={() => onNavigate('projets')} className={lienSection}>
                      Tous les projets
                    </button>
                  </div>
                  {projetsParEcheance.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">Aucun projet en cours.</p>
                  ) : (
                    <div className="space-y-1">{projetsParEcheance.map(ligneProjet)}</div>
                  )}
                </>
              )}
            </div>

            {/* Colonne latérale */}
            <div className="space-y-6">
              {aDesTaches ? (
                <>
                  <RepartitionTaches
                    titre="Répartition de mes tâches"
                    terminees={mesTerminees.length}
                    enCours={mesEnCours.length}
                    annulees={mesAnnulees.length}
                    enRetard={mesEnRetard.length}
                  />

                  <div className="bg-white rounded-xl border border-slate-200 p-5 h-fit">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-bold text-slate-900">Mes projets</h2>
                      <button onClick={() => onNavigate('projets')} className={lienSection}>
                        Voir tout
                      </button>
                    </div>
                    {projetsParEcheance.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">Aucun projet en cours.</p>
                    ) : (
                      <div className="space-y-1">{projetsParEcheance.slice(0, 4).map(ligneProjet)}</div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 h-fit">
                    <h2 className="text-sm font-bold text-slate-900 mb-4">Répartition des projets</h2>
                    <div className="space-y-4">
                      {[
                        { label: 'En cours', n: enCours.length, bar: 'bg-brand-700' },
                        { label: 'Terminés', n: termines.length, bar: 'bg-emerald-600' },
                        { label: 'Annulés', n: annules.length, bar: 'bg-slate-400' },
                      ].map((ligne) => (
                        <div key={ligne.label}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-600">{ligne.label}</span>
                            <span className="font-semibold tabular-nums text-slate-900">{ligne.n}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${ligne.bar}`}
                              style={{ width: `${projets.length ? (ligne.n / projets.length) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <RepartitionTaches
                    titre="Répartition des tâches"
                    terminees={somme('taches_terminees')}
                    enCours={somme('taches_en_cours')}
                    annulees={somme('taches_annulees')}
                    enRetard={somme('taches_en_retard')}
                  />
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};