import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { colors, Panel, Screen, SettingRow, themedStyles, TopBar } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
export default function LegalScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <TopBar title={t('Legal y privacidad')} subtitle={t('LEGAL')} back />
      <Panel style={styles.panel}>
        <SettingRow title={t('Términos y condiciones')} detail={t('Condiciones de uso de Bajá')} onPress={() => router.push('/settings/terms')} />
        <SettingRow title={t('Política de privacidad')} detail={t('Cómo usamos y cuidamos tus datos')} onPress={() => router.push('/settings/privacy')} />
        <SettingRow title={t('Código abierto')} detail={t('Licencias de terceros')} onPress={() => router.push('/settings/licenses')} />
      </Panel>
      <Text style={styles.note}>{t('La ubicación se utiliza para calcular la distancia hasta el destino elegido durante un viaje.')}</Text>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  panel: { paddingVertical: 2 },
  note: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 16 },
}));