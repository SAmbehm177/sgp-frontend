import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { LIBELLE_CHEF_PROJET, LIBELLE_MEMBRE } from '../../../constants';
import { useToast } from '../../../context/ToastContext';
import { api, toApiError } from '../../../services/api';
import type { Fonction, MembreProjet, Projet } from '../../../types/sgp';
import { Modal } from '../../common/Modal';

interface ChangeChefModalProps {
  projet: Projet;
  /** Chef actuel du projet */
  ancienChef: MembreProjet;
  /** Membres actifs du projet (le chef actuel est écarté des candidats) */
  membres: MembreProjet[];
  fonctions: Fonction[];
  onClose: () => void;
  onChanged: () => void;
}

const nomComplet = (m: MembreProjet | undefined) => `${m?.personnel?.prenom ?? ''} ${m?.personnel?.nom ?? ''}`.trim();

const selectClass =
  'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:border-brand-800 focus:ring-brand-800/20 disabled:opacity-50';

/**
 * Remplace le chef de projet sans que le projet se retrouve un instant sans chef.
 * L'ancien chef reste dans le projet (avec une autre fonction) ou en est retiré, au choix.
 * À monter uniquement quand la fenêtre doit s'ouvrir : l'état du formulaire repart de zéro à chaque ouverture.
 */
export const ChangeChefModal: React.FC<ChangeChefModalProps> = ({
  projet,
  ancienChef,
  membres,
  fonctions,
  onClose,
  onChanged,
}) => {
  const toast = useToast();

  const candidats = membres.filter((m) => m.personnel_id !== ancienChef.personnel_id);
  // Fonctions possibles pour l'ancien chef : toutes sauf « Chef de projet » (« Membre » proposée d'abord)
  const fonctionsAncienChef = fonctions.filter((f) => f.libelle !== LIBELLE_CHEF_PROJET);
  const fonctionParDefaut = fonctionsAncienChef.find((f) => f.libelle === LIBELLE_MEMBRE) ?? fonctionsAncienChef[0];

  const [nouveauChefId, setNouveauChefId] = useState<number | ''>('');
  const [resteDansLeProjet, setResteDansLeProjet] = useState(true);
  const [fonctionAncienId, setFonctionAncienId] = useState<number | ''>(fonctionParDefaut?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const nouveauChef = candidats.find((m) => m.personnel_id === nouveauChefId);
  const fonctionAncien = fonctionsAncienChef.find((f) => f.id === fonctionAncienId);
  const formulaireValide = !!nouveauChef && (!resteDansLeProjet || !!fonctionAncien);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nouveauChef || !formulaireValide) return;

    setError(null);
    setIsSaving(true);
    try {
      await api.transfererChefProjet(projet.id, ancienChef.personnel_id, nouveauChef.personnel_id, {
        retirerAncienChef: !resteDansLeProjet,
        fonctionAncienChefId: resteDansLeProjet ? fonctionAncien?.id : undefined,
      });
      toast.success(
        'Chef de projet changé',
        resteDansLeProjet
          ? `${nomComplet(nouveauChef)} devient chef de projet. ${nomComplet(ancienChef)} reste membre du projet (${fonctionAncien?.libelle}).`
          : `${nomComplet(nouveauChef)} devient chef de projet. ${nomComplet(ancienChef)} a été retiré du projet.`
      );
      onChanged();
      onClose();
    } catch (caught) {
      setError(toApiError(caught)?.message || 'Impossible de changer le chef de projet.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Changer de chef de projet"
      description={`Le projet « ${projet.titre} » ne reste jamais sans chef : le changement est effectué en une seule opération.`}
      maxWidth="md"
    >
      {candidats.length === 0 ? (
        <div className="space-y-4">
          <div
            role="alert"
            className="flex items-start gap-2 p-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl"
          >
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Ajoutez d’abord un autre membre au projet pour pouvoir lui confier le rôle de chef.</span>
          </div>
          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <p className="text-sm text-slate-700">
            Chef actuel : <span className="font-semibold">{nomComplet(ancienChef)}</span>
          </p>

          <div>
            <label htmlFor="nouveau-chef" className="block text-xs font-semibold text-slate-700 mb-1">
              Nouveau chef de projet <span className="text-rose-500">*</span>
            </label>
            <select
              id="nouveau-chef"
              value={nouveauChefId}
              onChange={(e) => {
                setNouveauChefId(e.target.value ? Number(e.target.value) : '');
                setError(null);
              }}
              className={selectClass}
              autoFocus
            >
              <option value="">Sélectionnez un membre actif...</option>
              {candidats.map((m) => (
                <option key={m.personnel_id} value={m.personnel_id}>
                  {nomComplet(m)} ({m.fonction?.libelle ?? LIBELLE_MEMBRE})
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-slate-700 mb-1">
              Que devient {nomComplet(ancienChef)} ?
            </legend>

            <label className="flex items-start gap-2 text-sm text-slate-800 cursor-pointer">
              <input
                type="radio"
                name="devenir-ancien-chef"
                checked={resteDansLeProjet}
                onChange={() => setResteDansLeProjet(true)}
                className="mt-1"
              />
              <span className="flex-1">
                Il reste dans le projet avec la fonction :
                <select
                  aria-label="Fonction de l’ancien chef"
                  value={fonctionAncienId}
                  onChange={(e) => setFonctionAncienId(e.target.value ? Number(e.target.value) : '')}
                  disabled={!resteDansLeProjet}
                  className={`${selectClass} mt-1`}
                >
                  {fonctionsAncienChef.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.libelle}
                    </option>
                  ))}
                </select>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-slate-800 cursor-pointer">
              <input
                type="radio"
                name="devenir-ancien-chef"
                checked={!resteDansLeProjet}
                onChange={() => setResteDansLeProjet(false)}
                className="mt-1"
              />
              <span>
                Il est retiré du projet
                <span className="block text-xs text-slate-500">
                  Impossible tant qu’il a des tâches en cours dans ce projet.
                </span>
              </span>
            </label>
          </fieldset>

          {nouveauChef && (
            <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
              Après validation : <strong>{nomComplet(nouveauChef)}</strong> sera chef de projet ;{' '}
              <strong>{nomComplet(ancienChef)}</strong>{' '}
              {resteDansLeProjet ? `restera dans le projet (${fonctionAncien?.libelle ?? '…'}).` : 'sera retiré du projet.'}
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving || !formulaireValide}
              className="px-4 py-2 text-xs font-medium text-white bg-brand-800 hover:bg-brand-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Changement en cours…' : 'Changer de chef'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
