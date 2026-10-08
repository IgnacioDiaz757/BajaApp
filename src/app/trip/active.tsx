import * as Battery from 'expo-battery';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { useTripStore } from '../../stores/trip';
import { ActionButton, colors, Panel, Screen, themedStyles } from '../../components/ui/primitives';
import { TripMap } from '../../components/TripMap';
import { alertKindForMeters, finishTrip, logTripAlert } from '../../lib/trips';
import { confirmBackgroundLocationDisclosure } from '../../lib/disclosure';
import { loadSession, markThresholdFired, startTripTracking, type StartResult } from '../../lib/tripTracking';
import { distanceBetweenMeters, formatDistance } from '../../utils/distance';

import { useTranslation } from 'react-i18next';
const defaultDestination = { latitude: -31.4201, longitude: -64.1888 };

export default function ActiveTripScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ destination?: string; latitude?: string; longitude?: string; alertMeters?: string }>();
  const thresholds = useMemo(() => {
    const parsed = (params.alertMeters ?? '').split(',').map(Number).filter((value) => value > 0);
    return (parsed.length ? parsed : [100]).sort((a, b) => b - a);
  }, [params.alertMeters]);
  const destination = params.destination || 'Av. Colón 4500';
  const target = {
    latitude: Number(params.latitude) || defaultDestination.latitude,
    longitude: Number(params.longitude) || defaultDestination.longitude,
  };
  const [current, setCurrent] = useState<Location.LocationObject | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading');
  const [tracking, setTracking] = useState<StartResult | null>(null);
  const trackingStarted = useRef(false);
  const alarmTriggered = useRef(false);
  const firedThresholds = useRef(new Set<number>());
  const missedTriggered = useRef(false);
  const closestDistance = useRef(Number.POSITIVE_INFINITY);
  const distance = current
    ? distanceBetweenMeters(current.coords, target)
    : null;
  useEffect(() => {
    let active = true;
    let subscription: Location.LocationSubscription | undefined;

    async function watchTripLocation() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!active) return;
        if (permission.status !== 'granted') {
          setLocationStatus('denied');
          return;
        }

        setLocationStatus('ready');
        const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 300_000 });
        if (active && lastKnown) setCurrent(lastKnown);
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 3000 },
          (position) => {
            setCurrent(position);
            setLocationStatus('ready');
          },
        );
        if (!active) subscription.remove();
      } catch {
        if (active) setLocationStatus('error');
      }
    }

    void watchTripLocation();
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (distance === null) return;
    // Cada distancia elegida avisa una vez; la más cercana abre la alarma completa.
    const finalThreshold = thresholds[thresholds.length - 1];
    for (const threshold of thresholds) {
      if (distance > threshold || firedThresholds.current.has(threshold) || alarmTriggered.current) continue;
      firedThresholds.current.add(threshold);
      void markThresholdFired(threshold);
      const kind = alertKindForMeters(threshold);
      if (kind) void logTripAlert(kind, distance);
      if (threshold === finalThreshold) {
        alarmTriggered.current = true;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.replace({ pathname: '/trip/alarm', params: { destination } });
      } else {
        Vibration.vibrate([0, 400, 200, 400]);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }

    closestDistance.current = Math.min(closestDistance.current, distance);
    if (
      closestDistance.current <= 500 &&
      distance > closestDistance.current + 350 &&
      !missedTriggered.current &&
      !alarmTriggered.current
    ) {
      missedTriggered.current = true;
      void logTripAlert('missed', distance).then(() => finishTrip('missed'));
      router.replace('/trip/missed');
    }
  }, [destination, distance, thresholds]);

  // Seguimiento con la pantalla apagada: se inicia una vez que hay permiso de ubicación.
  const targetLatitude = target.latitude;
  const targetLongitude = target.longitude;
  useEffect(() => {
    if (locationStatus !== 'ready' || trackingStarted.current) return;
    trackingStarted.current = true;
    void (async () => {
      const granted = await Location.getBackgroundPermissionsAsync().then((p) => p.status === 'granted').catch(() => false);
      // Antes de pedir el permiso de segundo plano se explica para qué se usa.
      if (!granted && !(await confirmBackgroundLocationDisclosure())) {
        setTracking('no-background-permission');
        return;
      }
      setTracking(await startTripTracking({
        tripId: useTripStore.getState().activeTripId,
        destination,
        target: { latitude: targetLatitude, longitude: targetLongitude },
        thresholds,
      }));
    })();
  }, [destination, locationStatus, targetLatitude, targetLongitude, thresholds]);

  // Si la alarma saltó en segundo plano, al volver a la app se abre la pantalla de alarma.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || alarmTriggered.current) return;
      void loadSession().then((session) => {
        if (!session || alarmTriggered.current) return;
        const finalThreshold = session.thresholds[session.thresholds.length - 1];
        if (!session.fired.includes(finalThreshold)) return;
        alarmTriggered.current = true;
        router.replace({ pathname: '/trip/alarm', params: { destination } });
      });
    });
    return () => subscription.remove();
  }, [destination]);

  useEffect(() => {
    let active = true;
    let batterySubscription: Battery.Subscription | undefined;

    const checkBattery = (level: number) => {
      if (active && level >= 0 && level < 0.1) {
        router.replace('/trip/low-battery');
      }
    };

    void Battery.getBatteryLevelAsync().then(checkBattery).catch(() => undefined);
    if (Platform.OS !== 'web') {
      batterySubscription = Battery.addBatteryLevelListener(({ batteryLevel }) => checkBattery(batteryLevel));
    }
    return () => {
      active = false;
      batterySubscription?.remove();
    };
  }, []);

  const cancelTrip = () => {
    void finishTrip('cancelled');
    router.replace('/(tabs)');
  };

  return (
    <Screen>
      <View style={styles.mapArea}>
        <TripMap destination={destination} target={target} />
        <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>{locationStatus === 'ready' ? 'GPS ACTIVO' : 'BUSCANDO GPS'}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Cerrar viaje')} onPress={cancelTrip} style={styles.closeButton}>
          <Text style={styles.closeGlyph}>×</Text>
        </Pressable>
      </View>

      <View style={styles.tripPanel}>
        <View style={styles.destinationHeader}>
          <View style={styles.destinationCopy}>
            <Text style={styles.destinationEyebrow}>{t('DESTINO')}</Text>
            <Text numberOfLines={1} style={styles.destination}>{destination}</Text>
          </View>
          <View style={styles.distanceBlock}>
            <Text style={styles.distanceValue}>{formatDistance(distance)}</Text>
            <Text style={styles.distanceCaption}>{t('restantes')}</Text>
          </View>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressBar, { width: distance === null ? '12%' : `${Math.max(8, Math.min(94, 100 - distance / 60))}%` }]} /></View>

        {locationStatus === 'denied' ? (
          <Panel style={styles.notice}><Text style={styles.noticeTitle}>{t('Ubicación desactivada')}</Text><Text style={styles.noticeText}>{t('Permití el acceso para calcular cuánto falta hasta tu parada.')}</Text></Panel>
        ) : locationStatus === 'error' ? (
          <Panel style={styles.notice}><Text style={styles.noticeTitle}>{t('No pudimos iniciar el GPS')}</Text><Text style={styles.noticeText}>{t('Revisá los servicios de ubicación e intentá de nuevo.')}</Text></Panel>
        ) : null}
        {tracking === 'no-background-permission' ? (
          <Panel style={styles.notice}><Text style={styles.noticeTitle}>{t('Para avisarte con la pantalla apagada')}</Text><Text style={styles.noticeText}>{t('Permití la ubicación "Siempre" en los ajustes del teléfono. Hasta entonces, mantené la app abierta.')}</Text></Panel>
        ) : tracking === 'unsupported' ? (
          <Panel style={styles.notice}><Text style={styles.noticeTitle}>{t('Seguimiento en segundo plano no disponible')}</Text><Text style={styles.noticeText}>{t('Necesita la app instalada (no Expo Go). Mantené la app abierta para recibir el aviso.')}</Text></Panel>
        ) : null}

        <View style={styles.alertLine}>
          <View style={styles.alertDot} />
          <Text style={styles.alertText}>{distance === null ? t('Esperando señal de ubicación') : distance < 500 ? t('Preparáte para bajar') : 'Viajando tranquilo'}</Text>
          <Text style={styles.remaining}>{distance === null ? '·' : formatDistance(distance)}</Text>
        </View>
        <View style={styles.actions}>
          <ActionButton label={t('Jugar mientras viajás')} variant="quiet" onPress={() => router.push('/games')} />
          <ActionButton label={t('Compartir viaje')} variant="secondary" onPress={() => router.push({ pathname: '/trip/share', params: { destination } })} />
          <ActionButton label={t('Cancelar')} variant="destructive" onPress={cancelTrip} />
        </View>
        <Text style={styles.backgroundNote}>{t('El seguimiento requiere mantener habilitada la ubicación.')}</Text>
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  mapArea: { flex: 1, minHeight: 220, overflow: 'hidden', backgroundColor: colors.mapFallback },
  liveBadge: { position: 'absolute', top: 14, left: 16, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 6, backgroundColor: colors.overlay, borderWidth: 1, borderColor: colors.border },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  liveText: { color: colors.secondary, fontSize: 9, fontWeight: '700' },
  closeButton: { position: 'absolute', top: 12, right: 14, width: 36, height: 36, borderRadius: 8, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  closeGlyph: { color: colors.text, fontSize: 25, lineHeight: 28 },
  tripPanel: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 12, backgroundColor: colors.background },
  destinationHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  destinationCopy: { flex: 1, gap: 5 },
  destinationEyebrow: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  destination: { color: colors.text, fontSize: 15, fontWeight: '700' },
  distanceBlock: { alignItems: 'flex-end' },
  distanceValue: { color: colors.primary, fontSize: 23, fontWeight: '800' },
  distanceCaption: { color: colors.muted, fontSize: 9 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  progressBar: { height: 4, backgroundColor: colors.primary },
  notice: { padding: 11 },
  noticeTitle: { color: colors.amber, fontSize: 11, fontWeight: '700' },
  noticeText: { color: colors.secondary, fontSize: 10, lineHeight: 15, marginTop: 4 },
  alertLine: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 25 },
  alertDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.amber },
  alertText: { flex: 1, color: colors.secondary, fontSize: 11 },
  remaining: { color: colors.text, fontSize: 11, fontWeight: '700' },
  actions: { gap: 8 },
  backgroundNote: { color: colors.muted, fontSize: 9, textAlign: 'center' },
}));