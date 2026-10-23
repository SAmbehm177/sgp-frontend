import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import { api, toApiError } from '../../services/api';
import { Personnel } from '../../types/sgp';
import { Modal } from '../common/Modal';
import { AlertCircle, KeyRound, UserPlus } from 'lucide-react';

interface PersonnelAdminProps {
  onAccessGranted: () => void; // recharge la liste des comptes
}

const INPUT =
  'w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20';
const LABEL = 'block text-xs font-medium text-slate-700 mb-1';

const FICHE_VIDE = { prenom: '', nom: '', matricule: '', poste: '' };
const ACCES_VIDE = { email: '', password: '', role: 'user' as 'user' | 'admin' };

// Le personnel est créé par l'administrateur, sans compte ; l'accès (compte) est accordé ensuite.
export const PersonnelAdmin: React.FC<PersonnelAdminProps> = ({ onAccessGranted }) => {
  const toast = useToast();

  const [sansAcces, setSansAcces] = useState<Personnel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [creation, setCreation] = useState(false);
  const [fiche, setFiche] = useState(FICHE_VIDE);

  const [cible, setCible] = useState<Personnel | null>(null);
  const [acces, setAcces] = useState(ACCES_VIDE);

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setLoadError(null);
    try {
      setSansAcces(await api.getPersonnelSansAcces());
    } catch (caught) {
      const err = toApiError(caught);
      setLoadError(err.message || 'Impossible de charger le personnel.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const premiereErreur = (err: ReturnType<typeof toApiError>) =>
    Object.values(err.errors ?? {})[0]?.[0] || err.message;

  const creerPersonnel = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);
    try {
      const cree = await api.createPersonnel({
        prenom: fiche.prenom.trim(),
        nom: fiche.nom.trim(),
        matricule: fiche.matricule.trim(),
        poste: fiche.poste.trim(),
      });
      toast.success('Personnel créé', `${cree.prenom} ${cree.nom} peut maintenant recevoir un accès.`);
      setCreation(false);
      setFiche(FICHE_VIDE);
      await charger();
    } catch (caught) {
      setFormError(premiereErreur(toApiError(caught)));
    } finally {
      setIsSaving(false);
    }
  };

  const accorderAcces = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!cible) return;
    setFormError(null);
    setIsSaving(true);
    try {
      await api.grantAccess(cible.id, {
        email: acces.email.trim(),
        password: acces.password,
        role: acces.role,
      });
      toast.success('Accès accordé', `${cible.prenom} ${cible.nom} peut se connecter avec cet e-mail.`);
      setCible(null);
      setAcces(ACCES_VIDE);
      await charger();
      onAccessGranted();
    } catch (caught) {
      setFormError(premiereErreur(toApiError(caught)));
    } finally {
      setIsSaving(false);
    }
  };

  const erreurBloc = formError && (
    <div role="alert" className="flex items-start gap-2 p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl">
      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
      <span>{formError}</span>
    </div>
  );

  const boutons = (libelle: string, onCancel: () => void) => (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
      >
        Annuler
      </button>
      <button
        type="submit"
        disabled={isSaving}
        className="px-3.5 py-2 text-xs font-medium text-white bg-brand-800 hover:bg-brand-900 rounded-lg disabled:opacity-60"
      >
        {isSaving ? 'Enregistrement…' : libelle}
      </button>
    </div>
  );

  return (
    <section className="bg-white rounded-xl border border-slate-200">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Personnel sans accès</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Créez d'abord la fiche du personnel, puis donnez-lui un accès pour qu'il puisse se connecter.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setCreation(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-brand-800 hover:bg-brand-900 rounded-lg shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Nouveau personnel
        </button>
      </div>

      {isLoading && <div className="h-20 animate-pulse" aria-busy="true" />}
      {loadError && <p className="p-4 text-xs text-rose-700">{loadError}</p>}

      {!isLoading && !loadError && sansAcces.length === 0 && (
        <p className="p-4 text-xs text-slate-500">Tout le personnel a déjà un accès.</p>
      )}

      {sansAcces.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {sansAcces.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-xs">
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate">
                  {p.prenom} {p.nom}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {p.matricule} · {p.poste}
                </div>
              </div>
              <button
                onClick={() => {
                  setFormError(null);
                  setAcces(ACCES_VIDE);
                  setCible(p);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-brand-800 border border-brand-200 rounded-lg hover:bg-brand-50 shrink-0"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Donner l'accès
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={creation}
        onClose={() => setCreation(false)}
        title="Nouveau personnel"
        description="La fiche est créée sans compte : vous donnerez l'accès ensuite."
        maxWidth="md"
      >
        <form onSubmit={creerPersonnel} className="space-y-3">
          {erreurBloc}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="p-prenom">Prénom</label>
              <input id="p-prenom" className={INPUT} required value={fiche.prenom} onChange={(e) => setFiche({ ...fiche, prenom: e.target.value })} />
            </div>
            <div>
              <label className={LABEL} htmlFor="p-nom">Nom</label>
              <input id="p-nom" className={INPUT} required value={fiche.nom} onChange={(e) => setFiche({ ...fiche, nom: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={LABEL} htmlFor="p-matricule">Matricule</label>
            <input id="p-matricule" className={INPUT} required placeholder="Ex. MAT-00123" value={fiche.matricule} onChange={(e) => setFiche({ ...fiche, matricule: e.target.value })} />
          </div>
          <div>
            <label className={LABEL} htmlFor="p-poste">Poste</label>
            <input id="p-poste" className={INPUT} required value={fiche.poste} onChange={(e) => setFiche({ ...fiche, poste: e.target.value })} />
          </div>
          {boutons('Créer le personnel', () => setCreation(false))}
        </form>
      </Modal>

      <Modal
        isOpen={!!cible}
        onClose={() => setCible(null)}
        title="Donner l'accès"
        description={cible ? `Compte de ${cible.prenom} ${cible.nom}. Communiquez-lui l'e-mail et le mot de passe provisoire.` : undefined}
        maxWidth="md"
      >
        <form onSubmit={accorderAcces} className="space-y-3">
          {erreurBloc}
          <div>
            <label className={LABEL} htmlFor="a-email">Adresse e-mail</label>
            <input id="a-email" type="email" autoComplete="off" className={INPUT} required value={acces.email} onChange={(e) => setAcces({ ...acces, email: e.target.value })} />
          </div>
          <div>
            <label className={LABEL} htmlFor="a-password">Mot de passe provisoire (8 caractères minimum)</label>
            <input id="a-password" type="text" autoComplete="off" minLength={8} className={INPUT} required value={acces.password} onChange={(e) => setAcces({ ...acces, password: e.target.value })} />
          </div>
          <div>
            <label className={LABEL} htmlFor="a-role">Rôle</label>
            <select id="a-role" className={INPUT} value={acces.role} onChange={(e) => setAcces({ ...acces, role: e.target.value as 'user' | 'admin' })}>
              <option value="user">Membre</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          {boutons("Accorder l'accès", () => setCible(null))}
        </form>
      </Modal>
    </section>
  );
};
