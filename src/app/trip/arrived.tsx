import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { finishTrip, logTripAlert } from '../../lib/trips';
import { ActionButton, colors, Screen, themedStyles } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
export default function ArrivedScreen() {
  const { t } = useTranslation();
  const { destination = t('Tu destino') } = useLocalSearchParams<{ destination?: string }>();
  const [rating, setRating] = useState<'good' | 'bad' | null>(null);

  useEffect(() => {
    void logTripAlert('arrived').then(() => finishTrip('arrived'));
  }, []);

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.success}><Text style={styles.successCheck}>✓</Text></View>
        <Text style={styles.title}>{t('Llegaste bien')}</Text>
        <Text style={styles.address}>{destination}</Text>
        <View style={styles.divider} />
        <Text style={styles.question}>{t('¿Te avisamos a tiempo?')}</Text>
        <View style={styles.ratings}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('Sí, estuvo bien')} accessibilityState={{ selected: rating === 'good' }} onPress={() => setRating('good')} style={[styles.ratingButton, rating === 'good' && styles.ratingSelected]}>
            <Text style={styles.ratingGlyph}>✓</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t('No, hubo un problema')} accessibilityState={{ selected: rating === 'bad' }} onPress={() => setRating('bad')} style={[styles.ratingButton, rating === 'bad' && styles.ratingSelectedBad]}>
            <Text style={styles.ratingGlyph}>×</Text>
          </Pressable>
        </View>
        {rating ? <Text style={styles.thanks}>{t('Gracias por contarnos.')}</Text> : null}
        <View style={styles.action}><ActionButton label={t('Volver al inicio')} onPress={() => router.replace('/(tabs)')} /></View>
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  success: { width: 76, height: 76, borderRadius: 22, backgroundColor: '#10b9811a', borderWidth: 1, borderColor: '#10b98140', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  successCheck: { color: colors.primary, fontSize: 39, lineHeight: 44, fontWeight: '700' },
  title: { color: colors.text, fontSize: 23, fontWeight: '800' },
  address: { color: colors.secondary, fontSize: 12, marginTop: 6 },
  divider: { width: '100%', height: 1, backgroundColor: colors.border, marginVertical: 26 },
  question: { color: colors.secondary, fontSize: 12, fontWeight: '600' },
  ratings: { flexDirection: 'row', gap: 12, marginTop: 14 },
  ratingButton: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  ratingSelected: { borderColor: colors.primary, backgroundColor: '#10b9811a' },
  ratingSelectedBad: { borderColor: colors.red, backgroundColor: '#ef44441a' },
  ratingGlyph: { color: colors.text, fontSize: 22, fontWeight: '700' },
  thanks: { color: colors.primary, fontSize: 11, marginTop: 10 },
  action: { width: '100%', marginTop: 28 },
}));