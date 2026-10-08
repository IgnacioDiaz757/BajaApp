import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeStore, type ThemePreference } from '../../stores/theme';
import { colors, Panel, Screen, themedStyles, TopBar } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
const themes: { value: ThemePreference; label: string; description: string }[] = [
  { value: 'dark', label: 'Oscuro', description: 'Menos luz para viajar de noche' },
  { value: 'light', label: 'Claro', description: 'Interfaz luminosa durante el día' },
  { value: 'system', label: 'Automático', description: 'Seguir la configuración del teléfono' },
];

export default function AppearanceScreen() {
  const { t } = useTranslation();
  const selected = useThemeStore((state) => state.preference);
  const setSelected = useThemeStore((state) => state.setPreference);
  return (
    <Screen>
      <TopBar title={t('Apariencia')} subtitle={t('PREFERENCIAS')} back />
      <Text style={styles.label}>{t('TEMA')}</Text>
      <Panel style={styles.panel}>
        {themes.map((theme, index) => (
          <Pressable key={theme.value} accessibilityRole="radio" accessibilityState={{ selected: selected === theme.value }} onPress={() => setSelected(theme.value)} style={[styles.row, index > 0 && styles.divider]}>
            <View style={styles.copy}><Text style={styles.title}>{t(theme.label)}</Text><Text style={styles.detail}>{t(theme.description)}</Text></View>
            <View style={[styles.radio, selected === theme.value && styles.radioSelected]}>{selected === theme.value ? <View style={styles.radioDot} /> : null}</View>
          </Pressable>
        ))}
      </Panel>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  label: { color: colors.muted, fontSize: 10, fontWeight: '700', marginBottom: 8 },
  panel: { paddingVertical: 2 },
  row: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  copy: { flex: 1, gap: 4 },
  title: { color: colors.text, fontSize: 13, fontWeight: '600' },
  detail: { color: colors.muted, fontSize: 10 },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
}));