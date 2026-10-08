import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchBusLines, type BusLine } from '../../lib/data';
import { useFocusData } from '../../lib/useFocusData';
import { useTripStore } from '../../stores/trip';
import { ActionButton, colors, Panel, Screen, themedStyles, TopBar } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
export default function BusLineScreen() {
  const { t } = useTranslation();
  const { data: lines, loading, failed } = useFocusData<BusLine[]>(fetchBusLines, []);
  const busLine = useTripStore((state) => state.busLine);
  const setBusLine = useTripStore((state) => state.setBusLine);
  const [selected, setSelected] = useState<string | null>(busLine?.number ?? null);

  const confirm = () => {
    setBusLine(lines.find((line) => line.number === selected) ?? null);
    router.back();
  };
  return (
    <Screen>
      <TopBar title={t('Línea de colectivo')} subtitle={t('OPCIONAL')} back />
      {lines.length === 0 ? <Panel><Text style={styles.empty}>{loading ? t('Cargando líneas…') : failed ? t('No pudimos cargar las líneas.') : t('Todavía no hay líneas cargadas.')}</Text></Panel> : null}
      <Panel style={[styles.list, lines.length === 0 && styles.hidden]}>
        {lines.map((line, index) => (
          <Pressable key={line.id} accessibilityRole="radio" accessibilityState={{ selected: selected === line.number }} onPress={() => setSelected(line.number)} style={[styles.row, index > 0 && styles.divider]}>
            <View style={[styles.lineBadge, selected === line.number && styles.lineBadgeSelected]}><Text style={styles.lineNumber}>{line.number}</Text></View>
            <Text style={styles.direction}>{line.direction}</Text>
            <View style={[styles.radio, selected === line.number && styles.radioSelected]}>{selected === line.number ? <View style={styles.radioDot} /> : null}</View>
          </Pressable>
        ))}
      </Panel>
      <View style={styles.footer}><ActionButton label={selected ? t('Usar línea {{number}}', { number: selected }) : t('Continuar sin línea')} onPress={confirm} /></View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  empty: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  hidden: { display: 'none' },
  list: { paddingVertical: 2 },
  row: { minHeight: 63, flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  lineBadge: { width: 35, height: 35, borderRadius: 8, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  lineBadgeSelected: { backgroundColor: colors.primaryDark },
  lineNumber: { color: colors.text, fontSize: 13, fontWeight: '800' },
  direction: { flex: 1, color: colors.text, fontSize: 11 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  footer: { marginTop: 'auto', paddingTop: 12, paddingBottom: 12 },
}));