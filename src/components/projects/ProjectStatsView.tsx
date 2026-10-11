import React from 'react';
import { sgpStorage } from '../../services/storage';
import { ProgressBar } from '../common/ProgressBar';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  BarChart3,
  Users,
  Target,
} from 'lucide-react';

interface ProjectStatsViewProps {
  projetId: number;
}

export const ProjectStatsView: React.FC<ProjectStatsViewProps> = ({ projetId }) => {
  const stats = sgpStorage.getStatistiquesProjet(projetId);
  const tasks = sgpStorage.getTachesByProjet(projetId);
  const members = sgpStorage.getMembresByProjet(projetId).filter((m) => m.statut === 'actif');

  // Breakdown by priority
  const priorityCounts = {
    urgente: tasks.filter((t) => t.priorite === 'urgente').length,
    haute: tasks.filter((t) => t.priorite === 'haute').length,
    moyenne: tasks.filter((t) => t.priorite === 'moyenne').length,
    basse: tasks.filter((t) => t.priorite === 'basse').length,
  };

  // Workload per member
  const memberWorkload = members.map((m) => {
    const memberTasks = tasks.filter((t) => t.responsable_id === m.personnel_id);
    const completed = memberTasks.filter((t) => t.statut === 'termine').length;
    const ongoing = memberTasks.filter((t) => t.statut === 'en_cours').length;
    const today = new Date().toISOString().split('T')[0];
    const late = memberTasks.filter((t) => t.statut !== 'termine' && t.date_echeance < today).length;

    return {
      name: `${m.personnel?.prenom} ${m.personnel?.nom}`,
      poste: m.personnel?.poste,
      fonction: m.fonction?.libelle,
      total: memberTasks.length,
      completed,
      ongoing,
      late,
      rate: memberTasks.length > 0 ? Math.round((completed / memberTasks.length) * 100) : 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Taux global */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Taux d'avancement</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {stats.taux_avancement}%
          </p>
          <div className="mt-2">
            <ProgressBar progress={stats.taux_avancement} size="sm" showLabel={false} />
          </div>
        </div>

        {/* Tâches terminées */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tâches terminées</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold font-mono tabular-nums text-emerald-700 mt-2">
            {stats.taches_terminees}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">
            Sur {stats.total_taches} tâches totales
          </span>
        </div>

        {/* Tâches en cours */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tâches en cours</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {stats.taches_en_cours}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">En cours de traitement</span>
        </div>

        {/* Tâches en retard (Section 5.8 & 11) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tâches en retard</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-3xl font-bold font-mono tabular-nums text-rose-600 mt-2">
            {stats.taches_en_retard}
          </p>
          <span className="text-[11px] text-rose-500 mt-1 block font-medium">
            Échéance dépassée non clôturée
          </span>
        </div>
      </div>

      {/* Visual Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Répartition par Statut */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              Répartition par statut
            </h3>
            <span className="text-xs text-slate-500 font-mono">{stats.total_taches} total</span>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Terminées</span>
                <span className="font-mono tabular-nums text-slate-800">
                  {stats.taches_terminees} ({stats.total_taches > 0 ? Math.round((stats.taches_terminees / stats.total_taches) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full"
                  style={{
                    width: `${stats.total_taches > 0 ? (stats.taches_terminees / stats.total_taches) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">En cours</span>
                <span className="font-mono tabular-nums text-slate-800">
                  {stats.taches_en_cours} ({stats.total_taches > 0 ? Math.round((stats.taches_en_cours / stats.total_taches) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{
                    width: `${stats.total_taches > 0 ? (stats.taches_en_cours / stats.total_taches) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">En retard</span>
                <span className="font-mono tabular-nums text-rose-600 font-semibold">
                  {stats.taches_en_retard} ({stats.total_taches > 0 ? Math.round((stats.taches_en_retard / stats.total_taches) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-rose-600 h-2 rounded-full"
                  style={{
                    width: `${stats.total_taches > 0 ? (stats.taches_en_retard / stats.total_taches) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Annulées</span>
                <span className="font-mono tabular-nums text-slate-800">
                  {stats.taches_annulees} ({stats.total_taches > 0 ? Math.round((stats.taches_annulees / stats.total_taches) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-slate-400 h-2 rounded-full"
                  style={{
                    width: `${stats.total_taches > 0 ? (stats.taches_annulees / stats.total_taches) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Répartition par Priorité */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              Répartition par priorité
            </h3>
            <span className="text-xs text-slate-500">Volume</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/40">
              <span className="text-rose-700 font-semibold block">Urgente</span>
              <p className="text-xl font-bold font-mono text-rose-900 mt-1">
                {priorityCounts.urgente}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-orange-200 bg-orange-50/40">
              <span className="text-orange-700 font-semibold block">Haute</span>
              <p className="text-xl font-bold font-mono text-orange-900 mt-1">
                {priorityCounts.haute}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-sky-200 bg-sky-50/40">
              <span className="text-sky-700 font-semibold block">Moyenne</span>
              <p className="text-xl font-bold font-mono text-sky-900 mt-1">
                {priorityCounts.moyenne}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/40">
              <span className="text-slate-600 font-semibold block">Basse</span>
              <p className="text-xl font-bold font-mono text-slate-800 mt-1">
                {priorityCounts.basse}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charge de travail par collaborateur */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            Charge et avancement par collaborateur
          </h3>
          <span className="text-xs text-slate-500">{members.length} membres actifs</span>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {memberWorkload.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Aucun membre affecté à ce projet.
            </div>
          ) : (
            memberWorkload.map((m, idx) => (
              <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <span>{m.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({m.fonction})</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block">{m.poste}</span>
                </div>

                <div className="flex items-center gap-4 sm:justify-end">
                  <div className="text-right">
                    <span className="font-mono tabular-nums font-semibold text-slate-800 block">
                      {m.completed}/{m.total} terminées
                    </span>
                    {m.late > 0 && (
                      <span className="text-[10px] text-rose-600 font-semibold block">
                        {m.late} en retard
                      </span>
                    )}
                  </div>

                  <div className="w-24">
                    <ProgressBar progress={m.rate} size="sm" showLabel={false} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
