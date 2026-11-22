import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { MembreProjet, Projet } from '../../../types/sgp';
import { formatJour } from '../../../utils/format';
import { Modal } from '../../common/Modal';
import { PRIORITES } from './tacheFormulaire';
import type { TaskEditor } from './useTaskEditor';

interface TaskFormModalProps {
  editor: TaskEditor;
  projet: Projet;
  membres: MembreProjet[];
}

const inputClass = (hasError: boolean) =>
  `w-full px-3 py-2 text-xs border rounded-lg bg-white focus:outline-hidden focus:ring-2 ${
    hasError
      ? 'border-rose-400 focus:ring-rose-500/30'
      : 'border-slate-300 focus:border-brand-800 focus:ring-brand-800/20'
  }`;

/** Création / modification d'une tâche. */
export const TaskFormModal: React.FC<TaskFormModalProps> = ({ editor, projet, membres }) => {
  const {
    isOpen: isModalOpen,
    editing,
    form,
    errors: formErrors,
    message: formMessage,
    isSaving,
    close: closeModal,
    update,
    setResponsable,
    save: handleSave,
  } = editor;

  return (
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
              onChange={(e) => setResponsable(e.target.value ? Number(e.target.value) : '')}
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
  );
};
