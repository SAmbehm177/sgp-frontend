import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api, toApiError } from '../../services/api';
import { Projet, ProjectStatus, MembreProjet, Fonction, StatistiquesProjet, RouteParams } from '../../types/sgp';
import { ProjectStatusBadge } from '../common/Badge';
import { ProgressBar } from '../common/ProgressBar';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { ProjectMembersView } from './ProjectMembersView';
import { ProjectTasksView } from './ProjectTasksView';
import { ProjectStatsView } from './ProjectStatsView';
import { ProjectDiscussionView } from './ProjectDiscussionView';
import { formatJour, initiale } from '../../utils/format';
import {
  ArrowLeft,
  Calendar,
  Users,
  CheckSquare,
  FileText,
  AlertCircle,
  BarChart2,
  MessageSquare,
} from 'lucide-react';

type Tab = 'vue-ensemble' | 'taches' | 'membres' | 'discussion' | 'statistiques';

interface ProjectDetailViewProps {
  projetId: number;
  initialTab?: Tab;
  onNavigate: (route: string, params?: RouteParams) => void;
  onTitreChange?: (id: number, titre: string) => void;
}

// `ready` : onglet déjà branché sur l'API (les autres restent masqués jusqu'à leur étape)
const TABS: { id: Tab; label: string; icon: React.ElementType; ready: boolean; managersOnly?: boolean }[] = [
  { id: 'vue-ensemble', label: "Vue d'ensemble", icon: FileText, ready: true },
  { id: 'taches', label: 'Tâches', icon: CheckSquare, ready: true },
  { id: 'membres', label: 'Équipe', icon: Users, ready: true },
  { id: 'discussion', label: 'Discussion', icon: MessageSquare, ready: true },
  { id: 'statistiques', label: 'Statistiques & Avancement', icon: BarChart2, ready: true, managersOnly: true },
];

type EditField = 'titre' | 'description' | 'statut' | 'date_debut' | 'date_fin';

