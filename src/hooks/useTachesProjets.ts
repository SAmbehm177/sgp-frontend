import { useEffect, useMemo, useRef, useState } from 'react';
import { api, toApiError } from '../services/api';
import { Projet, Tache } from '../types/sgp';

interface EtatTaches {
  taches: Tache[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Charge les tâches des projets donnés (une requête paginée par projet, en parallèle).
 * Les projets déjà chargés sont gardés en mémoire : changer de périmètre ne relance
 * que les requêtes manquantes, et `retry` ne relance que celles qui ont échoué.
 */
export function useTachesProjets(projets: Projet[]) {
  const cache = useRef(new Map<number, Tache[]>());
  const [etat, setEtat] = useState<EtatTaches>({ taches: [], isLoading: true, error: null });
  const [tentative, setTentative] = useState(0);

  // Clé stable : l'effet ne dépend que des identifiants, pas de l'identité du tableau
  const ids = useMemo(() => projets.map((p) => p.id), [projets]);
  const cle = ids.join(',');

  useEffect(() => {
    let annule = false;
    const assembler = () => ids.flatMap((id) => cache.current.get(id) ?? []);
    const manquants = ids.filter((id) => !cache.current.has(id));

    if (manquants.length === 0) {
      setEtat({ taches: assembler(), isLoading: false, error: null });
      return;
    }

    setEtat((precedent) => ({ ...precedent, isLoading: true, error: null }));

    Promise.allSettled(
      manquants.map(async (id) => {
        cache.current.set(id, await api.getTaches(id));
      })
    ).then((resultats) => {
      if (annule) return;
      const echec = resultats.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      setEtat({
        taches: assembler(),
        isLoading: false,
        error: echec ? toApiError(echec.reason).message : null,
      });
    });

    return () => {
      annule = true;
    };
    // `cle` représente `ids` ; `tentative` relance le chargement après un échec
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, tentative]);

  return { ...etat, retry: () => setTentative((n) => n + 1) };
}
