import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton, colors, Screen, themedStyles, TopBar } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
export default function DestinationMapScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <TopBar title={t('Punto de llegada')} subtitle={t('ELEGIR EN EL MAPA')} back />
      <View style={styles.mapWrap}>
        <Text style={styles.title}>{t('Mapa disponible en el teléfono')}</Text>
        <Text style={styles.copy}>{t('En la web, buscá una dirección para elegir tu destino.')}</Text>
      </View>
      <View style={styles.footer}>
        <ActionButton label={t('Buscar dirección')} variant="secondary" onPress={() => router.replace('/destination/search')} />
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  mapWrap: { flex: 1, minHeight: 280, overflow: 'hidden', borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.mapFallback, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: colors.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  copy: { color: colors.secondary, fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 8 },
  footer: { paddingTop: 14 },
}));