import { StyleSheet, Text, View } from 'react-native';
import { colors, Panel, Screen, themedStyles, TopBar } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
const steps = [
  'Abrí Configuración y elegí Aplicaciones.',
  'Buscá Bajá y entrá en Batería.',
  'Permití el uso en segundo plano durante el viaje.',
];

export default function BatterySettingsScreen() {
  const { t } = useTranslation();
  return (
    <Screen scroll>
      <TopBar title={t('Ahorro de batería')} subtitle={t('ANDROID')} back />
      <Text style={styles.intro}>{t('Algunos teléfonos limitan el GPS cuando la app queda en segundo plano.')}</Text>
      <View style={styles.steps}>
        {steps.map((step, index) => (
          <Panel key={step} style={styles.step}>
            <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
            <Text style={styles.stepText}>{t(step)}</Text>
          </Panel>
        ))}
      </View>
      <Text style={styles.note}>{t('Los nombres de estos controles pueden variar según el fabricante del teléfono.')}</Text>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  intro: { color: colors.secondary, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  steps: { gap: 8 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62 },
  number: { width: 25, height: 25, borderRadius: 13, backgroundColor: '#10b9811a', alignItems: 'center', justifyContent: 'center' },
  numberText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  stepText: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 18 },
  note: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 18 },
}));