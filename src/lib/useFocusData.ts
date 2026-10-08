import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/** Carga datos cada vez que la pantalla toma foco. `data` queda en `initial` si la carga falla. */
export function useFocusData<T>(load: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      load()
        .then((value) => {
          if (!active) return;
          setData(value);
          setFailed(false);
        })
        .catch((err) => {
          console.warn('No se pudieron cargar los datos', err);
          if (active) setFailed(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [load]),
  );

  return { data, loading, failed, setData };
}
