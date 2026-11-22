import React, { useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { api, toApiError } from '../../../services/api';
import type { MembreProjet, Projet, Tache } from '../../../types/sgp';
import {
  ChampFormulaire,
  ErreursFormulaire,
  FORMULAIRE_VIDE,
  borner,
  formulaireDepuisTache,
  validerFormulaire,
} from './tacheFormulaire';

interface UseTaskEditorOptions {
  projet: Projet;
  membres: MembreProjet[];
  personnelId?: number;
  today: string;
  /** Appelé après une création ou une modification réussie (rechargement de la liste) */
  onSaved: () => void | Promise<void>;
}

/** Fenêtre de création / modification d'une tâche : état du formulaire, validation et enregistrement. */
export function useTaskEditor({ projet, membres, personnelId, today, onSaved }: UseTaskEditorOptions) {
  const toast = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Tache | null>(null);
  const [form, setForm] = useState(FORMULAIRE_VIDE);
  const [errors, setErrors] = useState<ErreursFormulaire>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const close = () => {
    setIsOpen(false);
    setEditing(null);
    setErrors({});
    setMessage(null);
  };

  const openCreate = () => {
    const moi = membres.find((m) => m.personnel_id === personnelId);
    setEditing(null);
    setForm({ ...FORMULAIRE_VIDE, responsable_id: moi ? moi.personnel_id : '', date_debut: borner(today, projet) });
    setErrors({});
    setMessage(null);
    setIsOpen(true);
  };

  const openEdit = (t: Tache) => {
    setEditing(t);
    setForm(formulaireDepuisTache(t));
    setErrors({});
    setMessage(null);
    setIsOpen(true);
  };

  const update =
    (field: ChampFormulaire) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const setResponsable = (responsableId: number | '') =>
    setForm((prev) => ({ ...prev, responsable_id: responsableId }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    const erreurs = validerFormulaire(form, projet);
    if (Object.keys(erreurs).length > 0) {
      setMessage(null);
      setErrors(erreurs);
      return;
    }

    setErrors({});
    setMessage(null);
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

      close();
      await onSaved();
    } catch (caught) {
      const err = toApiError(caught);
      setMessage(err?.message || "Impossible d'enregistrer la tâche.");
      if (err?.errors) {
        const fe: ErreursFormulaire = {};
        Object.entries(err.errors as Record<string, string[]>).forEach(([k, v]) => {
          if (k in FORMULAIRE_VIDE) fe[k as ChampFormulaire] = v[0];
        });
        setErrors(fe);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return { isOpen, editing, form, errors, message, isSaving, close, openCreate, openEdit, update, setResponsable, save };
}

export type TaskEditor = ReturnType<typeof useTaskEditor>;
