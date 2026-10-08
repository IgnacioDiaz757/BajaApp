import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { deleteMyAccount } from '../../lib/account';
import { isGuest, signOut, useSession } from '../../lib/auth';
import Constants from 'expo-constants';
import { usePreferences } from '../../stores/preferences';
import { useThemeStore } from '../../stores/theme';
import { ActionButton, colors, Panel, Screen, SettingRow, themedStyles, TopBar } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
const themeLabels = { dark: 'Oscuro', light: 'Claro', system: 'Automático' } as const;
const languageNames = { es: 'Español', en: 'English', pt: 'Português' } as const;

export default function ProfileScreen() {
  const { t } = useTranslation();
  const themePreference = useThemeStore((state) => state.preference);
  const language = usePreferences((state) => state.language);
  const { user } = useSession();
  const guest = isGuest(user);
  const name = guest ? t('Invitado') : (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split('@')[0] ?? 'Tu cuenta';
  const email = guest ? t('Sin cuenta · tus viajes se guardan en este dispositivo') : user?.email ?? '';

  const confirmDelete = () =>
    Alert.alert(
      t('¿Eliminar tu cuenta?'),
      t('Se borrarán tu cuenta, tus viajes, tus lugares y tus preferencias. Esta acción no se puede deshacer.'),
      [
        { text: t('Cancelar'), style: 'cancel' },
        {
          text: t('Eliminar'),
          style: 'destructive',
          onPress: () => {
            deleteMyAccount()
              .then(() => router.replace('/(auth)/welcome'))
              .catch((err: unknown) => Alert.alert(t('No pudimos eliminar la cuenta'), err instanceof Error ? err.message : t('Intentá de nuevo.')));
          },
        },
      ],
    );

  const leave = async () => {
    await signOut();
    router.replace('/(auth)/welcome');
  };

  return (
    <Screen scroll>
      <TopBar title={t('Tu perfil')} subtitle={t('CUENTA')} />
      <Panel style={styles.identity}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text></View>
        <View style={styles.identityCopy}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Panel>
      <View style={styles.rows}>
        <Panel style={styles.group}>
          <SettingRow title={t('Configurar alertas')} detail={t('Distancia, sonido y vibración')} onPress={() => router.push('/settings/alerts')} />
          <SettingRow title={t('Destinos favoritos')} detail={t('Casa, trabajo y otros lugares')} onPress={() => router.push('/settings/favorites')} />
          <SettingRow title={t('Apariencia')} detail={t(themeLabels[themePreference])} onPress={() => router.push('/settings/appearance')} />
          <SettingRow title={t('Idioma')} detail={languageNames[language]} onPress={() => router.push('/settings/language')} />
          <SettingRow title={t('Ahorro de batería')} detail={t('Optimizar el seguimiento en Android')} onPress={() => router.push('/settings/battery')} />
          <SettingRow title={t('Legal y privacidad')} onPress={() => router.push('/settings/legal')} />
        </Panel>
      </View>
      <View style={styles.rows}>
        {guest
          ? <ActionButton label={t('Iniciar sesión o crear cuenta')} onPress={() => router.push('/(auth)/login')} />
          : <ActionButton label={t('Cerrar sesión')} variant="secondary" onPress={() => void leave()} />}
        {user ? <ActionButton label={t('Eliminar cuenta')} variant="destructive" onPress={confirmDelete} /> : null}
      </View>
      <Text style={styles.version}>{`BAJÁ · ${t('VERSIÓN')} ${Constants.expoConfig?.version ?? ''}`}</Text>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 76 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#052e24', fontSize: 17, fontWeight: '800' },
  identityCopy: { flex: 1, gap: 3 },
  name: { color: colors.text, fontSize: 14, fontWeight: '700' },
  email: { color: colors.muted, fontSize: 11 },
  chevron: { color: colors.muted, fontSize: 24 },
  rows: { marginTop: 18 },
  group: { paddingVertical: 2 },
  version: { color: colors.muted, fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 24 },
}));