import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckSquare, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useApiData } from '../../hooks/useApiData';
import { api, toApiError } from '../../services/api';
import { MembreProjet, Projet, Tache, TaskStatus } from '../../types/sgp';
import { getLocalDateString } from '../../utils/date';
import { tacheEnRetard } from '../../utils/taches';
import { ConfirmModal } from '../common/ConfirmModal';
import { EmptyState } from '../common/EmptyState';
import { TaskFilters } from './tasks/TaskFilters';
import { TaskFormModal } from './tasks/TaskFormModal';
import { TaskTable } from './tasks/TaskTable';
import { FILTRES_VIDES, FiltresTaches, filtrerTachesProjet, raisonBlocageCreation } from './tasks/tacheFormulaire';
import { useTaskEditor } from './tasks/useTaskEditor';

interface ProjectTasksViewProps {
  projet: Projet;
  membres: MembreProjet[];
  canManage: boolean;
  onChanged: () => void;
  onOpenTeam: () => void;
}

export const ProjectTasksView: React.FC<ProjectTasksViewProps> = ({
  projet,
  membres,
  canManage,
  onChanged,
  onOpenTeam,
}) => {
  const { personnel, isAdmin } = useAuth();
  const toast = useToast();

  const {
    data,
    isLoading,
    error: loadError,
    reload: loadTaches,
  } = useApiData(() => api.getTaches(projet.id), [projet.id]);
  const taches = useMemo(() => data ?? [], [data]);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [filtres, setFiltres] = useState<FiltresTaches>(FILTRES_VIDES);

  const [toDelete, setToDelete] = useState<Tache | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Recharge la liste puis le projet (avancement, compteurs)
  const reload = () => {
    loadTaches();
    onChanged();
  };

  const today = getLocalDateString();
  const projetAnnule = projet.statut === 'annule';
  const projetTermine = projet.statut === 'termine';
  const projetOuvert = !projetAnnule;
  // Pour créer une tâche : un projet en cours et au moins un membre actif à qui la confier
  const raisonBlocage = raisonBlocageCreation({ projet, isAdmin, nbMembres: membres.length });
  const nbEnRetard = taches.filter((t) => tacheEnRetard(t, today)).length;

  // Le responsable, un chef de projet ou un admin peuvent changer le statut
  const canChangeStatus = (t: Tache) => canManage || (!!personnel && t.responsable_id === personnel.id);

  const editor = useTaskEditor({ projet, membres, personnelId: personnel?.id, today, onSaved: reload });

  const handleStatusChange = async (t: Tache, statut: TaskStatus) => {
    setBusyId(t.id);
    try {
      await api.updateTaskStatus(t.id, statut);
      const libelle = statut === 'en_cours' ? 'En cours' : statut === 'termine' ? 'Terminée' : 'Annulée';
      toast.success('Statut mis à jour', `La tâche « ${t.titre} » est maintenant « ${libelle} ».`);
      reload();
    } catch (caught) {
      const err = toApiError(caught);
      toast.error('Action refusée', err?.message || 'Impossible de changer le statut.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await api.deleteTache(toDelete.id);
      toast.success('Tâche supprimée', `La tâche « ${toDelete.titre} » a été supprimée.`);
      setToDelete(null);
      reload();
    } catch (caught) {
      const err = toApiError(caught);
      setDeleteError(err?.message || 'Impossible de supprimer la tâche.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = filtrerTachesProjet(taches, filtres, today);

  return (
    <div className="space-y-4">
      {/* Barre d'actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">Tâches du projet ({taches.length})</h2>
          {nbEnRetard > 0 && (
            <span className="px-2 py-0.5 rounded-sm bg-rose-50 text-rose-700 text-[11px] font-semibold border border-rose-200">
              {nbEnRetard} en retard
            </span>
          )}
        </div>

        {canManage && (
          <button
            onClick={editor.openCreate}
            disabled={raisonBlocage !== null}
            title={raisonBlocage ?? undefined}
            className="px-3.5 py-2 text-xs font-medium text-white bg-brand-800 hover:bg-brand-900 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Créer une tâche
          </button>
        )}
      </div>

      {canManage && raisonBlocage && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl">
          <span>{raisonBlocage}</span>
          {!projetAnnule && !projetTermine && membres.length === 0 && (
            <button
              onClick={onOpenTeam}
              className="font-semibold text-brand-800 underline underline-offset-2 hover:text-brand-950"
            >
              Aller à l'équipe
            </button>
          )}
        </div>
      )}

      {/* Erreur de chargement */}
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
            onClick={loadTaches}
            className="px-3 py-1.5 font-medium text-rose-800 bg-white border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors shrink-0"
          >
            Réessayer
          </button>
        </div>
      )}

      {isLoading && <div className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" aria-busy="true" />}

      {/* Aucune tâche */}
      {!isLoading && !loadError && taches.length === 0 && (
        <EmptyState
          icon={<CheckSquare className="w-6 h-6" />}
          title="Aucune tâche pour le moment"
          description={
            !canManage
              ? "Aucune tâche n'a encore été planifiée sur ce projet."
              : projetAnnule
              ? "Ce projet est annulé : il n'est plus possible d'y ajouter des tâches."
              : projetTermine
              ? isAdmin
                ? 'Ce projet est terminé : vous pouvez le rouvrir avant d’y ajouter des tâches.'
                : 'Ce projet est terminé. Seul un administrateur peut le rouvrir.'
              : membres.length === 0
              ? "Constituez d'abord l'équipe : une tâche est toujours confiée à un membre du projet."
              : 'Planifiez la première tâche et confiez-la à un membre de l’équipe.'
          }
          action={
            canManage && !projetAnnule && !projetTermine && membres.length === 0
              ? { label: "Aller à l'équipe", onClick: onOpenTeam }
              : canManage && projetOuvert && !projetTermine && membres.length > 0
              ? { label: 'Créer une tâche', onClick: editor.openCreate }
              : undefined
          }
        />
      )}

      {/* Filtres + tableau */}
      {!isLoading && taches.length > 0 && (
        <>
          <TaskFilters
            filtres={filtres}
            onChange={(patch) => setFiltres((precedent) => ({ ...precedent, ...patch }))}
            membres={membres}
          />
          <TaskTable
            taches={filtered}
            today={today}
            canManage={canManage}
            projetAnnule={projetAnnule}
            busyId={busyId}
            canChangeStatus={canChangeStatus}
            onStatusChange={handleStatusChange}
            onEdit={editor.openEdit}
            onDelete={(t) => {
              setDeleteError(null);
              setToDelete(t);
            }}
          />
        </>
      )}

      <TaskFormModal editor={editor} projet={projet} membres={membres} />

      {/* Suppression */}
      <ConfirmModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Supprimer cette tâche ?"
        message={`La tâche « ${toDelete?.titre ?? ''} » sera définitivement supprimée.`}
        confirmLabel="Supprimer"
        isLoading={isDeleting}
        details={
          deleteError ? (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{deleteError}</span>
            </div>
          ) : undefined
        }
      />
    </div>
  );
};
