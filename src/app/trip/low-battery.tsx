import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton, colors, Screen, themedStyles } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
export default function LowBatteryScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.battery}><Text style={styles.batteryGlyph}>!</Text></View>
        <Text style={styles.title}>{t('Batería baja')}</Text>
        <Text style={styles.copy}>{t('El seguimiento usa GPS y puede consumir batería. Conectá el teléfono si podés.')}</Text>
        <View style={styles.actions}>
          <ActionButton label={t('Continuar viaje')} onPress={() => router.back()} />
          <ActionButton label={t('Volver al inicio')} variant="secondary" onPress={() => router.replace('/(tabs)')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 26 },
  battery: { width: 70, height: 70, borderRadius: 20, backgroundColor: '#f59e0b1a', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  batteryGlyph: { color: colors.amber, fontSize: 35, fontWeight: '800' },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  copy: { color: colors.secondary, fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 23 },
  actions: { gap: 8 },
}));