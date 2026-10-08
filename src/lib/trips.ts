import { format, isToday, isYesterday } from 'date-fns';
import { enUS, es, pt } from 'date-fns/locale';
import i18n from '../i18n';
import { useTripStore } from '../stores/trip';
import { supabase } from './supabase';
import { stopTripTracking } from './tripTracking';

export type TripStatus = 'active' | 'arrived' | 'missed' | 'cancelled';
export type TripAlertKind = 'two_km' | 'one_km' | 'five_hundred_m' | 'two_hundred_m' | 'arrived' | 'missed';

export type TripRow = {
  id: string;
  destination_label: string;
  destination_address: string | null;
  status: TripStatus;
  started_at: string;
  ended_at: string | null;
};

const alertKindByMeters: Record<number, TripAlertKind> = {
  2000: 'two_km',
  1000: 'one_km',
  500: 'five_hundred_m',
  200: 'two_hundred_m',
};

export const alertKindForMeters = (meters: number): TripAlertKind | null => alertKindByMeters[meters] ?? null;

/** Devuelve el id del usuario; si no hay sesión crea una anónima para poder guardar el viaje. */
async function ensureUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('No se pudo abrir una sesión para guardar el viaje', error.message);
    return null;
  }
  return anon.user?.id ?? null;
}

export async function startTrip(input: {
  destination: string;
  latitude: number;
  longitude: number;
  mode: 'distance' | 'time';
  busLineId?: string | null;
}): Promise<string | null> {
  try {
    const userId = await ensureUserId();
    if (!userId) return null;
    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: userId,
        destination_label: input.destination,
        destination_latitude: input.latitude,
        destination_longitude: input.longitude,
        alert_mode: input.mode,
        bus_line_id: input.busLineId ?? null,
      })
      .select('id')
      .single();
    if (error) throw error;
    useTripStore.getState().setActiveTripId(data.id);
    return data.id;
  } catch (err) {
    console.warn('No se pudo guardar el viaje', err);
    return null;
  }
}

/** Cierra el viaje en curso (llegada, parada perdida o cancelación). Es seguro llamarlo varias veces. */
export async function finishTrip(status: Exclude<TripStatus, 'active'>) {
  void stopTripTracking();
  const { activeTripId, setActiveTripId } = useTripStore.getState();
  if (!activeTripId) return;
  setActiveTripId(null);
  const { error } = await supabase
    .from('trips')
    .update({ status, ended_at: new Date().toISOString() })
    .eq('id', activeTripId);
  if (error) console.warn('No se pudo cerrar el viaje', error.message);
}

export async function logTripAlert(kind: TripAlertKind, distanceMeters?: number | null) {
  const tripId = useTripStore.getState().activeTripId;
  if (!tripId) return;
  const { error } = await supabase
    .from('trip_alerts')
    .insert({ trip_id: tripId, kind, distance_meters: distanceMeters ?? null });
  if (error) console.warn('No se pudo registrar el aviso', error.message);
}

export async function fetchTrips(limit = 50): Promise<TripRow[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('id, destination_label, destination_address, status, started_at, ended_at')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as TripRow[];
}

export function tripDayLabel(date: Date) {
  if (isToday(date)) return i18n.t('HOY');
  if (isYesterday(date)) return i18n.t('AYER');
  const locale = i18n.language === 'en' ? enUS : i18n.language === 'pt' ? pt : es;
  return format(date, 'EEE, d MMM', { locale }).toUpperCase();
}
