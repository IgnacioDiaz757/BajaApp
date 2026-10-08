import { Stack } from 'expo-router';
import { colors } from '../../components/ui/primitives';

// Dentro de un juego los deslizamientos son del juego: se desactivan los gestos de "volver" de la navegación
// (deslizar desde el borde / pantalla completa). La salida es el botón ‹ de la barra superior.
export default function GamesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false, fullScreenGestureEnabled: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" options={{ gestureEnabled: true }} />
    </Stack>
  );
}
