import { useEffect } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, themedStyles } from '../../components/ui/primitives';
import { useTranslation } from 'react-i18next';
export default function SplashScreen() {
  const { t } = useTranslation();
  useEffect(() => {
    let active = true;
    const timeout = setTimeout(async () => {
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      if (active) router.replace(data.session ? '/(tabs)' : '/(auth)/welcome');
    }, 900);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.brandMark}><Text style={styles.pin}>⌖</Text></View>
      <Text style={styles.wordmark}>{t('Bajá')}</Text>
      <Text style={styles.tagline}>{t('Despertá justo a tiempo.')}</Text>
      <View style={styles.progress}><View style={styles.progressFill} /></View>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  brandMark: { width: 78, height: 78, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981', marginBottom: 14 },
  pin: { color: '#ffffff', fontSize: 37, lineHeight: 43, fontWeight: '700' },
  wordmark: { color: colors.text, fontSize: 30, fontWeight: '800' },
  tagline: { color: colors.muted, fontSize: 13, marginTop: 4 },
  progress: { position: 'absolute', bottom: 44, width: 64, height: 3, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { width: '45%', height: '100%', backgroundColor: '#10b981' },
}));