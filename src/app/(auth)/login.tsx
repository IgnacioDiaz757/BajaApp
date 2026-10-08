import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, colors, Screen, themedStyles, TopBar } from '../../components/ui/primitives';
import { continueAsGuest, signInWithEmail, signInWithProvider, signUpWithEmail, type SocialProvider } from '../../lib/auth';

import { useTranslation } from 'react-i18next';
const providerNames: Record<SocialProvider, string> = { google: 'Google', apple: 'Apple' };

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (task: () => Promise<boolean | void>, errorTitle: string) => {
    setBusy(true);
    try {
      const proceed = await task();
      if (proceed !== false) router.replace('/(auth)/permissions');
    } catch (err) {
      Alert.alert(errorTitle, err instanceof Error ? err.message : t('Intentá de nuevo.'));
    } finally {
      setBusy(false);
    }
  };

  const socialLogin = (provider: SocialProvider) =>
    run(() => signInWithProvider(provider), t('No pudimos entrar con {{provider}}', { provider: providerNames[provider] }));

  const submitEmail = () =>
    run(async () => {
      if (!creating) return signInWithEmail(email, password);
      const hasSession = await signUpWithEmail(email, password);
      if (!hasSession) {
        Alert.alert(t('Revisá tu correo'), t('Te enviamos un enlace para confirmar tu cuenta. Después iniciá sesión.'));
        setCreating(false);
        return false;
      }
    }, creating ? t('No pudimos crear la cuenta') : t('No pudimos iniciar sesión'));

  const guest = () =>
    run(async () => {
      try {
        await continueAsGuest();
      } catch {
        // Sin sesión anónima la app funciona igual, pero los viajes no se guardan.
        console.warn('No se pudo crear la sesión de invitado (¿Anonymous sign-ins desactivado en Supabase?).');
      }
    }, t('No pudimos continuar'));

  return (
    <Screen scroll>
      <TopBar title={creating ? t('Creá tu cuenta') : t('Iniciá sesión')} subtitle={t('BIENVENIDO A BAJÁ')} back />
      <Text style={styles.intro}>{t('Guardá tus lugares y retomá tus viajes en cualquier dispositivo.')}</Text>
      <View style={styles.socialButtons}>
        <ActionButton label={t('Continuar con Google')} variant="secondary" disabled={busy} onPress={() => void socialLogin('google')} />
        <ActionButton label={t('Continuar con Apple')} variant="secondary" disabled={busy} onPress={() => void socialLogin('apple')} />
      </View>
      <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>{t('O CON EMAIL')}</Text><View style={styles.line} /></View>
      <View style={styles.field}>
        <Text style={styles.label}>{t('EMAIL')}</Text>
        <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="tu@email.com" placeholderTextColor={colors.muted} value={email} onChangeText={setEmail} style={styles.input} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>{t('CONTRASEÑA')}</Text>
        <TextInput secureTextEntry placeholder={creating ? t('Mínimo 6 caracteres') : t('Tu contraseña')} placeholderTextColor={colors.muted} value={password} onChangeText={setPassword} style={styles.input} />
      </View>
      {creating ? null : (
        <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgot}><Text style={styles.forgotText}>{t('¿Olvidaste tu contraseña?')}</Text></Pressable>
      )}
      <View style={styles.actions}>
        <ActionButton label={creating ? t('Crear cuenta') : 'Iniciar sesión'} disabled={busy || !email.trim() || password.length < (creating ? 6 : 1)} onPress={() => void submitEmail()} />
        <ActionButton label={creating ? t('Ya tengo cuenta') : t('Crear una cuenta')} variant="secondary" disabled={busy} onPress={() => setCreating((value) => !value)} />
        <ActionButton label={t('Continuar sin cuenta')} variant="quiet" disabled={busy} onPress={() => void guest()} />
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  intro: { color: colors.secondary, fontSize: 13, lineHeight: 20, marginBottom: 18 },
  socialButtons: { gap: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 19 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  or: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  field: { marginBottom: 12 },
  label: { color: colors.muted, fontSize: 10, fontWeight: '700', marginBottom: 6 },
  input: { minHeight: 47, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 12, fontSize: 13 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 5, marginBottom: 8 },
  forgotText: { color: colors.primary, fontSize: 11, fontWeight: '600' },
  actions: { gap: 8, marginTop: 4 },
}));