const inputClass = (hasError: boolean) =>
  `w-full px-3 py-2 text-xs border rounded-lg bg-white focus:outline-hidden focus:ring-2 ${
    hasError
      ? 'border-rose-400 focus:ring-rose-500/30'
      : 'border-slate-300 focus:border-brand-800 focus:ring-brand-800/20'
  }`;

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  projetId,
  initialTab = 'vue-ensemble',
  onNavigate,
  onTitreChange,
}) => {
  const { isAdmin, personnel } = useAuth();
  const toast = useToast();

  const [projet, setProjet] = useState<Projet | null>(null);
  const [membres, setMembres] = useState<MembreProjet[]>([]);
  const [fonctions, setFonctions] = useState<Fonction[]>([]);
  const [stats, setStats] = useState<StatistiquesProjet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ status: number; message: string } | null>(null);

  const premierOnglet = TABS.find((t) => t.id === initialTab && t.ready)?.id ?? 'vue-ensemble';
  const [activeTab, setActiveTab] = useState<Tab>(premierOnglet);

  // Modification du projet (administrateur)
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    titre: '',
    description: '',
    statut: 'en_cours' as ProjectStatus,
    date_debut: '',
    date_fin: '',
  });
  const [editErrors, setEditErrors] = useState<Partial<Record<EditField, string>>>({});
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Suppression du projet (administrateur)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = async () => {
    setLoadError(null);
    try {
      const [detail, st] = await Promise.all([api.getProjetDetail(projetId), api.getProjetStats(projetId)]);
      setProjet({ ...detail.projet, membres_count: detail.membres.length });
      setMembres(detail.membres);
      setFonctions(detail.fonctions);
      setStats(st);
      onTitreChange?.(projetId, detail.projet.titre);
    } catch (caught) {
      const err = toApiError(caught);
      setLoadError({ status: err?.status ?? 0, message: err?.message || 'Impossible de charger le projet.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setProjet(null);
    load();
  }, [projetId]);

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" />
        <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (loadError || !projet || !stats) {
    const introuvable = loadError?.status === 403 || loadError?.status === 404;
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h2 className="text-sm font-semibold text-slate-800">
          {introuvable ? 'Projet introuvable' : 'Chargement impossible'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {introuvable
            ? "Ce projet n'existe pas, ou vous n'y avez pas accès."
            : loadError?.message}
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          {!introuvable && (
            <button
              onClick={() => {
                setIsLoading(true);
                load();
              }}
              className="px-3 py-1.5 text-xs font-medium text-white bg-brand-800 hover:bg-brand-900 rounded-lg transition-colors"
            >
              Réessayer
            </button>
          )}
          <button
            onClick={() => onNavigate('projets')}
            className="px-3 py-1.5 text-xs font-medium text-brand-800 hover:text-brand-950"
          >
            Retourner à la liste des projets
          </button>
        </div>
      </div>
    );
  }

  const chefs = membres.filter((m) => m.fonction?.libelle === 'Chef de projet');
  const monMembre = personnel ? membres.find((m) => m.personnel_id === personnel.id) : undefined;
  const estChef = monMembre?.fonction?.libelle === 'Chef de projet';
  const canManage = isAdmin || estChef;
  const canEdit = isAdmin; // le backend réserve la modification du projet à l'administrateur

  const monRole = isAdmin ? 'Administrateur' : monMembre?.fonction?.libelle ?? 'Membre';
  const ongletActif: Tab = activeTab === 'statistiques' && !canManage ? 'vue-ensemble' : activeTab;


  const kpis = [
    { label: 'Tâches', value: stats.total_taches, tone: 'text-slate-900' },
    { label: 'En cours', value: stats.taches_en_cours, tone: 'text-brand-800' },
    { label: 'Terminées', value: stats.taches_terminees, tone: 'text-emerald-700' },
    {
      label: 'En retard',
      value: stats.taches_en_retard,
      tone: stats.taches_en_retard > 0 ? 'text-rose-600' : 'text-slate-900',
    },
  ];

  const handleOpenEdit = () => {
    setEditForm({
      titre: projet.titre,
      description: projet.description,
      statut: projet.statut,
      date_debut: projet.date_debut,
      date_fin: projet.date_fin_prevue,
    });
    setEditErrors({});
    setEditMessage(null);
    setIsEditOpen(true);
  };

  const updateEdit = (field: EditField) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setEditForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Partial<Record<EditField, string>> = {};
    if (!editForm.titre.trim()) errors.titre = 'Le titre du projet est obligatoire.';
    if (!editForm.date_debut) errors.date_debut = 'La date de début est obligatoire.';
    if (!editForm.date_fin) errors.date_fin = 'La date de fin est obligatoire.';
    if (editForm.date_debut && editForm.date_fin && editForm.date_fin < editForm.date_debut) {
      errors.date_fin = 'La date de fin ne peut pas précéder la date de début.';
    }
    if (Object.keys(errors).length > 0) {
      setEditMessage(null);
      setEditErrors(errors);
      return;
    }

    setEditErrors({});
    setEditMessage(null);
    setIsSaving(true);
    try {
      await api.updateProjet(projet.id, {
        titre: editForm.titre.trim(),
        description: editForm.description.trim(),
        statut: editForm.statut,
        date_debut: editForm.date_debut,
        date_fin_prevue: editForm.date_fin,
      });
      toast.success('Projet mis à jour', 'Les modifications ont été enregistrées.');
      setIsEditOpen(false);
      await load();
    } catch (caught) {
      const err = toApiError(caught);
      setEditMessage(err?.message || 'Impossible de modifier le projet.');
      if (err?.errors) {
        const fe: Partial<Record<EditField, string>> = {};
        Object.entries(err.errors as Record<string, string[]>).forEach(([k, v]) => {
          if (k in editForm) fe[k as EditField] = v[0];
        });
        setEditErrors(fe);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await api.deleteProjet(projet.id);
      toast.success('Projet supprimé', `Le projet « ${projet.titre} » a été supprimé.`);
      setIsDeleteOpen(false);
      onNavigate('projets');
    } catch (caught) {
      const err = toApiError(caught);
      setDeleteError(err?.message || 'Impossible de supprimer le projet.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            onClick={() => onNavigate('projets')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux projets
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Votre rôle sur ce projet :</span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                isAdmin || estChef
                  ? 'bg-brand-50 text-brand-800 border-brand-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {monRole}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-1">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {projet.titre}
              </h1>
              <ProjectStatusBadge status={projet.statut} />
            </div>
            {projet.description && (
              <p className="text-xs text-slate-600 mt-2 max-w-3xl leading-relaxed line-clamp-3">
                {projet.description}
              </p>
            )}
          </div>

          <div className="sm:text-right shrink-0">
            <span className="text-[11px] text-slate-400 block">
              {chefs.length > 1 ? 'Chefs de projet' : 'Chef de projet'}
            </span>
            <span className="text-xs font-semibold text-slate-800">
              {chefs.length > 0
                ? chefs.map((c) => `${c.personnel?.prenom} ${c.personnel?.nom}`).join(', ')
                : 'Non assigné'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Du {formatJour(projet.date_debut)} au {formatJour(projet.date_fin_prevue)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {membres.length} membre{membres.length > 1 ? 's' : ''} actif{membres.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenEdit}
                className="px-3.5 py-2 text-xs font-medium text-white bg-brand-800 hover:bg-brand-900 rounded-lg transition-colors shadow-xs"
              >
                Modifier le projet
              </button>
              <button
                onClick={() => {
                  setDeleteError(null);
                  setIsDeleteOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-medium text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors"
              >
                Supprimer le projet
              </button>
            </div>
          )}
        </div>

        <div className="pt-2">
          <ProgressBar
            progress={stats.taux_avancement}
            size="md"
            colorClass={stats.taux_avancement >= 100 ? 'bg-emerald-600' : 'bg-brand-700'}
          />
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 overflow-x-auto">
          {TABS.filter((t) => t.ready && (!t.managersOnly || canManage)).map((t) => {
            const Icon = t.icon;
            const actif = ongletActif === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`py-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  actif
                    ? 'border-brand-800 text-brand-800 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {t.id === 'taches' && ` (${stats.total_taches})`}
                {t.id === 'membres' && ` (${membres.length})`}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenu */}
      {ongletActif === 'vue-ensemble' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Description du projet</h3>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {projet.description || <span className="italic text-slate-400">Aucune description.</span>}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {kpis.map((k) => (
                <div key={k.label} className="bg-white p-4 rounded-xl border border-slate-200">
                  <p className="text-[11px] text-slate-500">{k.label}</p>
                  <p className={`text-2xl font-bold tabular-nums mt-1 ${k.tone}`}>{k.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 h-fit">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Équipe du projet</h3>

            {membres.length === 0 ? (
              <p className="text-xs text-slate-500">Aucun membre pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {membres.slice(0, 6).map((m) => (
                  <div key={m.personnel_id} className="flex items-center gap-2.5 text-xs">
                    <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-bold text-xs shrink-0">
                      {initiale(m.personnel?.prenom)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-slate-900 block truncate">
                        {m.personnel?.prenom} {m.personnel?.nom}
                      </span>
                      <span className="text-[10px] text-slate-500 block">{m.fonction?.libelle}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setActiveTab('membres')}
              className="mt-4 w-full py-1.5 text-xs font-medium text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors text-center"
            >
              {canManage && membres.length === 0 ? 'Constituer l\'équipe' : "Voir toute l'équipe"}
            </button>
          </div>
        </div>
      )}

      {ongletActif === 'taches' && (
        <ProjectTasksView
          projet={projet}
          membres={membres}
          canManage={canManage}
          onChanged={load}
          onOpenTeam={() => setActiveTab('membres')}
        />
      )}

      {ongletActif === 'membres' && (
        <ProjectMembersView
          projet={projet}
          membres={membres}
          fonctions={fonctions}
          canManage={canManage}
          onChanged={load}
        />
      )}

      {ongletActif === 'discussion' && <ProjectDiscussionView projetId={projet.id} canManage={canManage} />}

      {ongletActif === 'statistiques' && <ProjectStatsView stats={stats} membres={membres} />}

      {/* Modification du projet (administrateur) */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Modifier le projet"
        description="Mettez à jour les informations du projet."
        maxWidth="md"
      >
        <form onSubmit={handleSaveProject} className="space-y-4" noValidate>
          {editMessage && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{editMessage}</span>
            </div>
          )}

          <div>
            <label htmlFor="edit-titre" className="block text-xs font-semibold text-slate-700 mb-1">
              Titre du projet <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-titre"
              type="text"
              value={editForm.titre}
              onChange={updateEdit('titre')}
              className={inputClass(!!editErrors.titre)}
            />
            {editErrors.titre && <p className="text-[11px] text-rose-600 mt-1">{editErrors.titre}</p>}
          </div>

          <div>
            <label htmlFor="edit-description" className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="edit-description"
              rows={3}
              value={editForm.description}
              onChange={updateEdit('description')}
              className={`${inputClass(!!editErrors.description)} resize-none`}
            />
            {editErrors.description && (
              <p className="text-[11px] text-rose-600 mt-1">{editErrors.description}</p>
            )}
          </div>

          <div>
            <label htmlFor="edit-statut" className="block text-xs font-semibold text-slate-700 mb-1">
              Statut
            </label>
            <select
              id="edit-statut"
              value={editForm.statut}
              onChange={updateEdit('statut')}
              className={inputClass(!!editErrors.statut)}
            >
              <option value="en_cours">En cours</option>
              <option value="termine">Terminé</option>
              <option value="annule">Annulé</option>
            </select>
            {editErrors.statut && <p className="text-[11px] text-rose-600 mt-1">{editErrors.statut}</p>}
            <p className="text-[11px] text-slate-500 mt-1">
              Le statut passe automatiquement à « Terminé » quand toutes les tâches sont terminées, et revient à
              « En cours » dès qu'une tâche est rouverte ou ajoutée.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-debut" className="block text-xs font-semibold text-slate-700 mb-1">
                Date de début <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit-debut"
                type="date"
                value={editForm.date_debut}
                onChange={updateEdit('date_debut')}
                className={inputClass(!!editErrors.date_debut)}
              />
              {editErrors.date_debut && (
                <p className="text-[11px] text-rose-600 mt-1">{editErrors.date_debut}</p>
              )}
            </div>
            <div>
              <label htmlFor="edit-fin" className="block text-xs font-semibold text-slate-700 mb-1">
                Date de fin <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit-fin"
                type="date"
                value={editForm.date_fin}
                onChange={updateEdit('date_fin')}
                className={inputClass(!!editErrors.date_fin)}
              />
              {editErrors.date_fin && (
                <p className="text-[11px] text-rose-600 mt-1">{editErrors.date_fin}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-white bg-brand-800 hover:bg-brand-900 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Suppression du projet (administrateur) */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteProject}
        title="Supprimer ce projet ?"
        message={`Le projet « ${projet.titre} » sera définitivement supprimé, avec ses ${stats.total_taches} tâche${
          stats.total_taches > 1 ? 's' : ''
        } et son équipe. Cette action est irréversible.`}
        confirmLabel="Supprimer le projet"
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