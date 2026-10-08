import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton, colors, Screen, themedStyles } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
export default function MissedStopScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.warning}><Text style={styles.warningGlyph}>!</Text></View>
        <Text style={styles.title}>{t('Te pasaste de la parada')}</Text>
        <Text style={styles.copy}>{t('Parece que ya pasaste el destino. Revisá el mapa y bajate en un lugar seguro.')}</Text>
        <View style={styles.actions}>
          <ActionButton label={t('Iniciar otro viaje')} onPress={() => router.replace('/destination/search')} />
          <ActionButton label={t('Volver al inicio')} variant="secondary" onPress={() => router.replace('/(tabs)')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 26 },
  warning: { width: 70, height: 70, borderRadius: 20, backgroundColor: '#ef44441a', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  warningGlyph: { color: colors.red, fontSize: 37, fontWeight: '800' },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  copy: { color: colors.secondary, fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 25 },
  actions: { gap: 8 },
}));