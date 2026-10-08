import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { defaultAlertConfig, fetchAlertConfig, saveAlertConfig, type AlertConfig } from '../../lib/data';
import { useAlarmSound } from '../../stores/alarmSound';
import { useFocusData } from '../../lib/useFocusData';
import { colors, Panel, Screen, SettingRow, themedStyles, TopBar } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
type AlertKey = keyof AlertConfig;

export default function AlertSettingsScreen() {
  const { t } = useTranslation();
  const { data: alerts, setData: setAlerts } = useFocusData<AlertConfig>(fetchAlertConfig, defaultAlertConfig);
  const [saving, setSaving] = useState(false);
  const customSound = useAlarmSound((state) => state.custom);
  const toggle = useCallback(async (key: AlertKey) => {
    const previous = alerts;
    const next = { ...alerts, [key]: !alerts[key] };
    setAlerts(next);
    setSaving(true);
    try {
      await saveAlertConfig(next);
    } catch (err) {
      setAlerts(previous);
      Alert.alert(t('No pudimos guardar el cambio'), err instanceof Error ? err.message : t('Intentá de nuevo.'));
    } finally {
      setSaving(false);
    }
  }, [alerts, setAlerts, t]);
  const rows: { key: AlertKey; distance: string; detail: string; color: string }[] = [
    { key: 'two_km', distance: t('2 km'), detail: t('Aviso suave'), color: colors.primary },
    { key: 'one_km', distance: t('1 km'), detail: t('Vibración'), color: colors.amber },
    { key: 'five_hundred_m', distance: t('500 m'), detail: t('Sonido y vibración'), color: colors.red },
    { key: 'two_hundred_m', distance: t('200 m'), detail: t('Alerta fuerte'), color: colors.red },
  ];

  return (
    <Screen scroll>
      <TopBar title={t('Configurar alertas')} subtitle={t('PREFERENCIAS')} back />
      <Text style={styles.label}>{t('AVISOS POR DISTANCIA')}</Text>
      <Panel style={styles.rows}>
        {rows.map((row, index) => (
          <View key={row.key} style={[styles.alertRow, index > 0 && styles.divider]}>
            <View style={[styles.dot, { backgroundColor: row.color }]} />
            <View style={styles.alertCopy}><Text style={styles.distance}>{row.distance}</Text><Text style={styles.detail}>{row.detail}</Text></View>
            <Switch value={alerts[row.key]} disabled={saving} onValueChange={() => void toggle(row.key)} trackColor={{ false: colors.border, true: '#047857' }} thumbColor={alerts[row.key] ? colors.primary : '#d4d4d8'} />
          </View>
        ))}
      </Panel>
      <Text style={[styles.label, styles.optionsLabel]}>{t('OPCIONES')}</Text>
      <Panel style={styles.rows}>
        <View style={styles.optionRow}><View style={styles.alertCopy}><Text style={styles.distance}>{t('Vibrar en silencio')}</Text><Text style={styles.detail}>{t('Usar vibración si el teléfono está silenciado')}</Text></View><Switch value={alerts.vibrate_on_silent} disabled={saving} onValueChange={() => void toggle('vibrate_on_silent')} trackColor={{ false: colors.border, true: '#047857' }} thumbColor={alerts.vibrate_on_silent ? colors.primary : '#d4d4d8'} /></View>
        <View style={[styles.optionRow, styles.divider]}><View style={styles.alertCopy}><Text style={styles.distance}>{t('Repetir alerta final')}</Text><Text style={styles.detail}>{t('Volver a avisar hasta que confirmes llegada')}</Text></View><Switch value={alerts.repeat_final_alert} disabled={saving} onValueChange={() => void toggle('repeat_final_alert')} trackColor={{ false: colors.border, true: '#047857' }} thumbColor={alerts.repeat_final_alert ? colors.primary : '#d4d4d8'} /></View>
        <SettingRow title={t('Sonido de la alarma')} detail={customSound ? customSound.displayName : t('Sonido de Bajá (por defecto)')} onPress={() => router.push('/settings/alarm-sound')} />
        <SettingRow title={t('Probar alarma')} detail={t('Reproducir un aviso de prueba')} onPress={() => router.push('/settings/test-alarm')} />
      </Panel>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  label: { color: colors.muted, fontSize: 10, fontWeight: '700', marginBottom: 8 },
  optionsLabel: { marginTop: 22 },
  rows: { paddingVertical: 2 },
  alertRow: { minHeight: 59, flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  dot: { width: 8, height: 8, borderRadius: 4 },
  alertCopy: { flex: 1, gap: 4 },
  distance: { color: colors.text, fontSize: 12, fontWeight: '600' },
  detail: { color: colors.muted, fontSize: 10, lineHeight: 14 },
}));