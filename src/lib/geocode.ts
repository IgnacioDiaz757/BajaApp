import * as Location from 'expo-location';

import i18n from '../i18n';
export type Place = {
  name: string;
  detail: string;
  latitude: number;
  longitude: number;
};

// Córdoba capital: se prioriza esa zona (sin excluir el resto de Argentina).
const viewbox = '-64.40,-31.25,-63.95,-31.60';

type NominatimResult = { lat: string; lon: string; name?: string; display_name: string };

/** Busca direcciones y lugares. Usar al enviar la búsqueda, no en cada tecla (política de Nominatim). */
export async function searchPlaces(query: string, limit = 6): Promise<Place[]> {
  const text = query.trim();
  if (text.length < 3) return [];
  const params = new URLSearchParams({
    q: text,
    format: 'jsonv2',
    limit: String(limit),
    countrycodes: 'ar',
    viewbox,
    'accept-language': i18n.language,
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(i18n.t('El buscador no está disponible en este momento.'));
  const results = (await response.json()) as NominatimResult[];
  return results.map((item) => {
    const parts = item.display_name.split(',').map((part) => part.trim());
    return {
      name: item.name || parts[0],
      detail: parts.slice(1, 4).join(', '),
      latitude: Number(item.lat),
      longitude: Number(item.lon),
    };
  });
}

/** Devuelve las coordenadas de una dirección escrita a mano, o null si no la encuentra. */
export async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  const [first] = await searchPlaces(address, 1);
  if (first) return { latitude: first.latitude, longitude: first.longitude };
  try {
    const [local] = await Location.geocodeAsync(address);
    return local ? { latitude: local.latitude, longitude: local.longitude } : null;
  } catch {
    return null;
  }
}

/** Nombre legible para un punto elegido en el mapa. */
export async function describeCoordinates(latitude: number, longitude: number): Promise<string> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    const street = [place?.street ?? place?.name, place?.streetNumber].filter(Boolean).join(' ');
    const label = [street, place?.district ?? place?.city].filter(Boolean).join(', ');
    if (label) return label;
  } catch {
    // se usa el nombre genérico
  }
  return i18n.t('Ubicación del mapa');
}
