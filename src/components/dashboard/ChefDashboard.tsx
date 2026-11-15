import React, { useMemo } from 'react';
import { Projet } from '../../types/sgp';
import { joursDeRetard } from '../../utils/format';
import {
  Card,
  DashboardData,
  EcheancesCard,
  GraphiquesZone,
  Kpi,
  KpiGrid,
} from './DashboardParts';
import { ProjectProgressComparison } from './ProjectProgressComparison';
import { StatusDonut } from './StatusDonut';

interface ChefDashboardProps extends DashboardData {
  geres: Projet[]; // projets dont je suis chef
}

interface ChargeMembre {
  id: number;
  nom: string;
  terminees: number;
  enCoursOk: number;
  enRetard: number;
  total: number;
}

// Chef de projet : « mon équipe est-elle dans les temps ? »
export const ChefDashboard: React.FC<ChefDashboardProps> = ({
  projets,
  geres,
  taches,
  tachesProjets,
  graphiquesLoading,
  graphiquesPartiels,
  personnel,
  unreadCount,
  today,
  onNavigate,
}) => {
  const somme = (champ: 'taches_en_retard' | 'taches_terminees' | 'taches_en_cours') =>
    geres.reduce((total, p) => total + (p[champ] ?? 0), 0);

  const enRetardTotal = somme('taches_en_retard');
  const terminees = somme('taches_terminees');
  const actives = terminees + somme('taches_en_cours');

  // Tâches de mes projets dirigés (déjà chargées pour les graphiques)
  const tachesGerees = useMemo(() => {
    const ids = new Set(geres.map((p) => p.id));
    return tachesProjets.filter((t) => ids.has(t.projet_id));
  }, [geres, tachesProjets]);

  // Charge par membre, calculée sur mes projets (tâches annulées exclues, comme côté API)
  const charge = useMemo<ChargeMembre[]>(() => {
    const parMembre = new Map<number, ChargeMembre>();

    tachesGerees.forEach((t) => {
      if (t.statut === 'annule') return;
      const ligne = parMembre.get(t.responsable_id) ?? {
        id: t.responsable_id,
        nom: t.responsable ? `${t.responsable.prenom} ${t.responsable.nom}` : `Responsable #${t.responsable_id}`,
        terminees: 0,
        enCoursOk: 0,
        enRetard: 0,
        total: 0,
      };
      ligne.total += 1;
      if (t.statut === 'termine') ligne.terminees += 1;
      else if (t.date_echeance < today) ligne.enRetard += 1;
      else ligne.enCoursOk += 1;
      parMembre.set(t.responsable_id, ligne);
    });

    return Array.from(parMembre.values()).sort(
      (a, b) => b.enRetard - a.enRetard || b.total - b.terminees - (a.total - a.terminees)
    );
  }, [tachesGerees, today]);

  // Tâches en retard à relancer, les plus anciennes d'abord
  const aRelancer = useMemo(
    () =>
      tachesGerees
        .filter((t) => t.statut === 'en_cours' && t.date_echeance < today)
        .sort((a, b) => a.date_echeance.localeCompare(b.date_echeance))
        .slice(0, 6),
    [tachesGerees, today]
  );

  const kpis: Kpi[] = [
    {
      label: 'Projets que je dirige',
      value: geres.length,
      detail: `Sur ${projets.length} projet${projets.length > 1 ? 's' : ''} au total`,
      onClick: () => onNavigate('projets'),
    },
    {
      label: 'Retards dans mes projets',
      value: enRetardTotal,
      detail: 'Échéance dépassée',
      valueClass: enRetardTotal > 0 ? 'text-rose-600' : undefined,
      detailClass: enRetardTotal > 0 ? 'text-rose-500' : undefined,
    },
    {
      label: 'Tâches terminées',
      value: terminees,
      detail: `Sur ${actives} tâche${actives > 1 ? 's' : ''} non annulée${actives > 1 ? 's' : ''}`,
    },
    {
      label: 'Notifications',
      value: unreadCount,
      detail: unreadCount > 0 ? 'Messages non lus' : 'À jour',
      onClick: () => onNavigate('notifications'),
    },
  ];

  return (
    <>
      <KpiGrid kpis={kpis} />

      <GraphiquesZone loading={graphiquesLoading} partiels={graphiquesPartiels}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card title="Charge par membre" subtitle="Tâches non annulées sur les projets que vous dirigez.">
              {charge.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">Aucune tâche affectée pour le moment.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" aria-hidden="true" />
                      Terminées
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-blue-600" aria-hidden="true" />
                      En cours
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-rose-600" aria-hidden="true" />
                      En retard
                    </span>
                  </div>

                  {charge.slice(0, 8).map((m) => (
                    <div key={m.id}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-slate-800 truncate">{m.nom}</span>
                        <span className="font-mono tabular-nums text-slate-500 shrink-0">
                          {m.terminees}/{m.total}
                          {m.enRetard > 0 && <span className="text-rose-600 font-bold"> · {m.enRetard} en retard</span>}
                        </span>
                      </div>
                      <div
                        className="mt-1 flex h-2 rounded-full overflow-hidden bg-slate-100"
                        role="img"
                        aria-label={`${m.nom} : ${m.terminees} terminées, ${m.enCoursOk} en cours, ${m.enRetard} en retard`}
                      >
                        <div className="bg-emerald-600" style={{ width: `${(m.terminees / m.total) * 100}%` }} />
                        <div className="bg-blue-600" style={{ width: `${(m.enCoursOk / m.total) * 100}%` }} />
                        <div className="bg-rose-600" style={{ width: `${(m.enRetard / m.total) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  {charge.length > 8 && (
                    <p className="text-[11px] text-slate-400">+ {charge.length - 8} autre(s) membre(s)</p>
                  )}
                </div>
              )}
            </Card>
          </div>

          <Card title="Retards à relancer" subtitle="Les plus anciens d'abord.">
            {aRelancer.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">Aucun retard sur vos projets.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {aRelancer.map((t) => {
                  const jours = joursDeRetard(t.date_echeance);
                  return (
                    <button
                      key={t.id}
                      onClick={() => onNavigate('project-detail', { id: t.projet_id, tab: 'taches' })}
                      className="w-full text-left py-2.5 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <p className="text-xs font-semibold text-slate-900 truncate">{t.titre}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {t.responsable ? `${t.responsable.prenom} ${t.responsable.nom}` : 'Sans responsable'}
                        {' · '}
                        {geres.find((p) => p.id === t.projet_id)?.titre ?? `Projet #${t.projet_id}`}
                      </p>
                      <p className="text-[11px] font-mono text-rose-600 font-bold mt-0.5">
                        {jours} jour{jours > 1 ? 's' : ''} de retard
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <ProjectProgressComparison
          projets={projets}
          allTasks={tachesProjets}
          personnelId={personnel?.id}
          defaultScope="global"
          onNavigate={onNavigate}
        />
      </GraphiquesZone>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EcheancesCard
            titre="Mes tâches à échéance proche"
            taches={taches}
            today={today}
            afficherResponsable={false}
            voirTout
            onNavigate={onNavigate}
          />
        </div>
        {graphiquesLoading ? (
          <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" aria-busy="true" />
        ) : (
          <StatusDonut tasks={tachesGerees} today={today} titre="Répartition (mes projets)" />
        )}
      </div>
    </>
  );
};
