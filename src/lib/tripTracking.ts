import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { AppState, Platform } from 'react-native';
import { distanceBetweenMeters } from '../utils/distance';
import { supabase } from './supabase';

import i18n from '../i18n';
import { applyStoredLanguage } from '../stores/preferences';
/**
 * Seguimiento del viaje con la pantalla apagada o la app en segundo plano.
 *
 * Una tarea de ubicación (TaskManager) sigue corriendo aunque la app no esté en pantalla y,
 * al cruzar cada distancia elegida, lanza una notificación local. La última distancia dispara
 * una alarma con sonido que se repite hasta que el usuario abre la app.
 * Mientras la app está abierta, la pantalla del viaje se encarga de los avisos (la tarea no hace nada).
 */

export const TRIP_TASK = 'baja-trip-location';
export const ALARM_CHANNEL = 'baja-alarm';
export const REMINDER_CHANNEL = 'baja-reminder';
export const ALARM_SOUND = 'alarm_notification.wav';

const SESSION_KEY = 'baja-active-trip-session';
const ALARM_REPEATS = 8;
const ALARM_REPEAT_SECONDS = 10;

export type TripSession = {
  tripId: string | null;
  destination: string;
  target: { latitude: number; longitude: number };
  /** Distancias elegidas en metros, de mayor a menor. La última abre la alarma completa. */
  thresholds: number[];
  /** Distancias que ya avisaron. */
  fired: number[];
};

export type StartResult = 'started' | 'no-background-permission' | 'unsupported';

const alertKindByMeters: Record<number, string> = {
  2000: 'two_km',
  1000: 'one_km',
  500: 'five_hundred_m',
  200: 'two_hundred_m',
};

export async function loadSession(): Promise<TripSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as TripSession) : null;
  } catch {
    return null;
  }
}

async function saveSession(session: TripSession) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** Marca una distancia como avisada (la usa la pantalla del viaje para que la tarea no repita el aviso). */
export async function markThresholdFired(threshold: number) {
  const session = await loadSession();
  if (!session || session.fired.includes(threshold)) return;
  await saveSession({ ...session, fired: [...session.fired, threshold] });
}

async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  await applyStoredLanguage();
  await Notifications.setNotificationChannelAsync(ALARM_CHANNEL, {
    name: i18n.t('Alarma de llegada'),
    importance: Notifications.AndroidImportance.MAX,
    sound: ALARM_SOUND,
    vibrationPattern: [0, 700, 300, 700, 300, 700],
    bypassDnd: true,
    audioAttributes: { usage: Notifications.AndroidAudioUsage.ALARM },
  });
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
    name: i18n.t('Avisos previos'),
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 400, 200, 400],
  });
}

async function logAlert(session: TripSession, threshold: number, distance: number) {
  const kind = alertKindByMeters[threshold];
  if (!session.tripId || !kind) return;
  const { error } = await supabase
    .from('trip_alerts')
    .insert({ trip_id: session.tripId, kind, distance_meters: distance });
  if (error) console.warn('No se pudo registrar el aviso', error.message);
}

async function notifyReminder(destination: string, distance: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('Bajá: te estás acercando'),
      body: i18n.t('Faltan unos {{distance}} m para {{destination}}.', { distance: Math.round(distance), destination }),
      data: { type: 'reminder' },
    },
    trigger: { channelId: REMINDER_CHANNEL },
  });
}

async function notifyAlarm(destination: string) {
  const content: Notifications.NotificationContentInput = {
    title: i18n.t('¡BAJÁ AHORA!'),
    body: i18n.t('Estás llegando a {{destination}}. Abrí la app para confirmar.', { destination }),
    sound: ALARM_SOUND,
    priority: Notifications.AndroidNotificationPriority.MAX,
    interruptionLevel: 'timeSensitive',
    data: { type: 'alarm', destination },
  };
  await Notifications.scheduleNotificationAsync({ content, trigger: { channelId: ALARM_CHANNEL } });
  // El sonido de una notificación es corto: se repite hasta que el usuario abra la app.
  for (let i = 1; i <= ALARM_REPEATS; i += 1) {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: i * ALARM_REPEAT_SECONDS,
        channelId: ALARM_CHANNEL,
      },
    });
  }
}

/** Quita las notificaciones de alarma pendientes y las ya mostradas (al abrir la alarma o terminar el viaje). */
export async function silenceAlarmNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
  } catch (err) {
    console.warn('No se pudieron limpiar las notificaciones', err);
  }
}

async function handleLocations(locations: Location.LocationObject[]) {
  await applyStoredLanguage();
  const last = locations[locations.length - 1];
  if (!last) return;
  const session = await loadSession();
  if (!session) return;

  const distance = distanceBetweenMeters(last.coords, session.target);
  const finalThreshold = session.thresholds[session.thresholds.length - 1];

  for (const threshold of session.thresholds) {
    if (distance > threshold || session.fired.includes(threshold)) continue;
    session.fired.push(threshold);
    await saveSession(session);
    await logAlert(session, threshold, distance);
    if (threshold === finalThreshold) await notifyAlarm(session.destination);
    else await notifyReminder(session.destination, distance);
  }
}

// Debe definirse al cargar la app (ver index.js) para que también corra si el sistema la abre en segundo plano.
if (Platform.OS !== 'web') {
  TaskManager.defineTask(TRIP_TASK, async ({ data, error }) => {
    if (error) {
      console.warn('Error en el seguimiento en segundo plano', error.message);
      return;
    }
    // Con la app abierta, la pantalla del viaje ya avisa.
    if (AppState.currentState === 'active') return;
    const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
    if (locations?.length) await handleLocations(locations);
  });
}

export async function startTripTracking(input: Omit<TripSession, 'fired'>): Promise<StartResult> {
  if (Platform.OS === 'web') return 'unsupported';
  try {
    await saveSession({ ...input, thresholds: [...input.thresholds].sort((a, b) => b - a), fired: [] });
    await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true } });
    await ensureChannels();

    const background = await Location.requestBackgroundPermissionsAsync();
    if (background.status !== 'granted') return 'no-background-permission';

    if (await Location.hasStartedLocationUpdatesAsync(TRIP_TASK)) await Location.stopLocationUpdatesAsync(TRIP_TASK);
    await Location.startLocationUpdatesAsync(TRIP_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 25,
      timeInterval: 5000,
      activityType: Location.ActivityType.AutomotiveNavigation,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: i18n.t('Bajá está siguiendo tu viaje'),
        notificationBody: i18n.t('Te avisamos cuando estés por llegar a {{destination}}.', { destination: input.destination }),
        notificationColor: '#10b981',
      },
    });
    return 'started';
  } catch (err) {
    // Expo Go no soporta ubicación en segundo plano: hace falta la app instalada (development build).
    console.warn('No se pudo iniciar el seguimiento en segundo plano', err);
    return 'unsupported';
  }
}

export async function stopTripTracking() {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TRIP_TASK)) await Location.stopLocationUpdatesAsync(TRIP_TASK);
  } catch (err) {
    console.warn('No se pudo detener el seguimiento', err);
  }
  await AsyncStorage.removeItem(SESSION_KEY).catch(() => undefined);
  await silenceAlarmNotifications();
}
