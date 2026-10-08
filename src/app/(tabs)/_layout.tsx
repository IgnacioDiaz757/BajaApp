import { Tabs } from 'expo-router';
import { colors } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 62,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 8,
          paddingBottom: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('Inicio'), tabBarLabel: t('Inicio') }} />
      <Tabs.Screen name="history" options={{ title: t('Viajes'), tabBarLabel: t('Viajes') }} />
      <Tabs.Screen name="profile" options={{ title: t('Perfil'), tabBarLabel: t('Perfil') }} />
    </Tabs>
  );
}