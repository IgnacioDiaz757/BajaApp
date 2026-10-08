import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, themedStyles } from '../../components/ui/primitives';
import { useTranslation } from 'react-i18next';
const mint = '#10b981';
const slides = [
  { mark: '⌖', title: 'No te pases de tu parada', description: 'Bajá te avisa cuando estás cerca de llegar, incluso si te quedaste dormido.' },
  { mark: '!', title: 'Avisos justo a tiempo', description: 'Elegí cuándo querés que te avisemos: por distancia o por minutos.' },
  { mark: '✓', title: 'Tu viaje, bajo control', description: 'El seguimiento funciona durante tu viaje para que puedas descansar tranquilo.' },
];

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const slide = slides[step];

  const next = () => {
    if (step < slides.length - 1) setStep(step + 1);
    else router.push('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.brandMark}>
          <Text style={styles.pin}>{slide.mark}</Text>
        </View>
        <Text style={styles.wordmark}>{t('Bajá')}</Text>
        <Text style={styles.tagline}>{t('Despertá justo a tiempo.')}</Text>
        <View style={styles.pagination}>
          {slides.map((item, index) => <View key={item.title} style={index === step ? styles.activeDot : styles.dot} />)}
        </View>
        <Text style={styles.heading}>{t(slide.title)}</Text>
        <Text style={styles.description}>{t(slide.description)}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={next} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{step === slides.length - 1 ? t('Empezar') : t('Siguiente')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)')} style={styles.skipButton}>
          <Text style={styles.skipText}>{t('Continuar sin cuenta')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brandMark: {
    width: 78,
    height: 78,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: mint,
    marginBottom: 14,
  },
  pin: { color: '#ffffff', fontSize: 35, lineHeight: 43, fontWeight: '800' },
  wordmark: { color: colors.text, fontSize: 30, fontWeight: '800' },
  tagline: { color: colors.muted, fontSize: 13, marginTop: 4 },
  pagination: { flexDirection: 'row', gap: 6, marginTop: 42, marginBottom: 18 },
  activeDot: { width: 24, height: 4, borderRadius: 2, backgroundColor: mint },
  dot: { width: 8, height: 4, borderRadius: 2, backgroundColor: colors.border },
  heading: { color: colors.text, fontSize: 23, fontWeight: '700', textAlign: 'center' },
  description: {
    color: colors.secondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 290,
    marginTop: 9,
  },
  actions: { gap: 6, paddingBottom: 18 },
  primaryButton: { backgroundColor: mint, borderRadius: 8, alignItems: 'center', paddingVertical: 14 },
  primaryButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  skipButton: { alignItems: 'center', paddingVertical: 12 },
  skipText: { color: colors.muted, fontSize: 13, fontWeight: '500' },
}));