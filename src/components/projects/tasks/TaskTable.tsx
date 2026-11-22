import React from 'react';
import { CheckCircle, Edit2, RotateCcw, Trash2, User, XCircle } from 'lucide-react';
import type { Tache, TaskStatus } from '../../../types/sgp';
import { formatJour } from '../../../utils/format';
import { tacheEnRetard } from '../../../utils/taches';
import { TaskPriorityBadge, TaskStatusBadge } from '../../common/Badge';

interface TaskTableProps {
  taches: Tache[];
  today: string;
  canManage: boolean;
  projetAnnule: boolean;
  busyId: number | null;
  canChangeStatus: (t: Tache) => boolean;
  onStatusChange: (t: Tache, statut: TaskStatus) => void;
  onEdit: (t: Tache) => void;
  onDelete: (t: Tache) => void;
}

const iconButton = 'p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

/** Tableau des tâches avec les actions (statut, modification, suppression). */
export const TaskTable: React.FC<TaskTableProps> = ({
  taches: filtered,
  today,
  canManage,
  projetAnnule,
  busyId,
  canChangeStatus,
  onStatusChange,
  onEdit,
  onDelete,
}) => {
  const estEnRetard = (t: Tache) => tacheEnRetard(t, today);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
              <th className="py-3 px-4">Tâche</th>
              <th className="py-3 px-4">Priorité</th>
              <th className="py-3 px-4">Responsable</th>
              <th className="py-3 px-4">Échéance</th>
              <th className="py-3 px-4">Statut</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400">
                  Aucune tâche ne correspond aux critères de sélection.
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const retard = estEnRetard(t);
                const peutStatut = canChangeStatus(t);

                return (
                  <tr
                    key={t.id}
                    className={`hover:bg-slate-50/80 transition-colors ${retard ? 'bg-rose-50/30' : ''}`}
                  >
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 leading-tight">{t.titre}</div>
                      {t.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{t.description}</div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <TaskPriorityBadge priority={t.priorite} />
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {t.responsable?.prenom} {t.responsable?.nom}
                        </span>
                      </div>
                    </td>

                    <td
                      className={`py-3 px-4 font-mono tabular-nums whitespace-nowrap ${
                        retard ? 'text-rose-700 font-semibold' : 'text-slate-600'
                      }`}
                    >
                      {formatJour(t.date_echeance)}
                    </td>

                    <td className="py-3 px-4">
                      <TaskStatusBadge status={t.statut} isOverdue={retard} />
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-0.5">
                        {peutStatut && t.statut === 'en_cours' && (
                          <>
                            <button
                              onClick={() => onStatusChange(t, 'termine')}
                              disabled={busyId === t.id}
                              className={`${iconButton} text-slate-400 hover:text-emerald-600 hover:bg-emerald-50`}
                              title="Marquer comme terminée"
                              aria-label={`Marquer « ${t.titre} » comme terminée`}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onStatusChange(t, 'annule')}
                              disabled={busyId === t.id}
                              className={`${iconButton} text-slate-400 hover:text-slate-700 hover:bg-slate-100`}
                              title="Annuler la tâche"
                              aria-label={`Annuler « ${t.titre} »`}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {peutStatut && t.statut !== 'en_cours' && !projetAnnule && (
                          <button
                            onClick={() => onStatusChange(t, 'en_cours')}
                            disabled={busyId === t.id}
                            className={`${iconButton} text-slate-400 hover:text-brand-800 hover:bg-brand-50`}
                            title="Rouvrir la tâche"
                            aria-label={`Rouvrir « ${t.titre} »`}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        {canManage && (
                          <>
                            <button
                              onClick={() => onEdit(t)}
                              className={`${iconButton} text-slate-400 hover:text-brand-800 hover:bg-brand-50`}
                              title="Modifier la tâche"
                              aria-label={`Modifier « ${t.titre} »`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDelete(t)}
                              className={`${iconButton} text-slate-400 hover:text-rose-600 hover:bg-rose-50`}
                              title="Supprimer la tâche"
                              aria-label={`Supprimer « ${t.titre} »`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
