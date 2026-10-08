import { usePreferences, type AppLanguage } from '../../stores/preferences';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, Panel, Screen, themedStyles, TopBar } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
const languages: { code: AppLanguage; name: string; nativeName: string }[] = [
  { code: 'es', name: 'Español', nativeName: 'Español' },
  { code: 'en', name: 'English', nativeName: 'Inglés' },
  { code: 'pt', name: 'Português', nativeName: 'Portugués' },
];

export default function LanguageScreen() {
  const { t } = useTranslation();
  const language = usePreferences((state) => state.language);
  const setLanguage = usePreferences((state) => state.setLanguage);
  return (
    <Screen>
      <TopBar title={t('Idioma')} subtitle={t('PREFERENCIAS')} back />
      <Panel style={styles.panel}>
        {languages.map((item, index) => (
          <Pressable key={item.code} accessibilityRole="radio" accessibilityState={{ selected: language === item.code }} onPress={() => setLanguage(item.code)} style={[styles.row, index > 0 && styles.divider]}>
            <View style={styles.copy}><Text style={styles.title}>{item.name}</Text><Text style={styles.detail}>{t(item.nativeName)}</Text></View>
            <View style={[styles.radio, language === item.code && styles.radioSelected]}>{language === item.code ? <View style={styles.radioDot} /> : null}</View>
          </Pressable>
        ))}
      </Panel>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  panel: { paddingVertical: 2 },
  row: { minHeight: 65, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  copy: { flex: 1, gap: 4 },
  title: { color: colors.text, fontSize: 13, fontWeight: '600' },
  detail: { color: colors.muted, fontSize: 10 },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
}));