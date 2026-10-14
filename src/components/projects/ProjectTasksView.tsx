import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { Projet, Tache, TaskStatus, TaskPriority, MembreProjet } from '../../types/sgp';
import { TaskStatusBadge, TaskPriorityBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { EmptyState } from '../common/EmptyState';
import { formatJour } from '../../utils/format';
import {
  Plus,
  Search,
  User,
  AlertTriangle,
  AlertCircle,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  RotateCcw,
  CheckSquare,
} from 'lucide-react';

interface ProjectTasksViewProps {
  projet: Projet;
  membres: MembreProjet[];
  canManage: boolean;
  onChanged: () => void;
  onOpenTeam: () => void;
}

const PRIORITES: { id: TaskPriority; label: string }[] = [
  { id: 'basse', label: 'Basse' },
  { id: 'moyenne', label: 'Moyenne' },
  { id: 'haute', label: 'Haute' },
];

const EMPTY_FORM = {
  titre: '',
  description: '',
  responsable_id: '' as number | '',
  priorite: 'moyenne' as TaskPriority,
  date_debut: '',
  date_echeance: '',
};
type FormField = keyof typeof EMPTY_FORM;

const inputClass = (hasError: boolean) =>
  `w-full px-3 py-2 text-xs border rounded-lg bg-white focus:outline-hidden focus:ring-2 ${
    hasError
      ? 'border-rose-400 focus:ring-rose-500/30'
      : 'border-slate-300 focus:border-brand-800 focus:ring-brand-800/20'
  }`;

const filterClass =
  'px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:border-brand-800 focus:ring-brand-800/20';

const aujourdhui = () => new Date().toISOString().split('T')[0];

export const ProjectTasksView: React.FC<ProjectTasksViewProps> = ({
  projet,
  membres,
  canManage,
  onChanged,
  onOpenTeam,
}) => {
  const {personnel } = useAuth();
  const toast = useToast();

  const [taches, setTaches] = useState<Tache[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Filtres
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [responsibleFilter, setResponsibleFilter] = useState('all');
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  // Création / modification
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tache | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<FormField, string>>>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Suppression
  const [toDelete, setToDelete] = useState<Tache | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTaches = async () => {
    setLoadError(null);
    try {
      setTaches(await api.getTaches(projet.id));
    } catch (err: any) {
      setLoadError(err?.message || 'Impossible de charger les tâches.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadTaches();
  }, [projet.id]);

  // Recharge la liste puis le projet (avancement, compteurs)
  const reload = async () => {
    await loadTaches();
    onChanged();
  };

  const projetAnnule = projet.statut === 'annule';
  const projetTermine = projet.statut === 'termine';
  const projetOuvert = !projetAnnule;
  // Pour créer une tâche : un projet en cours et au moins un membre actif à qui la confier
  const raisonBlocage = projetAnnule
    ? "Ce projet est annulé : il n'est plus possible d'y ajouter des tâches."
    : projetTermine
    ? 'Ce projet est terminé : passez son statut à « En cours » pour pouvoir y ajouter des tâches.'
    : membres.length === 0
    ? "Ajoutez d'abord au moins un membre à l'équipe : une tâche est toujours confiée à un membre du projet."
    : null;
  const today = aujourdhui();
  const estEnRetard = (t: Tache) => t.statut === 'en_cours' && t.date_echeance < today;
  const nbEnRetard = taches.filter(estEnRetard).length;

  // Le responsable, un chef de projet ou un admin peuvent changer le statut
  const canChangeStatus = (t: Tache) => canManage || (!!personnel && t.responsable_id === personnel.id);

  // Date proposée par défaut : aujourd'hui, ramenée dans les bornes du projet
  const borner = (jour: string) =>
    jour < projet.date_debut ? projet.date_debut : jour > projet.date_fin_prevue ? projet.date_fin_prevue : jour;

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setFormErrors({});
    setFormMessage(null);
  };

  const handleOpenCreate = () => {
    const moi = membres.find((m) => m.personnel_id === personnel?.id);
    setEditing(null);
    setForm({ ...EMPTY_FORM, responsable_id: moi ? moi.personnel_id : '', date_debut: borner(today) });
    setFormErrors({});
    setFormMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Tache) => {
    setEditing(t);
    setForm({
      titre: t.titre,
      description: t.description,
      responsable_id: t.responsable_id,
      priorite: t.priorite,
      date_debut: t.date_debut ?? '',
      date_echeance: t.date_echeance,
    });
    setFormErrors({});
    setFormMessage(null);
    setIsModalOpen(true);
  };

  const update = (field: FormField) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Partial<Record<FormField, string>> = {};
    const intervalle = `Les dates doivent être comprises entre le ${formatJour(projet.date_debut)} et le ${formatJour(
      projet.date_fin_prevue
    )} (période du projet).`;

    if (!form.titre.trim()) errors.titre = 'Le titre est obligatoire.';
    if (!form.description.trim()) errors.description = 'La description est obligatoire.';
    if (form.responsable_id === '') errors.responsable_id = 'Désignez un responsable parmi les membres du projet.';
    if (!form.date_debut) errors.date_debut = 'La date de début est obligatoire.';
    if (!form.date_echeance) errors.date_echeance = "La date d'échéance est obligatoire.";
    if (form.date_debut && form.date_echeance && form.date_echeance < form.date_debut) {
      errors.date_echeance = "L'échéance ne peut pas précéder la date de début.";
    }
    if (form.date_debut && (form.date_debut < projet.date_debut || form.date_debut > projet.date_fin_prevue)) {
      errors.date_debut = intervalle;
    }
    if (
      form.date_echeance &&
      (form.date_echeance < projet.date_debut || form.date_echeance > projet.date_fin_prevue) &&
      !errors.date_echeance
    ) {
      errors.date_echeance = intervalle;
    }

    if (Object.keys(errors).length > 0) {
      setFormMessage(null);
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setFormMessage(null);
    setIsSaving(true);
    try {
      const responsableId = Number(form.responsable_id);

      if (editing) {
        const data: Partial<Tache> = {
          titre: form.titre.trim(),
          description: form.description.trim(),
          priorite: form.priorite,
          date_debut: form.date_debut,
          date_echeance: form.date_echeance,
        };
        // Le responsable n'est renvoyé que s'il change (un ancien membre peut rester sur une tâche close)
        if (responsableId !== editing.responsable_id) data.responsable_id = responsableId;

        await api.updateTache(editing.id, data);
        toast.success('Tâche modifiée', `La tâche « ${form.titre.trim()} » a été mise à jour.`);
      } else {
        await api.createTache({
          projet_id: projet.id,
          titre: form.titre.trim(),
          description: form.description.trim(),
          priorite: form.priorite,
          date_debut: form.date_debut,
          date_echeance: form.date_echeance,
          responsable_id: responsableId,
        });
        toast.success('Tâche créée', `La tâche « ${form.titre.trim()} » a été planifiée.`);
      }

      closeModal();
      await reload();
    } catch (err: any) {
      setFormMessage(err?.message || "Impossible d'enregistrer la tâche.");
      if (err?.errors) {
        const fe: Partial<Record<FormField, string>> = {};
        Object.entries(err.errors as Record<string, string[]>).forEach(([k, v]) => {
          if (k in EMPTY_FORM) fe[k as FormField] = v[0];
        });
        setFormErrors(fe);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (t: Tache, statut: TaskStatus) => {
    setBusyId(t.id);
    try {
      await api.updateTaskStatus(t.id, statut);
      const libelle = statut === 'en_cours' ? 'En cours' : statut === 'termine' ? 'Terminée' : 'Annulée';
      toast.success('Statut mis à jour', `La tâche « ${t.titre} » est maintenant « ${libelle} ».`);
      await reload();
    } catch (err: any) {
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
      await reload();
    } catch (err: any) {
      setDeleteError(err?.message || 'Impossible de supprimer la tâche.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = taches.filter((t) => {
    const terme = search.toLowerCase();
    const matchesSearch =
      t.titre.toLowerCase().includes(terme) || t.description.toLowerCase().includes(terme);
    const matchesStatus = statusFilter === 'all' || t.statut === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priorite === priorityFilter;
    const matchesResponsible =
      responsibleFilter === 'all' || t.responsable_id === Number(responsibleFilter);
    const matchesOverdue = !onlyOverdue || estEnRetard(t);
    return matchesSearch && matchesStatus && matchesPriority && matchesResponsible && matchesOverdue;
  });

  const iconButton =
    'p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

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
            onClick={handleOpenCreate}
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
            onClick={() => {
              setIsLoading(true);
              loadTaches();
            }}
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
              ? 'Ce projet est terminé : passez son statut à « En cours » pour pouvoir y ajouter des tâches.'
              : membres.length === 0
              ? "Constituez d'abord l'équipe : une tâche est toujours confiée à un membre du projet."
              : 'Planifiez la première tâche et confiez-la à un membre de l’équipe.'
          }
          action={
            canManage && !projetAnnule && !projetTermine && membres.length === 0
              ? { label: "Aller à l'équipe", onClick: onOpenTeam }
              : canManage && projetOuvert && !projetTermine && membres.length > 0
              ? { label: 'Créer une tâche', onClick: handleOpenCreate }
              : undefined
          }
        />
      )}

      {/* Filtres + tableau */}
      {!isLoading && taches.length > 0 && (
        <>
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
                                    onClick={() => handleStatusChange(t, 'termine')}
                                    disabled={busyId === t.id}
                                    className={`${iconButton} text-slate-400 hover:text-emerald-600 hover:bg-emerald-50`}
                                    title="Marquer comme terminée"
                                    aria-label={`Marquer « ${t.titre} » comme terminée`}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(t, 'annule')}
                                    disabled={busyId === t.id}
                                    className={`${iconButton} text-slate-400 hover:text-slate-700 hover:bg-slate-100`}
                                    title="Annuler la tâche"
                                    aria-label={`Annuler « ${t.titre} »`}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {peutStatut && t.statut !== 'en_cours' && (
                                <button
                                  onClick={() => handleStatusChange(t, 'en_cours')}
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
                                    onClick={() => handleOpenEdit(t)}
                                    className={`${iconButton} text-slate-400 hover:text-brand-800 hover:bg-brand-50`}
                                    title="Modifier la tâche"
                                    aria-label={`Modifier « ${t.titre} »`}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeleteError(null);
                                      setToDelete(t);
                                    }}
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
        </>
      )}

      {/* Création / modification d'une tâche */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? 'Modifier la tâche' : 'Nouvelle tâche'}
        description={`Les dates doivent être comprises entre le ${formatJour(projet.date_debut)} et le ${formatJour(
          projet.date_fin_prevue
        )}.`}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4" noValidate>
          {formMessage && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{formMessage}</span>
            </div>
          )}

          <div>
            <label htmlFor="tache-titre" className="block text-xs font-semibold text-slate-700 mb-1">
              Titre <span className="text-rose-500">*</span>
            </label>
            <input
              id="tache-titre"
              type="text"
              value={form.titre}
              onChange={update('titre')}
              placeholder="Ex : Maquettes de la page d'accueil"
              className={inputClass(!!formErrors.titre)}
            />
            {formErrors.titre && <p className="text-[11px] text-rose-600 mt-1">{formErrors.titre}</p>}
          </div>

          <div>
            <label htmlFor="tache-description" className="block text-xs font-semibold text-slate-700 mb-1">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="tache-description"
              rows={3}
              value={form.description}
              onChange={update('description')}
              placeholder="Ce qui est attendu, les livrables..."
              className={`${inputClass(!!formErrors.description)} resize-none`}
            />
            {formErrors.description && (
              <p className="text-[11px] text-rose-600 mt-1">{formErrors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="tache-responsable" className="block text-xs font-semibold text-slate-700 mb-1">
                Responsable <span className="text-rose-500">*</span>
              </label>
              <select
                id="tache-responsable"
                value={form.responsable_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    responsable_id: e.target.value ? Number(e.target.value) : '',
                  }))
                }
                className={inputClass(!!formErrors.responsable_id)}
              >
                <option value="">Choisir un responsable...</option>
                {editing &&
                  !membres.some((m) => m.personnel_id === editing.responsable_id) && (
                    <option value={editing.responsable_id}>
                      {editing.responsable?.prenom} {editing.responsable?.nom} (ancien membre)
                    </option>
                  )}
                {membres.map((m) => (
                  <option key={m.personnel_id} value={m.personnel_id}>
                    {m.personnel?.prenom} {m.personnel?.nom}
                    {m.fonction ? ` — ${m.fonction.libelle}` : ''}
                  </option>
                ))}
              </select>
              {formErrors.responsable_id && (
                <p className="text-[11px] text-rose-600 mt-1">{formErrors.responsable_id}</p>
              )}
            </div>

            <div>
              <label htmlFor="tache-priorite" className="block text-xs font-semibold text-slate-700 mb-1">
                Priorité
              </label>
              <select
                id="tache-priorite"
                value={form.priorite}
                onChange={update('priorite')}
                className={inputClass(!!formErrors.priorite)}
              >
                {PRIORITES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              {formErrors.priorite && <p className="text-[11px] text-rose-600 mt-1">{formErrors.priorite}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="tache-debut" className="block text-xs font-semibold text-slate-700 mb-1">
                Date de début <span className="text-rose-500">*</span>
              </label>
              <input
                id="tache-debut"
                type="date"
                value={form.date_debut}
                min={projet.date_debut}
                max={projet.date_fin_prevue}
                onChange={update('date_debut')}
                className={inputClass(!!formErrors.date_debut)}
              />
              {formErrors.date_debut && (
                <p className="text-[11px] text-rose-600 mt-1">{formErrors.date_debut}</p>
              )}
            </div>
            <div>
              <label htmlFor="tache-echeance" className="block text-xs font-semibold text-slate-700 mb-1">
                Échéance <span className="text-rose-500">*</span>
              </label>
              <input
                id="tache-echeance"
                type="date"
                value={form.date_echeance}
                min={projet.date_debut}
                max={projet.date_fin_prevue}
                onChange={update('date_echeance')}
                className={inputClass(!!formErrors.date_echeance)}
              />
              {formErrors.date_echeance && (
                <p className="text-[11px] text-rose-600 mt-1">{formErrors.date_echeance}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-white bg-brand-800 hover:bg-brand-900 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer la tâche'}
            </button>
          </div>
        </form>
      </Modal>

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