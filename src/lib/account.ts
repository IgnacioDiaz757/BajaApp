import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlarmSound } from '../stores/alarmSound';
import { resetAlarmSound } from './alarmSound';
import { supabase } from './supabase';
import { stopTripTracking } from './tripTracking';
import { useTripStore } from '../stores/trip';

/**
 * Elimina la cuenta y todos sus datos (viajes, avisos, lugares, preferencias).
 * Lo hace una función de la base (`delete_my_account`, ver supabase/migration-store-release.sql),
 * porque una app no puede borrar usuarios de autenticación por sí sola.
 */
export async function deleteMyAccount() {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;

  await stopTripTracking();
  if (useAlarmSound.getState().custom) resetAlarmSound();
  useTripStore.getState().setActiveTripId(null);
  useTripStore.getState().setBusLine(null);
  // La sesión ya no es válida en el servidor: se limpia solo la local.
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  await AsyncStorage.removeItem('baja-active-trip-session').catch(() => undefined);
}
