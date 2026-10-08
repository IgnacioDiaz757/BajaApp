import { supabase } from './supabase';

import i18n from '../i18n';
export type Favorite = {
  id: string;
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  glyph: string | null;
  tint: string | null;
};

export type BusLine = { id: string; number: string; direction: string };

export type AlertConfig = {
  two_km: boolean;
  one_km: boolean;
  five_hundred_m: boolean;
  two_hundred_m: boolean;
  vibrate_on_silent: boolean;
  repeat_final_alert: boolean;
};

export const defaultAlertConfig: AlertConfig = {
  two_km: true,
  one_km: true,
  five_hundred_m: true,
  two_hundred_m: true,
  vibrate_on_silent: true,
  repeat_final_alert: false,
};

const favoriteGlyphs = [
  { glyph: '⌂', tint: '#10b981' },
  { glyph: '▤', tint: '#f59e0b' },
  { glyph: '▥', tint: '#60a5fa' },
];

export async function fetchFavorites(): Promise<Favorite[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('id, label, address, latitude, longitude, glyph, tint')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Favorite[];
}

async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Crea o actualiza un favorito. Si no hay sesión abre una anónima. */
export async function saveFavorite(input: { id?: string; label: string; address: string; latitude: number; longitude: number }) {
  const coordinates = { latitude: input.latitude, longitude: input.longitude };
  if (input.id) {
    const { error } = await supabase.from('favorites').update({ label: input.label, address: input.address, ...coordinates }).eq('id', input.id);
    if (error) throw error;
    return;
  }
  let userId = await currentUserId();
  if (!userId) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    userId = data.user?.id ?? null;
  }
  if (!userId) throw new Error(i18n.t('No hay sesión para guardar el destino.'));
  const { count } = await supabase.from('favorites').select('id', { count: 'exact', head: true });
  const style = favoriteGlyphs[(count ?? 0) % favoriteGlyphs.length];
  const { error } = await supabase.from('favorites').insert({ user_id: userId, label: input.label, address: input.address, ...coordinates, ...style });
  if (error) throw error;
}

export async function deleteFavorite(id: string) {
  const { error } = await supabase.from('favorites').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchBusLines(): Promise<BusLine[]> {
  const { data, error } = await supabase.from('bus_lines').select('id, number, direction').order('number', { ascending: true });
  if (error) throw error;
  return data as BusLine[];
}

export async function fetchAlertConfig(): Promise<AlertConfig> {
  const { data, error } = await supabase
    .from('alert_configs')
    .select('two_km, one_km, five_hundred_m, two_hundred_m, vibrate_on_silent, repeat_final_alert')
    .maybeSingle();
  if (error) throw error;
  return (data as AlertConfig | null) ?? defaultAlertConfig;
}

export async function saveAlertConfig(config: AlertConfig) {
  let userId = await currentUserId();
  if (!userId) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    userId = data.user?.id ?? null;
  }
  if (!userId) throw new Error(i18n.t('No hay sesión para guardar las alertas.'));
  const { error } = await supabase
    .from('alert_configs')
    .upsert({ user_id: userId, ...config, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function fetchProfile(): Promise<{ full_name: string | null; email: string | null } | null> {
  const { data, error } = await supabase.from('profiles').select('full_name, email').maybeSingle();
  if (error) throw error;
  return data;
}
