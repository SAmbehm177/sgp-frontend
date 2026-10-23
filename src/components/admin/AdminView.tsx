import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api, toApiError } from '../../services/api';
import { User } from '../../types/sgp';
import { ConfirmModal } from '../common/ConfirmModal';
import { PersonnelAdmin } from './PersonnelAdmin';
import { EmptyState } from '../common/EmptyState';
import { formatJour, initiale } from '../../utils/format';
import { Shield, Search, AlertCircle } from 'lucide-react';

type Filtre = 'tous' | 'actifs' | 'desactives';

export const AdminView: React.FC = () => {
  const { user: moi, isAdmin } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filtre, setFiltre] = useState<Filtre>('tous');

  // Changement de statut
  const [cible, setCible] = useState<User | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadUsers = async () => {
    setLoadError(null);
    try {
      setUsers(await api.getUsers());
    } catch (caught) {
      const err = toApiError(caught);
      setLoadError(err?.message || 'Impossible de charger les comptes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <EmptyState
        icon={<Shield className="w-6 h-6" />}
        title="Accès réservé"
        description="Cette page est réservée aux administrateurs."
      />
    );
  }

  const actifs = users.filter((u) => u.is_active).length;
  const desactives = users.length - actifs;

  const FILTRES: { id: Filtre; label: string; n: number }[] = [
    { id: 'tous', label: 'Tous', n: users.length },
    { id: 'actifs', label: 'Actifs', n: actifs },
    { id: 'desactives', label: 'Désactivés', n: desactives },
  ];

  const filtered = users.filter((u) => {
    const terme = search.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(terme) ||
      u.email.toLowerCase().includes(terme) ||
      (u.poste ?? '').toLowerCase().includes(terme) ||
      (u.matricule ?? '').toLowerCase().includes(terme);
    const matchesFiltre =
      filtre === 'tous' || (filtre === 'actifs' && u.is_active) || (filtre === 'desactives' && !u.is_active);
    return matchesSearch && matchesFiltre;
  });

  const handleConfirm = async () => {
    if (!cible) return;
    setActionError(null);
    setIsSaving(true);
    try {
      const activer = !cible.is_active;
      await api.setUserActive(cible.id, activer);
      toast.success(
        activer ? 'Compte réactivé' : 'Compte désactivé',
        activer
          ? `${cible.name} peut de nouveau se connecter.`
          : `${cible.name} ne peut plus se connecter.`
      );
      setCible(null);
      await loadUsers();
    } catch (caught) {
      const err = toApiError(caught);
      setActionError(err?.message || 'Impossible de modifier le statut de ce compte.');
    } finally {
      setIsSaving(false);
    }
  };

  const desactivation = cible ? cible.is_active : true;

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Administration</h1>
        <p className="text-xs text-slate-500 mt-1">
          Créez le personnel, donnez-lui un accès, puis activez ou désactivez les comptes ici.
        </p>
      </div>

      <PersonnelAdmin onAccessGranted={loadUsers} />

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
              loadUsers();
            }}
            className="px-3 py-1.5 font-medium text-rose-800 bg-white border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors shrink-0"
          >
            Réessayer
          </button>
        </div>
      )}

      {isLoading && <div className="h-48 bg-white rounded-xl border border-slate-200 animate-pulse" aria-busy="true" />}

      {!isLoading && !loadError && (
        <>
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto w-fit max-w-full">
              {FILTRES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltre(f.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    filtre === f.id ? 'bg-white text-brand-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label} ({f.n})
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom, e-mail, matricule ou poste..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:border-brand-800 focus:ring-brand-800/20"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
                    <th className="py-3 px-4">Utilisateur</th>
                    <th className="py-3 px-4">Poste</th>
                    <th className="py-3 px-4">Rôle</th>
                    <th className="py-3 px-4">Compte créé le</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        Aucun compte ne correspond à votre recherche.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((u) => {
                      const estMoi = u.id === moi?.id;

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-bold text-xs shrink-0">
                                {initiale(u.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 truncate">
                                  {u.name}
                                  {estMoi && <span className="ml-1.5 text-[11px] font-normal text-slate-400">(vous)</span>}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-600">{u.poste || '—'}</td>

                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border ${
                                u.role === 'admin'
                                  ? 'bg-brand-50 text-brand-800 border-brand-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {u.role === 'admin' ? 'Administrateur' : 'Membre'}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                            {formatJour(u.created_at.slice(0, 10))}
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-md border ${
                                u.is_active
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {u.is_active ? 'Actif' : 'Désactivé'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setActionError(null);
                                setCible(u);
                              }}
                              disabled={estMoi}
                              title={estMoi ? 'Vous ne pouvez pas modifier votre propre compte.' : undefined}
                              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                u.is_active
                                  ? 'text-rose-700 border-rose-200 hover:bg-rose-50'
                                  : 'text-brand-800 border-brand-200 hover:bg-brand-50'
                              }`}
                            >
                              {u.is_active ? 'Désactiver' : 'Réactiver'}
                            </button>
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

      <ConfirmModal
        isOpen={!!cible}
        onClose={() => setCible(null)}
        onConfirm={handleConfirm}
        title={desactivation ? 'Désactiver ce compte ?' : 'Réactiver ce compte ?'}
        message={
          desactivation
            ? `${cible?.name ?? ''} ne pourra plus se connecter et sera déconnecté immédiatement. Ses affectations (projets, tâches) sont conservées.`
            : `${cible?.name ?? ''} pourra de nouveau se connecter et retrouvera ses projets et ses tâches.`
        }
        confirmLabel={desactivation ? 'Désactiver' : 'Réactiver'}
        isDestructive={desactivation}
        isLoading={isSaving}
        details={
          actionError ? (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{actionError}</span>
            </div>
          ) : undefined
        }
      />
    </div>
  );
};