import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { NotificationItem, Projet, Fonction, Tache } from '../../types/sgp';
import { TaskStatusBadge, TaskPriorityBadge } from '../common/Badge';
import { dateHeure, joursDeRetard, formatJour } from '../../utils/format';
import { AlertCircle, UserCheck, RefreshCw, Bell, Check, FolderPlus, FolderMinus } from 'lucide-react';

interface NotificationsViewProps {
  onNavigate: (route: string, params?: any) => void;
}

type Onglet = 'toutes' | 'non_lues';
type FiltreType = 'all' | NotificationItem['type'];

const TITRES: Record<NotificationItem['type'], string> = {
  tache_affectee: 'Une tâche vous est assignée',
  tache_statut_modifie: "Le statut d'une tâche a changé",
  membre_ajoute: 'Vous avez rejoint un projet',
  membre_retire: "Vous avez été retiré d'un projet",
  autre: 'Notification',
};

const PUCES: Record<NotificationItem['type'], { icone: React.ElementType; classe: string }> = {
  tache_affectee: { icone: UserCheck, classe: 'bg-brand-50 text-brand-800' },
  tache_statut_modifie: { icone: RefreshCw, classe: 'bg-sky-50 text-sky-700' },
  membre_ajoute: { icone: FolderPlus, classe: 'bg-emerald-50 text-emerald-700' },
  membre_retire: { icone: FolderMinus, classe: 'bg-rose-50 text-rose-700' },
  autre: { icone: Bell, classe: 'bg-slate-100 text-slate-600' },
};

