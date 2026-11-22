import React from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import type { MembreProjet } from '../../../types/sgp';
import { FiltresTaches, PRIORITES } from './tacheFormulaire';

interface TaskFiltersProps {
  filtres: FiltresTaches;
  onChange: (patch: Partial<FiltresTaches>) => void;
  membres: MembreProjet[];
}

const filterClass =
  'px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:border-brand-800 focus:ring-brand-800/20';

/** Recherche et filtres de la liste des tâches. */
export const TaskFilters: React.FC<TaskFiltersProps> = ({ filtres, onChange, membres }) => {
  const { search, statut: statusFilter, priorite: priorityFilter, responsable: responsibleFilter, enRetard: onlyOverdue } = filtres;
  const setSearch = (search: string) => onChange({ search });
  const setStatusFilter = (statut: string) => onChange({ statut });
  const setPriorityFilter = (priorite: string) => onChange({ priorite });
  const setResponsibleFilter = (responsable: string) => onChange({ responsable });
  const setOnlyOverdue = (enRetard: boolean) => onChange({ enRetard });

  return (
    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap gap-2.5 items-center justify-between text-xs">
      <div className="relative flex-1 min-w-[200px]">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-3.5 h-3.5" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par titre ou mot-clé..."
          className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:border-brand-800 focus:ring-brand-800/20"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterClass}>
          <option value="all">Tous les statuts</option>
          <option value="en_cours">En cours</option>
          <option value="termine">Terminée</option>
          <option value="annule">Annulée</option>
        </select>

        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={filterClass}>
          <option value="all">Toutes priorités</option>
          {PRIORITES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        <select
          value={responsibleFilter}
          onChange={(e) => setResponsibleFilter(e.target.value)}
          className={filterClass}
        >
          <option value="all">Tous les responsables</option>
          {membres.map((m) => (
            <option key={m.personnel_id} value={m.personnel_id}>
              {m.personnel?.prenom} {m.personnel?.nom}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setOnlyOverdue(!onlyOverdue)}
          className={`px-2.5 py-1.5 text-xs rounded-lg border flex items-center gap-1 transition-colors ${
            onlyOverdue
              ? 'bg-rose-50 text-rose-700 border-rose-300 font-semibold'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          En retard
        </button>
      </div>
    </div>
  );
};
