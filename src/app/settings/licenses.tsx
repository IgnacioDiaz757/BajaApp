import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, Panel, Screen, themedStyles, TopBar } from '../../components/ui/primitives';
import licenses from '../../legal/licenses.json';

export default function LicensesScreen() {
  const { t } = useTranslation();
  return (
    <Screen scroll>
      <TopBar title={t('Código abierto')} subtitle={t('LEGAL')} back />
      <Text style={styles.intro}>{t('Bajá usa estos componentes de código abierto. Cada uno se distribuye bajo la licencia indicada.')}</Text>
      <Panel style={styles.list}>
        {licenses.map((item, index) => (
          <View key={item.name} style={[styles.row, index > 0 && styles.divider]}>
            <Text numberOfLines={1} style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.version} · {item.license}</Text>
          </View>
        ))}
      </Panel>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  intro: { color: colors.secondary, fontSize: 12, lineHeight: 18, marginBottom: 14 },
  list: { paddingVertical: 2 },
  row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  name: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 11 },
}));