const selectClass =
  'px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:border-brand-800 focus:ring-brand-800/20';

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigate }) => {
  const { personnel, isAdmin } = useAuth();
  const { markAsRead, markAllAsRead } = useNotifications();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [projets, setProjets] = useState<Projet[]>([]);
  const [fonctions, setFonctions] = useState<Fonction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [onglet, setOnglet] = useState<Onglet>('toutes');
  const [filtreProjet, setFiltreProjet] = useState<string>('all');
  const [filtreType, setFiltreType] = useState<FiltreType>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Détail des tâches déjà consultées (null = tâche supprimée ou inaccessible)
  const [taches, setTaches] = useState<Record<number, Tache | null>>({});

  const load = async () => {
    setLoadError(null);
    try {
      const [liste, projetsListe, fonctionsListe] = await Promise.all([
        api.getAllNotifications(),
        api.getProjets().catch(() => [] as Projet[]),
        api.getFonctions().catch(() => [] as Fonction[]),
      ]);
      setItems(liste);
      setProjets(projetsListe);
      setFonctions(fonctionsListe);
    } catch (err: any) {
      setLoadError(err?.message || 'Impossible de charger les notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const nonLues = items.filter((n) => !n.lue).length;

  const affichees = items.filter((n) => {
    if (onglet === 'non_lues' && n.lue) return false;
    if (filtreProjet !== 'all' && String(n.projet_id) !== filtreProjet) return false;
    if (filtreType !== 'all' && n.type !== filtreType) return false;
    return true;
  });

  // Sélection par défaut : la première notification de la liste affichée
  useEffect(() => {
    if (affichees.length === 0) {
      if (selectedId !== null) setSelectedId(null);
    } else if (!affichees.some((n) => n.id === selectedId)) {
      setSelectedId(affichees[0].id);
    }
  }, [items, onglet, filtreProjet, filtreType]);

  const selection = items.find((n) => n.id === selectedId) ?? null;
  const tacheId = selection?.tache_id;

  // Charge la tâche concernée par la notification sélectionnée
  useEffect(() => {
    if (!tacheId || tacheId in taches) return;
    let annule = false;
    api
      .getTache(tacheId)
      .then((t) => !annule && setTaches((prev) => ({ ...prev, [tacheId]: t })))
      .catch(() => !annule && setTaches((prev) => ({ ...prev, [tacheId]: null })));
    return () => {
      annule = true;
    };
  }, [tacheId]);

  const nomProjet = (n: NotificationItem) =>
    n.projet_id === undefined
      ? ''
      : projets.find((p) => p.id === n.projet_id)?.titre ?? n.projet_titre ?? `Projet #${n.projet_id}`;

  const marquerLue = (n: NotificationItem) => {
    if (n.lue) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, lue: true } : x)));
    markAsRead(n.id);
  };

  const toutMarquerLu = () => {
    setItems((prev) => prev.map((x) => ({ ...x, lue: true })));
    markAllAsRead();
  };

  const ouvrir = (n: NotificationItem) => {
    marquerLue(n);
    // Après un retrait, le projet n'est plus accessible
    if (n.projet_id && n.type !== 'membre_retire') {
      onNavigate('project-detail', { id: n.projet_id, tab: n.type === 'membre_ajoute' ? 'vue-ensemble' : 'taches' });
    }
  };

  // Phrase de contexte selon le rôle de l'utilisateur sur le projet concerné
  const contexte = (n: NotificationItem, tache?: Tache | null): string | null => {
    if (n.projet_id === undefined) return null;
    if (n.type === 'membre_retire') {
      return 'Vous ne faites plus partie de ce projet : il n’apparaît plus dans votre liste de projets.';
    }
    if (isAdmin) return 'Vous êtes administrateur : vous avez accès à l’ensemble de ce projet.';

    const projet = projets.find((p) => p.id === n.projet_id);
    if (!projet) return null;

    const fonction = fonctions.find((f) => f.id === projet.ma_fonction_id)?.libelle;
    if (fonction === 'Chef de projet') {
      return 'Vous êtes chef de projet. Vous pouvez ajuster l’échéance ou changer le statut depuis la fiche de la tâche.';
    }
    if (tache && personnel && tache.responsable_id === personnel.id) {
      return 'Vous êtes responsable de cette tâche. Vous pouvez changer son statut depuis la fiche de la tâche.';
    }
    return `Vous êtes ${fonction ? fonction.toLowerCase() : 'membre'} de ce projet.`;
  };

  const ONGLETS: { id: Onglet; label: string; n: number }[] = [
    { id: 'toutes', label: 'Toutes', n: items.length },
    { id: 'non_lues', label: 'Non lues', n: nonLues },
  ];

  const tacheSelection = tacheId !== undefined ? taches[tacheId] : undefined; // undefined = en chargement
  const retard =
    tacheSelection && tacheSelection.statut === 'en_cours' ? joursDeRetard(tacheSelection.date_echeance) : 0;
  const phraseContexte = selection ? contexte(selection, tacheSelection) : null;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Suivi / Votre activité
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">Notifications</h1>
          <p className="text-xs text-slate-500 mt-1">
            Les informations utiles sur vos projets et les tâches qui vous concernent.
          </p>
        </div>

        <button
          onClick={toutMarquerLu}
          disabled={nonLues === 0}
          className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Tout marquer comme lu
        </button>
      </div>

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
              load();
            }}
            className="px-3 py-1.5 font-medium text-rose-800 bg-white border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors shrink-0"
          >
            Réessayer
          </button>
        </div>
      )}

      {isLoading && <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" aria-busy="true" />}

      {!isLoading && !loadError && (
        <>
          {/* Onglets */}
          <div className="border-b border-slate-200">
            <nav className="flex gap-6">
              {ONGLETS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOnglet(o.id)}
                  className={`py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    onglet === o.id
                      ? 'border-brand-800 text-brand-800 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {o.label} · {o.n}
                </button>
              ))}
            </nav>
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filtreProjet}
              onChange={(e) => setFiltreProjet(e.target.value)}
              className={selectClass}
              aria-label="Filtrer par projet"
            >
              <option value="all">Projet : tous</option>
              {projets.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.titre}
                </option>
              ))}
            </select>

            <select
              value={filtreType}
              onChange={(e) => setFiltreType(e.target.value as FiltreType)}
              className={selectClass}
              aria-label="Filtrer par type"
            >
              <option value="all">Type : tous</option>
              <option value="tache_affectee">Tâche assignée</option>
              <option value="tache_statut_modifie">Statut modifié</option>
              <option value="membre_ajoute">Ajouté à un projet</option>
              <option value="membre_retire">Retiré d'un projet</option>
            </select>

            <span className="text-[11px] text-slate-400">Les plus récentes en premier</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            {/* Boîte de réception */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900">Votre boîte de réception</h2>
                {nonLues > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-semibold text-brand-800 bg-brand-50 border border-brand-200 rounded-full">
                    {nonLues} non lue{nonLues > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {affichees.length === 0 ? (
                <p className="py-12 text-center text-xs text-slate-500">
                  {items.length === 0
                    ? "Vous serez prévenu ici lorsqu'une tâche vous sera confiée ou que son statut changera."
                    : 'Aucune notification ne correspond à ces filtres.'}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {affichees.map((n) => {
                    const puce = PUCES[n.type];
                    const Icone = puce.icone;
                    const actif = n.id === selectedId;

                    return (
                      <button
                        key={n.id}
                        onClick={() => setSelectedId(n.id)}
                        aria-current={actif}
                        className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          actif ? 'border-brand-300 bg-brand-50/60' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${puce.classe}`}
                        >
                          <Icone className="w-4 h-4" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-xs ${n.lue ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}
                          >
                            {TITRES[n.type]}
                          </span>
                          <span className="block text-[11px] text-slate-600 mt-0.5 leading-relaxed line-clamp-2">
                            {n.message}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-1">
                            {nomProjet(n)}
                            {n.projet_id !== undefined && ' · '}
                            {dateHeure(n.created_at)}
                          </span>
                        </span>

                        {n.lue ? (
                          <Check className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-1" aria-label="Lue" />
                        ) : (
                          <span
                            className="w-2 h-2 rounded-full bg-brand-800 shrink-0 mt-1.5"
                            role="img"
                            aria-label="Non lue"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {affichees.length > 0 && (
                <p className="mt-4 text-[11px] text-slate-400">
                  Fin de la liste · {affichees.length} notification{affichees.length > 1 ? 's' : ''} affichée
                  {affichees.length > 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Détail */}
            <div className="lg:col-span-2 space-y-4">
              {selection ? (
                <>
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h2 className="text-base font-bold text-slate-900">{TITRES[selection.type]}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      {!selection.lue && (
                        <span className="px-2 py-0.5 text-[11px] font-semibold text-brand-800 bg-brand-50 border border-brand-200 rounded-md">
                          Non lue
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500">{dateHeure(selection.created_at)}</span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      {tacheId !== undefined && tacheSelection === undefined && (
                        <div className="space-y-2" aria-busy="true">
                          <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
                          <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                        </div>
                      )}

                      {tacheSelection && (
                        <>
                          <h3 className="text-sm font-bold text-slate-900">{tacheSelection.titre}</h3>
                          <p className="text-xs text-slate-600 leading-relaxed">{selection.message}</p>
                          {tacheSelection.description && (
                            <p className="text-xs text-slate-500 leading-relaxed">{tacheSelection.description}</p>
                          )}

                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-slate-500">Responsable</span>
                            <span className="font-semibold text-slate-800">
                              {tacheSelection.responsable?.prenom} {tacheSelection.responsable?.nom}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Échéance</span>
                            <span className="font-mono text-slate-800">{formatJour(tacheSelection.date_echeance)}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <TaskStatusBadge status={tacheSelection.statut} isOverdue={retard > 0} />
                            <TaskPriorityBadge priority={tacheSelection.priorite} />
                            {retard > 0 && (
                              <span className="px-2 py-0.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
                                {retard} jour{retard > 1 ? 's' : ''} de retard
                              </span>
                            )}
                          </div>
                        </>
                      )}

                      {(tacheId === undefined || tacheSelection === null) && (
                        <>
                          <p className="text-xs text-slate-600 leading-relaxed">{selection.message}</p>
                          {tacheSelection === null && (
                            <p className="text-[11px] text-slate-400">
                              Cette tâche n'existe plus ou n'est plus accessible.
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      {selection.projet_id !== undefined && selection.type !== 'membre_retire' && (
                        <button
                          onClick={() => ouvrir(selection)}
                          className="px-3.5 py-2 text-xs font-medium text-white bg-brand-800 hover:bg-brand-900 rounded-lg transition-colors shadow-xs"
                        >
                          {selection.type === 'membre_ajoute' ? 'Ouvrir le projet' : 'Ouvrir les tâches du projet'}
                        </button>
                      )}
                      <button
                        onClick={() => marquerLue(selection)}
                        disabled={selection.lue}
                        className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {selection.lue ? 'Déjà lue' : 'Marquer comme lue'}
                      </button>
                    </div>
                  </div>

                  {phraseContexte && (
                    <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
                      <p className="text-[11px] font-bold text-brand-800">
                        Votre contexte sur {nomProjet(selection)}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{phraseContexte}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                  Sélectionnez une notification pour en voir le détail.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};