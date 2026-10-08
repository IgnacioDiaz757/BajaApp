import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useTranslation } from 'react-i18next';
const palettes = {
  dark: {
    background: '#09090b',
    surface: '#18181b',
    surfaceRaised: '#202024',
    border: '#303036',
    text: '#fafafa',
    secondary: '#a1a1aa',
    muted: '#71717a',
    primary: '#10b981',
    primaryDark: '#047857',
    onPrimary: '#052e24',
    amber: '#f59e0b',
    red: '#ef4444',
    blue: '#60a5fa',
    overlay: '#09090be8',
    mapFallback: '#202a26',
    destructiveBg: '#311819',
    destructiveBorder: '#633132',
    destructiveText: '#fca5a5',
  },
  light: {
    background: '#f5f6f8',
    surface: '#ffffff',
    surfaceRaised: '#eceef2',
    border: '#dcdfe5',
    text: '#18181b',
    secondary: '#52525b',
    muted: '#71717a',
    primary: '#059669',
    primaryDark: '#047857',
    onPrimary: '#ffffff',
    amber: '#d97706',
    red: '#dc2626',
    blue: '#2563eb',
    overlay: '#ffffffe8',
    mapFallback: '#dfe8e3',
    destructiveBg: '#fef2f2',
    destructiveBorder: '#fecaca',
    destructiveText: '#b91c1c',
  },
};

export type ColorScheme = keyof typeof palettes;
type Palette = Record<keyof typeof palettes.dark, string>;

let activeScheme: ColorScheme = 'dark';

/** Colores del tema activo. Se leen al momento de usarlos, así que siguen al tema elegido. */
export const colors = {} as Palette;
(Object.keys(palettes.dark) as (keyof Palette)[]).forEach((key) => {
  Object.defineProperty(colors, key, { enumerable: true, get: () => palettes[activeScheme][key] });
});

export function setColorScheme(scheme: ColorScheme) {
  activeScheme = scheme;
}

/** Como `StyleSheet.create`, pero los estilos se vuelven a calcular cuando cambia el tema. */
export function themedStyles<T>(factory: () => T): T {
  let builtFor: ColorScheme | null = null;
  let built: T;
  return new Proxy({}, {
    get(_target, prop) {
      if (builtFor !== activeScheme) {
        built = factory();
        builtFor = activeScheme;
      }
      return (built as Record<string | symbol, unknown>)[prop];
    },
  }) as T;
}

export function Screen({ children, scroll = false }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={styles.fill}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function TopBar({
  title,
  subtitle,
  back = false,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.topBar}>
      {back ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('Volver')} onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
      ) : null}
      <View style={styles.topBarCopy}>
        {subtitle ? <Text style={styles.eyebrow}>{subtitle}</Text> : null}
        <Text style={styles.topBarTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction}>
          <Text style={styles.link}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive' | 'quiet';
  disabled?: boolean;
}) {
  const buttonStyle = variant === 'primary'
    ? styles.primaryButton
    : variant === 'destructive'
      ? styles.destructiveButton
      : variant === 'quiet'
        ? styles.quietButton
        : styles.secondaryButton;
  const textStyle = variant === 'primary'
    ? styles.primaryButtonText
    : variant === 'destructive'
      ? styles.destructiveButtonText
      : variant === 'quiet'
        ? styles.quietButtonText
        : styles.secondaryButtonText;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [buttonStyle, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  );
}

export function SettingRow({
  title,
  detail,
  onPress,
  trailing,
}: {
  title: string;
  detail?: string;
  onPress: () => void;
  trailing?: string;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        {detail ? <Text style={styles.settingDetail}>{detail}</Text> : null}
      </View>
      <Text style={styles.settingTrailing}>{trailing ?? '›'}</Text>
    </Pressable>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  topBar: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  backButton: { width: 38, height: 42, justifyContent: 'center' },
  backGlyph: { color: colors.text, fontSize: 37, lineHeight: 42, fontWeight: '300' },
  topBarCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '600', marginBottom: 2 },
  topBarTitle: { color: colors.text, fontSize: 21, fontWeight: '700' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: colors.secondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  link: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  panel: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 14 },
  primaryButton: { minHeight: 48, borderRadius: 8, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  secondaryButton: { minHeight: 46, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  destructiveButton: { minHeight: 46, borderRadius: 8, backgroundColor: colors.destructiveBg, borderWidth: 1, borderColor: colors.destructiveBorder, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  quietButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  primaryButtonText: { color: colors.onPrimary, fontSize: 14, fontWeight: '800' },
  secondaryButtonText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  destructiveButtonText: { color: colors.destructiveText, fontSize: 14, fontWeight: '700' },
  quietButtonText: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
  settingRow: { flexDirection: 'row', minHeight: 62, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: 12 },
  settingCopy: { flex: 1, gap: 4 },
  settingTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  settingDetail: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  settingTrailing: { color: colors.muted, fontSize: 25, fontWeight: '300' },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
}));