import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { api, toApiError } from '../../services/api';
import { Projet, MembreProjet, Fonction, Personnel } from '../../types/sgp';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { initiale } from '../../utils/format';
import { Users, UserPlus, UserMinus, Search, AlertCircle, Check } from 'lucide-react';

interface ProjectMembersViewProps {
  projet: Projet;
  membres: MembreProjet[];
  fonctions: Fonction[];
  canManage: boolean;
  onChanged: () => void;
}

const estChef = (m: MembreProjet) => m.fonction?.libelle === 'Chef de projet';
const LIBELLE_CHEF = 'Chef de projet';

export const ProjectMembersView: React.FC<ProjectMembersViewProps> = ({
  projet,
  membres,
  fonctions,
  canManage,
  onChanged,
}) => {
  const toast = useToast();

  // Un projet n'a qu'un seul chef de projet
  const aDejaUnChef = membres.some(estChef);

  // Ajout d'un membre
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Personnel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Personnel | null>(null);
  const [fonctionId, setFonctionId] = useState<number | ''>('');
  const [addError, setAddError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Retrait d'un membre
  const [toRemove, setToRemove] = useState<MembreProjet | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Recherche dans l'annuaire (avec un léger délai pendant la frappe)
  useEffect(() => {
    if (!isAddOpen) return;

    let annule = false;
    setIsSearching(true);
    const timer = setTimeout(
      async () => {
        try {
          const list = await api.searchPersonnel(query.trim());
          if (!annule) {
            setResults(list);
            setSearchError(null);
          }
        } catch (caught) {
          const err = toApiError(caught);
          if (!annule) setSearchError(err?.message || 'Recherche impossible.');
        } finally {
          if (!annule) setIsSearching(false);
        }
      },
      query ? 300 : 0
    );

    return () => {
      annule = true;
      clearTimeout(timer);
    };
  }, [query, isAddOpen]);

  const dejaMembres = new Set(membres.map((m) => m.personnel_id));
  const candidats = results.filter((p) => !dejaMembres.has(p.id));

  const closeAdd = () => {
    setIsAddOpen(false);
    setQuery('');
    setResults([]);
    setSelected(null);
    setFonctionId('');
    setAddError(null);
    setSearchError(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      setAddError('Sélectionnez une personne dans la liste.');
      return;
    }
    if (fonctionId === '') {
      setAddError('Choisissez la fonction de cette personne dans le projet.');
      return;
    }

    setAddError(null);
    setIsSaving(true);
    try {
      await api.addMembre({
        projet_id: projet.id,
        personnel_id: selected.id,
        fonction_id: Number(fonctionId),
      });
      toast.success('Membre ajouté', `${selected.prenom} ${selected.nom} rejoint le projet.`);
      closeAdd();
      onChanged();
    } catch (caught) {
      const err = toApiError(caught);
      setAddError(err?.message || "Impossible d'ajouter ce membre.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!toRemove) return;

    setRemoveError(null);
    setIsRemoving(true);
    try {
      await api.removeMembre(projet.id, toRemove.personnel_id);
      toast.success(
        'Membre retiré',
        `${toRemove.personnel?.prenom} ${toRemove.personnel?.nom} ne fait plus partie du projet.`
      );
      setToRemove(null);
      onChanged();
    } catch (caught) {
      const err = toApiError(caught);
      setRemoveError(err?.message || 'Impossible de retirer ce membre.');
    } finally {
      setIsRemoving(false);
    }
  };

  const tries = [...membres].sort(
    (a, b) =>
      Number(estChef(b)) - Number(estChef(a)) ||
      (a.personnel?.nom ?? '').localeCompare(b.personnel?.nom ?? '')
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Équipe du projet</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {membres.length === 0
              ? 'Aucun membre actif.'
              : `${membres.length} membre${membres.length > 1 ? 's' : ''} actif${membres.length > 1 ? 's' : ''}.`}
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3.5 py-2 text-xs font-medium text-white bg-brand-800 hover:bg-brand-900 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Ajouter un membre
          </button>
        )}
      </div>

      {membres.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="Aucun membre pour le moment"
          description={
            canManage
              ? 'Ajoutez les personnes qui travaillent sur ce projet, puis désignez un chef de projet.'
              : "Aucune personne n'est encore affectée à ce projet."
          }
          action={canManage ? { label: 'Ajouter un membre', onClick: () => setIsAddOpen(true) } : undefined}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {tries.map((m) => (
            <div key={m.personnel_id} className="flex items-center gap-3 p-4">
              <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-bold text-sm shrink-0">
                {initiale(m.personnel?.prenom)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {m.personnel?.prenom} {m.personnel?.nom}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{m.personnel?.poste || '—'}</p>
              </div>

              <span
                className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md border whitespace-nowrap ${
                  estChef(m)
                    ? 'bg-brand-50 text-brand-800 border-brand-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {m.fonction?.libelle ?? 'Membre'}
              </span>

              {canManage && (
                <button
                  onClick={() => {
                    setRemoveError(null);
                    setToRemove(m);
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Retirer ce membre"
                  aria-label={`Retirer ${m.personnel?.prenom} ${m.personnel?.nom}`}
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ajouter un membre */}
      <Modal
        isOpen={isAddOpen}
        onClose={closeAdd}
        title="Ajouter un membre"
        description="Recherchez un membre du personnel, puis choisissez sa fonction dans ce projet."
        maxWidth="lg"
      >
        <form onSubmit={handleAdd} className="space-y-4" noValidate>
          {addError && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{addError}</span>
            </div>
          )}

          <div>
            <label htmlFor="membre-recherche" className="block text-xs font-semibold text-slate-700 mb-1">
              Personne <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="membre-recherche"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher par nom ou prénom..."
                autoComplete="off"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:border-brand-800 focus:ring-brand-800/20"
              />
            </div>

            <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
              {searchError ? (
                <p className="p-3 text-xs text-rose-700">{searchError}</p>
              ) : isSearching && results.length === 0 ? (
                <p className="p-3 text-xs text-slate-500">Recherche en cours…</p>
              ) : candidats.length === 0 ? (
                <p className="p-3 text-xs text-slate-500">
                  {query
                    ? 'Aucune personne trouvée (ou déjà membre du projet).'
                    : 'Aucune personne disponible à ajouter.'}
                </p>
              ) : (
                candidats.map((p) => {
                  const actif = selected?.id === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setSelected(p)}
                      aria-pressed={actif}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        actif ? 'bg-brand-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-bold text-xs shrink-0">
                        {initiale(p.prenom)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {p.prenom} {p.nom}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{p.poste || '—'}</p>
                      </div>
                      {actif && <Check className="w-4 h-4 text-brand-800 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
            {results.length >= 30 && (
              <p className="text-[11px] text-slate-400 mt-1">
                Seuls les 30 premiers résultats sont affichés : affinez votre recherche.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="membre-fonction" className="block text-xs font-semibold text-slate-700 mb-1">
              Fonction dans le projet <span className="text-rose-500">*</span>
            </label>
            <select
              id="membre-fonction"
              value={fonctionId}
              onChange={(e) => setFonctionId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:border-brand-800 focus:ring-brand-800/20"
            >
              <option value="">Choisir une fonction...</option>
              {fonctions.map((f) => (
                <option key={f.id} value={f.id} disabled={f.libelle === LIBELLE_CHEF && aDejaUnChef}>
                  {f.libelle}
                  {f.libelle === LIBELLE_CHEF && aDejaUnChef ? ' (déjà attribué)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={closeAdd}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-white bg-brand-800 hover:bg-brand-900 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Ajout…' : 'Ajouter au projet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Retirer un membre */}
      <ConfirmModal
        isOpen={!!toRemove}
        onClose={() => setToRemove(null)}
        onConfirm={handleRemove}
        title="Retirer ce membre ?"
        message={`${toRemove?.personnel?.prenom ?? ''} ${toRemove?.personnel?.nom ?? ''} ne fera plus partie de ce projet.`}
        confirmLabel="Retirer"
        isLoading={isRemoving}
        details={
          removeError ? (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{removeError}</span>
            </div>
          ) : undefined
        }
      />
    </div>
  );
};