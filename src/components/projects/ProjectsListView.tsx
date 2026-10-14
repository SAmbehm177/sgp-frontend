import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { Projet } from '../../types/sgp';
import { ProgressBar } from '../common/ProgressBar';
import { ProjectStatusBadge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { formatJour } from '../../utils/format';
import { Folder, Plus, Search, Calendar, Users, AlertCircle } from 'lucide-react';

interface ProjectsListViewProps {
  onNavigate: (route: string, params?: any) => void;
  openCreateImmediately?: boolean;
}

const aujourdhui = () => new Date().toISOString().split('T')[0];


const EMPTY_FORM = { titre: '', description: '', date_debut: aujourdhui(), date_fin: '' };
type FormField = keyof typeof EMPTY_FORM;

const inputClass = (hasError: boolean) =>
  `w-full px-3 py-2 text-xs border rounded-lg bg-white focus:outline-hidden focus:ring-2 ${
    hasError
      ? 'border-rose-400 focus:ring-rose-500/30'
      : 'border-slate-300 focus:border-brand-800 focus:ring-brand-800/20'
  }`;

const FILTRES = [
  { id: 'en_cours', label: 'En cours' },
  { id: 'termine', label: 'Terminés' },
  { id: 'annule', label: 'Annulés' },
];

export const ProjectsListView: React.FC<ProjectsListViewProps> = ({
  onNavigate,
  openCreateImmediately = false,
}) => {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [projets, setProjets] = useState<Projet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Création (administrateur)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(openCreateImmediately);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<FormField, string>>>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProjets = async () => {
    setLoadError(null);
    try {
      setProjets(await api.getProjets());
    } catch (err: any) {
      setLoadError(err?.message || 'Impossible de charger les projets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjets();
  }, []);

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setForm({ ...EMPTY_FORM, date_debut: aujourdhui() });
    setFormErrors({});
    setFormMessage(null);
  };

  const update = (field: FormField) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Partial<Record<FormField, string>> = {};
    if (!form.titre.trim()) errors.titre = 'Le titre du projet est obligatoire.';
    if (!form.date_debut) errors.date_debut = 'La date de début est obligatoire.';
    if (!form.date_fin) errors.date_fin = 'La date de fin est obligatoire.';
    if (form.date_debut && form.date_fin && form.date_fin < form.date_debut) {
      errors.date_fin = 'La date de fin ne peut pas précéder la date de début.';
    }
    if (Object.keys(errors).length > 0) {
      setFormMessage(null);
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setFormMessage(null);
    setIsSubmitting(true);
    try {
      const created = await api.createProjet({
        titre: form.titre.trim(),
        description: form.description.trim(),
        date_debut: form.date_debut,
        date_fin_prevue: form.date_fin,
      });
      toast.success('Projet créé', `Le projet « ${created.titre} » a été créé.`);
      closeCreateModal();
      await loadProjets();
    } catch (err: any) {
      setFormMessage(err?.message || 'Impossible de créer le projet.');
      if (err?.errors) {
        const fe: Partial<Record<FormField, string>> = {};
        Object.entries(err.errors as Record<string, string[]>).forEach(([k, v]) => {
          if (k in EMPTY_FORM) fe[k as FormField] = v[0];
        });
        setFormErrors(fe);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrage
  const filtered = projets.filter((p) => {
    const terme = search.toLowerCase();
    const matchesSearch =
      p.titre.toLowerCase().includes(terme) || p.description.toLowerCase().includes(terme);
    const matchesStatus = statusFilter === 'all' || p.statut === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Projets</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Créez les projets, suivez leur avancement et gérez les équipes.'
              : 'Les projets auxquels vous participez.'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 text-xs font-medium text-white bg-brand-800 hover:bg-brand-900 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nouveau projet
          </button>
        )}
      </div>

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
              loadProjets();
            }}
            className="px-3 py-1.5 font-medium text-rose-800 bg-white border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors shrink-0"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Chargement */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      )}

      {/* Aucun projet : état vide (nouvel inscrit ou plateforme vierge) */}
      {!isLoading && !loadError && projets.length === 0 && (
        <EmptyState
          icon={<Folder className="w-6 h-6" />}
          title="Aucun projet pour le moment"
          description={
            isAdmin
              ? 'Créez le premier projet pour commencer à organiser le travail de vos équipes.'
              : "Vous n'appartenez encore à aucun projet. Un chef de projet ou un administrateur doit vous ajouter pour que vos projets apparaissent ici."
          }
          action={isAdmin ? { label: 'Nouveau projet', onClick: () => setIsCreateModalOpen(true) } : undefined}
        />
      )}

      {/* Filtres + grille */}
      {!isLoading && projets.length > 0 && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un projet par titre ou description..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:border-brand-800 focus:ring-brand-800/20"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 overflow-x-auto">
              {[{ id: 'all', label: `Tous (${projets.length})` }, ...FILTRES].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    statusFilter === f.id
                      ? 'bg-white text-brand-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
              <Folder className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">Aucun projet trouvé</h3>
              <p className="text-xs text-slate-500 mt-1">Modifiez votre recherche ou les filtres.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((projet) => {
                const open = () => onNavigate('project-detail', { id: projet.id });
                const taux = projet.taux_avancement ?? 0;
                const nb = projet.membres_count;

                return (
                  <article
                    key={projet.id}
                    role="link"
                    tabIndex={0}
                    onClick={open}
                    onKeyDown={(e) => e.key === 'Enter' && open()}
                    className="group bg-white rounded-xl border border-slate-200 hover:border-brand-200 hover:shadow-xs transition-all cursor-pointer p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-brand-800 transition-colors">
                          {projet.titre}
                        </h2>
                        <ProjectStatusBadge status={projet.statut} />
                      </div>

                      <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        {projet.description || <span className="italic">Aucune description.</span>}
                      </p>

                      <div className="mt-4">
                        <ProgressBar
                          progress={taux}
                          size="sm"
                          colorClass={taux >= 100 ? 'bg-emerald-600' : 'bg-brand-700'}
                        />
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {nb === undefined
                            ? ''
                            : nb === 0
                            ? 'Aucun membre'
                            : `${nb} membre${nb > 1 ? 's' : ''}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-mono tabular-nums text-slate-600">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Échéance {formatJour(projet.date_fin_prevue)}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Création d'un projet */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        title="Créer un nouveau projet"
        description="Renseignez les informations du projet. Vous pourrez ensuite constituer l'équipe et désigner le chef de projet."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateProject} className="space-y-4" noValidate>
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
            <label htmlFor="projet-titre" className="block text-xs font-semibold text-slate-700 mb-1">
              Titre du projet <span className="text-rose-500">*</span>
            </label>
            <input
              id="projet-titre"
              type="text"
              value={form.titre}
              onChange={update('titre')}
              placeholder="Ex : Refonte du portail client"
              className={inputClass(!!formErrors.titre)}
            />
            {formErrors.titre && <p className="text-[11px] text-rose-600 mt-1">{formErrors.titre}</p>}
          </div>

          <div>
            <label htmlFor="projet-description" className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="projet-description"
              rows={3}
              value={form.description}
              onChange={update('description')}
              placeholder="Objectifs, périmètre et livrables attendus..."
              className={`${inputClass(!!formErrors.description)} resize-none`}
            />
            {formErrors.description && (
              <p className="text-[11px] text-rose-600 mt-1">{formErrors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="projet-debut" className="block text-xs font-semibold text-slate-700 mb-1">
                Date de début <span className="text-rose-500">*</span>
              </label>
              <input
                id="projet-debut"
                type="date"
                value={form.date_debut}
                onChange={update('date_debut')}
                className={inputClass(!!formErrors.date_debut)}
              />
              {formErrors.date_debut && (
                <p className="text-[11px] text-rose-600 mt-1">{formErrors.date_debut}</p>
              )}
            </div>
            <div>
              <label htmlFor="projet-fin" className="block text-xs font-semibold text-slate-700 mb-1">
                Date de fin <span className="text-rose-500">*</span>
              </label>
              <input
                id="projet-fin"
                type="date"
                value={form.date_fin}
                onChange={update('date_fin')}
                className={inputClass(!!formErrors.date_fin)}
              />
              {formErrors.date_fin && (
                <p className="text-[11px] text-rose-600 mt-1">{formErrors.date_fin}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={closeCreateModal}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-white bg-brand-800 hover:bg-brand-900 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Création…' : 'Créer le projet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};