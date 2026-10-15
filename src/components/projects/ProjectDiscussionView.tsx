import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useNotifications } from '../../context/NotificationsContext';
import { api } from '../../services/api';
import { Message } from '../../types/sgp';
import { ConfirmModal } from '../common/ConfirmModal';
import { dateHeure, initiale } from '../../utils/format';
import { Send, Trash2, AlertCircle, MessageSquare } from 'lucide-react';

interface ProjectDiscussionViewProps {
  projetId: number;
  canManage: boolean; // admin ou chef de projet : peut supprimer n'importe quel message
}

const INTERVALLE_SONDAGE = 8000; // vérifie les nouveaux messages toutes les 8 s
const LONGUEUR_MAX = 2000; // même limite que le backend

export const ProjectDiscussionView: React.FC<ProjectDiscussionViewProps> = ({ projetId, canManage }) => {
  const { user } = useAuth();
  const toast = useToast();
  const { refresh: refreshNotifications } = useNotifications();

  const [messages, setMessages] = useState<Message[]>([]);
  const [aPlusAncien, setAPlusAncien] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const [contenu, setContenu] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [toDelete, setToDelete] = useState<Message | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const collerAuBas = useRef(true); // faut-il redescendre automatiquement à l'arrivée d'un message ?
  const dernierId = useRef(0); // sert au sondage : « donne-moi ce qui est après ce message »

  // Chargement initial (et à chaque changement de projet)
  useEffect(() => {
    let annule = false;
    collerAuBas.current = true;
    setIsLoading(true);
    setLoadError(null);
    setMessages([]);

    api
      .getMessages(projetId)
      .then((res) => {
        if (annule) return;
        setMessages(res.messages);
        setAPlusAncien(res.aPlusAncien);
        // Ouvrir la discussion marque ses notifications comme lues côté API : on actualise la cloche
        refreshNotifications();
      })
      .catch((err: any) => {
        if (!annule) setLoadError(err?.message || 'Impossible de charger la discussion.');
      })
      .finally(() => {
        if (!annule) setIsLoading(false);
      });

    return () => {
      annule = true;
    };
  }, [projetId, refreshNotifications]);

  useEffect(() => {
    dernierId.current = messages.length > 0 ? messages[messages.length - 1].id : 0;
  }, [messages]);

  // Sondage : récupère uniquement les nouveaux messages (onglet masqué = on ne demande rien)
  useEffect(() => {
    if (isLoading || loadError) return;

    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const res = await api.getMessages(projetId, { apresId: dernierId.current });
        if (res.messages.length === 0) return;
        refreshNotifications();
        setMessages((prev) => {
          const connus = new Set(prev.map((m) => m.id));
          return [...prev, ...res.messages.filter((m) => !connus.has(m.id))];
        });
      } catch {
        // silencieux : le prochain passage réessaiera
      }
    }, INTERVALLE_SONDAGE);

    return () => clearInterval(timer);
  }, [projetId, isLoading, loadError, refreshNotifications]);

  // Descend en bas du fil, sauf si l'utilisateur est remonté lire d'anciens messages
  useEffect(() => {
    const el = listRef.current;
    if (el && collerAuBas.current) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  const handleScroll = () => {
    const el = listRef.current;
    if (el) collerAuBas.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const chargerAnciens = async () => {
    if (messages.length === 0 || isLoadingOlder) return;
    const el = listRef.current;
    const hauteurAvant = el?.scrollHeight ?? 0;

    setIsLoadingOlder(true);
    try {
      const res = await api.getMessages(projetId, { avantId: messages[0].id });
      collerAuBas.current = false;
      setMessages((prev) => [...res.messages, ...prev]);
      setAPlusAncien(res.aPlusAncien);
      // Garde la lecture au même endroit une fois les anciens messages insérés au-dessus
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - hauteurAvant;
      });
    } catch (err: any) {
      toast.error('Chargement impossible', err?.message);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const envoyer = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    const texte = contenu.trim();
    if (!texte || isSending) return;

    setIsSending(true);
    try {
      const nouveau = await api.sendMessage(projetId, texte);
      collerAuBas.current = true;
      setMessages((prev) => (prev.some((m) => m.id === nouveau.id) ? prev : [...prev, nouveau]));
      setContenu('');
    } catch (err: any) {
      toast.error('Message non envoyé', err?.errors?.contenu?.[0] || err?.message);
    } finally {
      setIsSending(false);
    }
  };

  // Entrée envoie, Maj+Entrée va à la ligne
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) envoyer(e);
  };

  const supprimer = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteMessage(toDelete.id);
      setMessages((prev) => prev.filter((m) => m.id !== toDelete.id));
      setToDelete(null);
    } catch (err: any) {
      toast.error('Suppression impossible', err?.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="h-96 bg-white rounded-xl border border-slate-200 animate-pulse" aria-busy="true" />;
  }

  if (loadError) {
    return (
      <div className="p-10 text-center bg-white rounded-xl border border-slate-200">
        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs text-slate-500">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 flex flex-col">
      <div ref={listRef} onScroll={handleScroll} className="h-[28rem] overflow-y-auto p-4 space-y-4">
        {aPlusAncien && (
          <div className="text-center">
            <button
              onClick={chargerAnciens}
              disabled={isLoadingOlder}
              className="px-3 py-1.5 text-xs font-medium text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors disabled:opacity-60"
            >
              {isLoadingOlder ? 'Chargement…' : 'Afficher les messages plus anciens'}
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">Aucun message pour le moment</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Lancez la discussion : tous les membres de l'équipe verront vos messages.
            </p>
          </div>
        )}

        {messages.map((m) => {
          const moi = m.user_id === user?.id;
          const peutSupprimer = moi || canManage;

          return (
            <div key={m.id} className={`group flex items-start gap-2.5 ${moi ? 'flex-row-reverse' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-bold text-xs shrink-0">
                {initiale(m.auteur_nom)}
              </div>

              <div className={`min-w-0 max-w-[80%] ${moi ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1">
                  <span className="font-semibold text-slate-800">{moi ? 'Vous' : m.auteur_nom}</span>
                  <span>{dateHeure(m.created_at)}</span>
                  {peutSupprimer && (
                    <button
                      onClick={() => setToDelete(m)}
                      aria-label="Supprimer ce message"
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p
                  className={`px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap break-words ${
                    moi ? 'bg-brand-800 text-white' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {m.contenu}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={envoyer} className="flex items-end gap-2 p-3 border-t border-slate-100">
        <textarea
          rows={2}
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={LONGUEUR_MAX}
          placeholder="Écrire un message… (Entrée pour envoyer, Maj+Entrée pour aller à la ligne)"
          aria-label="Votre message"
          className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white resize-none focus:outline-hidden focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
        />
        <button
          type="submit"
          disabled={isSending || !contenu.trim()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-brand-800 hover:bg-brand-900 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5" />
          {isSending ? 'Envoi…' : 'Envoyer'}
        </button>
      </form>

      <ConfirmModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={supprimer}
        title="Supprimer ce message ?"
        message="Le message sera supprimé pour tous les membres du projet. Cette action est irréversible."
        confirmLabel="Supprimer"
        isLoading={isDeleting}
      />
    </div>
  );
};
