import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';
import { toApiError } from '../services/api';

interface EtatChargement<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Charge des données au montage (et quand `deps` change), avec les trois états classiques :
 * chargement, erreur, données. Remplace le trio useState + try/catch + useEffect répété dans les vues.
 *
 * - une réponse qui arrive après un changement de `deps` ou le démontage est ignorée ;
 * - `reload()` relance la requête SANS vider l'écran : `isLoading` ne vaut true que tant
 *   qu'aucune donnée n'a encore été reçue.
 */
export function useApiData<T>(fetcher: () => Promise<T>, deps: DependencyList = []) {
  const [etat, setEtat] = useState<EtatChargement<T>>({ data: null, isLoading: true, error: null });
  const [version, setVersion] = useState(0);

  // Toujours la dernière version de `fetcher`, sans le mettre dans les dépendances de l'effet
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let annule = false;
    setEtat((precedent) => ({ ...precedent, isLoading: precedent.data === null, error: null }));

    fetcherRef
      .current()
      .then((data) => {
        if (!annule) setEtat({ data, isLoading: false, error: null });
      })
      .catch((caught: unknown) => {
        if (!annule) {
          setEtat((precedent) => ({
            data: precedent.data,
            isLoading: false,
            error: toApiError(caught).message,
          }));
        }
      });

    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { ...etat, reload };
}
