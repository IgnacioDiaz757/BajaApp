import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { sendPasswordReset } from '../../lib/auth';
import { ActionButton, colors, Panel, Screen, themedStyles, TopBar } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      Alert.alert(t('No pudimos enviar el enlace'), err instanceof Error ? err.message : t('Intentá de nuevo.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <TopBar title={t('Recuperar contraseña')} subtitle={t('ACCESO')} back />
      <Text style={styles.copy}>{t('Ingresá el email de tu cuenta y te enviaremos un enlace para restablecerla.')}</Text>
      <Text style={styles.label}>{t('EMAIL')}</Text>
      <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="tu@email.com" placeholderTextColor={colors.muted} value={email} onChangeText={setEmail} style={styles.input} />
      <View style={styles.action}><ActionButton label={t('Enviar enlace')} disabled={!email.includes('@') || busy} onPress={() => void submit()} /></View>
      {sent ? <Panel style={styles.confirmation}><Text style={styles.confirmTitle}>{t('Revisá tu correo')}</Text><Text style={styles.confirmText}>Si existe una cuenta para {email}, vas a recibir un enlace para restablecer la contraseña.</Text></Panel> : null}
      <View style={styles.bottom}><ActionButton label={t('Volver a iniciar sesión')} variant="quiet" onPress={() => router.replace('/(auth)/login')} /></View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  copy: { color: colors.secondary, fontSize: 13, lineHeight: 20, marginBottom: 20 },
  label: { color: colors.muted, fontSize: 10, fontWeight: '700', marginBottom: 6 },
  input: { minHeight: 47, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 12, fontSize: 13 },
  action: { marginTop: 12 },
  confirmation: { marginTop: 14, borderColor: '#10b98155' },
  confirmTitle: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  confirmText: { color: colors.secondary, fontSize: 11, lineHeight: 16, marginTop: 5 },
  bottom: { marginTop: 'auto', paddingTop: 14 },
}));