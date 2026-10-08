import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, Vibration, View } from 'react-native';
import { resolveAlarmSource } from '../../lib/alarmSound';
import { silenceAlarmNotifications } from '../../lib/tripTracking';
import { colors, Screen, themedStyles } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
// Patrón de vibración tipo llamada entrante: pausa, buzz largo, pausa corta, repetir.
const CALL_VIBRATION_PATTERN = [0, 700, 300];

export default function ArrivalAlarmScreen() {
  const { t } = useTranslation();
  const { destination = t('Tu parada') } = useLocalSearchParams<{ destination?: string }>();
  const [translateX] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(1));
  const [flash] = useState(() => new Animated.Value(0));
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8,
    onPanResponderMove: (_, gesture) => translateX.setValue(Math.max(0, Math.min(gesture.dx, 220))),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 130) {
        router.replace({ pathname: '/trip/arrived', params: { destination } });
        return;
      }
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(),
  }), [destination, translateX]);

  useEffect(() => {
    let player: AudioPlayer | undefined;
    let cancelled = false;

    // Si la alarma llegó por notificación, se apagan las repeticiones pendientes.
    void silenceAlarmNotifications();

    // Vibración continua tipo llamada (se repite sola hasta Vibration.cancel()).
    Vibration.vibrate(CALL_VIBRATION_PATTERN, true);

    // Háptica pesada intercalada para que se note incluso en modo silencio/Do Not Disturb.
    const heavyPulse = () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    heavyPulse();
    const hapticInterval = setInterval(heavyPulse, 850);

    (async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
        if (cancelled) return;
        player = createAudioPlayer(resolveAlarmSource());
        player.loop = true;
        player.volume = 1;
        player.play();
      } catch (err) {
        console.warn('No se pudo reproducir el sonido de la alarma', err);
      }
    })();

    return () => {
      Vibration.cancel();
      clearInterval(hapticInterval);
      cancelled = true;
      player?.pause();
      player?.remove();
    };
  }, []);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.22, duration: 380, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
    );
    const flashLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(flash, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]),
    );
    pulseLoop.start();
    flashLoop.start();
    return () => {
      pulseLoop.stop();
      flashLoop.stop();
    };
  }, [flash, pulse]);

  return (
    <Screen>
      <Animated.View
        pointerEvents="none"
        style={[styles.flashOverlay, { opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) }]}
      />
      <View style={styles.content}>
        <Animated.View style={[styles.alarmHalo, { transform: [{ scale: pulse }] }]}><Text style={styles.bell}>!</Text></Animated.View>
        <Text style={styles.headline}>{t('¡BAJÁ AHORA!')}</Text>
        <Text style={styles.destination}>{destination}</Text>
        <Text style={styles.distance}>{t('Estás llegando a tu destino')}</Text>
        <View style={styles.sliderTrack} {...panResponder.panHandlers}>
          <Text style={styles.sliderLabel}>{t('Deslizá para confirmar')}</Text>
          <Animated.View style={[styles.sliderThumb, { transform: [{ translateX }] }]}>
            <Text style={styles.sliderArrow}>›</Text>
          </Animated.View>
        </View>
        <Text style={styles.hint}>{t('Mantené el teléfono a mano al bajar.')}</Text>
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  flashOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.red, zIndex: 0 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  alarmHalo: { width: 118, height: 118, borderRadius: 59, backgroundColor: '#ef44442b', borderWidth: 1, borderColor: '#ef44445c', alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
  bell: { color: colors.red, fontSize: 50, fontWeight: '900' },
  headline: { color: colors.red, fontSize: 27, fontWeight: '900' },
  destination: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 9, textAlign: 'center' },
  distance: { color: colors.muted, fontSize: 11, marginTop: 4, marginBottom: 37 },
  sliderTrack: { height: 58, width: '100%', maxWidth: 360, borderRadius: 30, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  sliderLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  sliderThumb: { position: 'absolute', left: 6, width: 46, height: 46, borderRadius: 23, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  sliderArrow: { color: '#fff', fontSize: 28, lineHeight: 32, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 10, marginTop: 18 },
}));