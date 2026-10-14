import React from 'react';
import { StatistiquesProjet, MembreProjet } from '../../types/sgp';
import { ProgressBar } from '../common/ProgressBar';

interface ProjectStatsViewProps {
  stats: StatistiquesProjet;
  membres: MembreProjet[];
}

export const ProjectStatsView: React.FC<ProjectStatsViewProps> = ({ stats, membres }) => {
  const total = stats.total_taches;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const statuts = [
    { label: 'Terminées', n: stats.taches_terminees, bar: 'bg-emerald-600', text: 'text-slate-800' },
    { label: 'En cours', n: stats.taches_en_cours, bar: 'bg-brand-700', text: 'text-slate-800' },
    { label: 'En retard', n: stats.taches_en_retard, bar: 'bg-rose-600', text: 'text-rose-600 font-semibold' },
    { label: 'Annulées', n: stats.taches_annulees, bar: 'bg-slate-400', text: 'text-slate-800' },
  ];

  const priorites = [
    { label: 'Haute', n: stats.par_priorite.haute, box: 'border-orange-200 bg-orange-50/40', titre: 'text-orange-700', valeur: 'text-orange-900' },
    { label: 'Moyenne', n: stats.par_priorite.moyenne, box: 'border-sky-200 bg-sky-50/40', titre: 'text-sky-700', valeur: 'text-sky-900' },
    { label: 'Basse', n: stats.par_priorite.basse, box: 'border-slate-200 bg-slate-50/40', titre: 'text-slate-600', valeur: 'text-slate-800' },
  ];

  // Tous les membres actifs, avec leur charge (0 s'ils n'ont pas encore de tâche)
  const charge = membres.map((m) => {
    const c = stats.charge_par_membre.find((x) => x.personnel_id === m.personnel_id);
    const totalMembre = c?.total ?? 0;
    const terminees = c?.terminees ?? 0;
    return {
      id: m.personnel_id,
      nom: `${m.personnel?.prenom ?? ''} ${m.personnel?.nom ?? ''}`.trim(),
      fonction: m.fonction?.libelle,
      poste: m.personnel?.poste,
      total: totalMembre,
      terminees,
      enRetard: c?.en_retard ?? 0,
      taux: totalMembre > 0 ? Math.round((terminees / totalMembre) * 100) : 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* Indicateurs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-medium text-slate-500">Taux d'avancement</span>
          <p className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-2">{stats.taux_avancement} %</p>
          <div className="mt-2">
            <ProgressBar
              progress={stats.taux_avancement}
              size="sm"
              showLabel={false}
              colorClass={stats.taux_avancement >= 100 ? 'bg-emerald-600' : 'bg-brand-700'}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-medium text-slate-500">Tâches terminées</span>
          <p className="text-3xl font-bold font-mono tabular-nums text-emerald-700 mt-2">{stats.taches_terminees}</p>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">Sur {total} tâches au total</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-medium text-slate-500">Tâches en cours</span>
          <p className="text-3xl font-bold font-mono tabular-nums text-brand-800 mt-2">{stats.taches_en_cours}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">En cours de traitement</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-medium text-slate-500">Tâches en retard</span>
          <p className="text-3xl font-bold font-mono tabular-nums text-rose-600 mt-2">{stats.taches_en_retard}</p>
          <span className="text-[11px] text-rose-500 mt-1 block font-medium">Échéance dépassée non clôturée</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Répartition par statut */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Répartition par statut</h3>
            <span className="text-xs text-slate-500 font-mono">{total} au total</span>
          </div>

          <div className="mt-4 space-y-3">
            {statuts.map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">{s.label}</span>
                  <span className={`font-mono tabular-nums ${s.text}`}>
                    {s.n} ({pct(s.n)} %)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className={`${s.bar} h-2 rounded-full`} style={{ width: `${pct(s.n)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Répartition par priorité */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Répartition par priorité</h3>
            <span className="text-xs text-slate-500">Volume</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            {priorites.map((p) => (
              <div key={p.label} className={`p-3 rounded-lg border ${p.box}`}>
                <span className={`${p.titre} font-semibold block`}>{p.label}</span>
                <p className={`text-xl font-bold font-mono mt-1 ${p.valeur}`}>{p.n}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charge par collaborateur */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Charge et avancement par collaborateur</h3>
          <span className="text-xs text-slate-500">
            {membres.length} membre{membres.length > 1 ? 's' : ''} actif{membres.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {charge.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">Aucun membre affecté à ce projet.</div>
          ) : (
            charge.map((m) => (
              <div
                key={m.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <span>{m.nom}</span>
                    {m.fonction && <span className="text-[10px] text-slate-400 font-normal">({m.fonction})</span>}
                  </div>
                  <span className="text-[11px] text-slate-500 block">{m.poste}</span>
                </div>

                <div className="flex items-center gap-4 sm:justify-end">
                  <div className="text-right">
                    <span className="font-mono tabular-nums font-semibold text-slate-800 block">
                      {m.terminees}/{m.total} terminées
                    </span>
                    {m.enRetard > 0 && (
                      <span className="text-[10px] text-rose-600 font-semibold block">{m.enRetard} en retard</span>
                    )}
                  </div>

                  <div className="w-24">
                    <ProgressBar
                      progress={m.taux}
                      size="sm"
                      showLabel={false}
                      colorClass={m.taux >= 100 ? 'bg-emerald-600' : 'bg-brand-700'}
                    />
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