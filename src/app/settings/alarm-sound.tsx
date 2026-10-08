import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { ActionButton, colors, Panel, Screen, themedStyles, TopBar } from '../../components/ui/primitives';
import { pickAlarmSound, resetAlarmSound, resolveAlarmSource } from '../../lib/alarmSound';
import { useAlarmSound } from '../../stores/alarmSound';

import { useTranslation } from 'react-i18next';
export default function AlarmSoundScreen() {
  const { t } = useTranslation();
  const custom = useAlarmSound((state) => state.custom);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);

  const stop = () => {
    playerRef.current?.pause();
    playerRef.current?.remove();
    playerRef.current = null;
    setPlaying(false);
  };

  useEffect(() => stop, []);

  const togglePreview = async () => {
    if (playing) {
      stop();
      return;
    }
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      const player = createAudioPlayer(resolveAlarmSource());
      player.volume = 1;
      player.play();
      playerRef.current = player;
      setPlaying(true);
    } catch {
      Alert.alert(t('No se pudo reproducir'), t('Probá con otro archivo de audio.'));
    }
  };

  const choose = async () => {
    stop();
    setBusy(true);
    try {
      await pickAlarmSound();
    } catch {
      Alert.alert(t('No pudimos usar ese archivo'), t('Elegí un archivo de audio guardado en tu teléfono (mp3, m4a, wav).'));
    } finally {
      setBusy(false);
    }
  };

  const useDefault = () => {
    stop();
    resetAlarmSound();
  };

  return (
    <Screen>
      <TopBar title={t('Sonido de la alarma')} subtitle={t('ALERTAS')} back />
      <Panel style={styles.current}>
        <Text style={styles.label}>{t('SONIDO ACTUAL')}</Text>
        <Text numberOfLines={2} style={styles.name}>{custom ? custom.displayName : t('Sonido de Bajá (por defecto)')}</Text>
        <Text style={styles.hint}>{t('Suena en bucle junto con la vibración cuando llegás a tu destino.')}</Text>
      </Panel>
      <View style={styles.actions}>
        <ActionButton label={t('Elegir canción')} disabled={busy} onPress={() => void choose()} />
        <ActionButton label={playing ? 'Detener' : 'Probar sonido'} variant="secondary" onPress={() => void togglePreview()} />
        {custom ? <ActionButton label={t('Usar sonido por defecto')} variant="quiet" onPress={useDefault} /> : null}
      </View>
      <Text style={styles.note}>{t('La canción tiene que estar guardada en tu teléfono. Se copia dentro de la app, así que sigue funcionando aunque la borres de tus archivos.')}</Text>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  current: { gap: 6 },
  label: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  name: { color: colors.text, fontSize: 14, fontWeight: '700' },
  hint: { color: colors.secondary, fontSize: 11, lineHeight: 16, marginTop: 4 },
  actions: { gap: 8, marginTop: 20 },
  note: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 18, textAlign: 'center' },
}));
