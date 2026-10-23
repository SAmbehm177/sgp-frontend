import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, toApiError } from '../../services/api';
import { Projet, Fonction, RouteParams } from '../../types/sgp';
import { ProjectStatusBadge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { formatJour, initiale } from '../../utils/format';
import { AlertCircle } from 'lucide-react';

interface ProfileViewProps {
  onNavigate: (route: string, params?: RouteParams) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate }) => {
  const { user, personnel, isAdmin, logout } = useAuth();

  const [projets, setProjets] = useState<Projet[]>([]);
  const [fonctions, setFonctions] = useState<Fonction[]>([]);
  const [isLoading, setIsLoading] = useState(!isAdmin);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoadError(null);
    try {
      const [liste, fonctionsListe] = await Promise.all([api.getProjets(), api.getFonctions()]);
      setProjets(liste);
      setFonctions(fonctionsListe);
    } catch (caught) {
      const err = toApiError(caught);
      setLoadError(err?.message || 'Impossible de charger vos projets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Un administrateur a accès à tous les projets : pas de liste d'affectations à afficher
    if (!isAdmin) load();
  }, [isAdmin]);

  if (!user) return null;

  const poste = personnel?.poste || (isAdmin ? 'Administrateur' : '—');

  const informations = [
    { label: 'Adresse e-mail', value: user.email },
    { label: 'Poste', value: poste },
    { label: 'Rôle sur la plateforme', value: isAdmin ? 'Administrateur' : 'Membre' },
    { label: 'Membre depuis le', value: formatJour(user.created_at.slice(0, 10)) },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Mon profil</h1>
        <p className="text-xs text-slate-500 mt-1">Les informations de votre compte et vos projets.</p>
      </div>

      {/* Identité */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-brand-800 text-white flex items-center justify-center font-bold text-2xl shadow-xs shrink-0">
            {initiale(user.name)}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 truncate">{user.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{poste}</p>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-6">
          {informations.map((info) => (
            <div key={info.label}>
              <dt className="text-[11px] text-slate-500">{info.label}</dt>
              <dd className="text-xs font-semibold text-slate-900 mt-0.5 break-words">{info.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Projets */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900">Mes projets</h2>
          {!isAdmin && projets.length > 0 && (
            <span className="text-[11px] text-slate-500">
              {projets.length} projet{projets.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isAdmin ? (
          <div className="text-xs text-slate-600 space-y-3">
            <p>En tant qu'administrateur, vous avez accès à tous les projets de la plateforme.</p>
            <button
              onClick={() => onNavigate('projets')}
              className="px-3 py-1.5 font-medium text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors"
            >
              Voir les projets
            </button>
          </div>
        ) : loadError ? (
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
                load();
              }}
              className="px-3 py-1.5 font-medium text-rose-800 bg-white border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors shrink-0"
            >
              Réessayer
            </button>
          </div>
        ) : isLoading ? (
          <div className="h-24 bg-slate-50 rounded-lg animate-pulse" aria-busy="true" />
        ) : projets.length === 0 ? (
          <EmptyState
            title="Aucun projet pour le moment"
            description="Vous n'appartenez encore à aucun projet. Un chef de projet ou un administrateur doit vous ajouter."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {projets.map((p) => {
              const fonction = fonctions.find((f) => f.id === p.ma_fonction_id)?.libelle ?? 'Membre';
              const estChef = fonction === 'Chef de projet';

              return (
                <button
                  key={p.id}
                  onClick={() => onNavigate('project-detail', { id: p.id })}
                  className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 text-left hover:bg-slate-50 px-2 -mx-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{p.titre}</p>
                    <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                      Échéance {formatJour(p.date_fin_prevue)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md border ${
                        estChef
                          ? 'bg-brand-50 text-brand-800 border-brand-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {fonction}
                    </span>
                    <ProjectStatusBadge status={p.statut} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <button
          onClick={() => logout()}
          className="px-4 py-2 text-xs font-medium text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
};