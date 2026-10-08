import '../i18n';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, setColorScheme } from '../components/ui/primitives';
import { loadSession } from '../lib/tripTracking';
import { useThemeStore } from '../stores/theme';
import { useTripStore } from '../stores/trip';

// Las notificaciones del viaje solo se muestran con la app cerrada o en segundo plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

const handledResponses = new Set<string>();

async function openAlarmFromNotification(response: Notifications.NotificationResponse) {
  const id = response.notification.request.identifier;
  if (response.notification.request.content.data?.type !== 'alarm' || handledResponses.has(id)) return;
  handledResponses.add(id);
  // Solo se abre si el viaje sigue en curso (evita reabrir una alarma vieja).
  const session = await loadSession();
  if (!session) return;
  useTripStore.getState().setActiveTripId(session.tripId);
  router.push({ pathname: '/trip/alarm', params: { destination: session.destination } });
}

export default function RootLayout() {
  const preference = useThemeStore((state) => state.preference);
  const systemScheme = useColorScheme();
  const scheme = preference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : preference;

  // La paleta se fija antes de renderizar las pantallas; el `key` las vuelve a montar al cambiar de tema.
  setColorScheme(scheme);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void Notifications.getLastNotificationResponseAsync().then((response) => response && openAlarmFromNotification(response));
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => void openAlarmFromNotification(response));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Teclado, alertas y otros elementos nativos siguen el tema elegido.
    if (typeof Appearance.setColorScheme === 'function') {
      Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
    }
  }, [preference]);

  return (
    <GestureHandlerRootView key={scheme} style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
