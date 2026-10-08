import { StyleSheet, Text, View } from 'react-native';
import { colors, themedStyles } from './ui/primitives';

import { useTranslation } from 'react-i18next';
export function TripMap({ destination }: { destination: string; target?: { latitude: number; longitude: number } }) {
  const { t } = useTranslation();
  return (
    <View style={styles.map}>
      <Text style={styles.kicker}>{t('VIAJE EN CURSO')}</Text>
      <Text style={styles.destination}>{destination}</Text>
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  map: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.mapFallback },
  kicker: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  destination: { color: colors.text, fontSize: 16, fontWeight: '700' },
}));