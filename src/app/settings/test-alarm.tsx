import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { ActionButton, colors, Screen, themedStyles, TopBar } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
export default function TestAlarmScreen() {
  const { t } = useTranslation();
  const playTest = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await Notifications.scheduleNotificationAsync({
        content: { title: t('Bajá: aviso de prueba'), body: t('La alerta está lista para tu próximo viaje.') },
        trigger: null,
      });
    } catch {
      Alert.alert(t('No se pudo probar'), t('Revisá los permisos de notificaciones del teléfono.'));
    }
  };

  return (
    <Screen>
      <TopBar title={t('Probar alarma')} subtitle={t('ALERTAS')} back />
      <View style={styles.content}>
        <View style={styles.alarm}><Text style={styles.alarmGlyph}>!</Text></View>
        <Text style={styles.title}>{t('Escuchá tu aviso')}</Text>
        <Text style={styles.copy}>{t('Vamos a enviar una notificación de prueba y una respuesta háptica a este dispositivo.')}</Text>
        <ActionButton label={t('Reproducir prueba')} onPress={() => void playTest()} />
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18, gap: 11 },
  alarm: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#f59e0b1a', borderWidth: 1, borderColor: '#f59e0b4d', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  alarmGlyph: { color: colors.amber, fontSize: 39, fontWeight: '800' },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  copy: { color: colors.secondary, fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 280, marginBottom: 12 },
}));