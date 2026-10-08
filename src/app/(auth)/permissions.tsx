import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { confirmBackgroundLocationDisclosure } from '../../lib/disclosure';
import { ActionButton, colors, Panel, Screen, themedStyles, TopBar } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
export default function PermissionsScreen() {
  const { t } = useTranslation();
  const [requesting, setRequesting] = useState(false);

  const enableLocation = async () => {
    setRequesting(true);
    try {
      const foreground = await Location.requestForegroundPermissionsAsync();
      if (foreground.status !== 'granted') {
        Alert.alert(t('Ubicación necesaria'), t('Podés seguir sin cuenta, pero el GPS es necesario para recibir avisos de llegada.'));
        return;
      }
      if (await confirmBackgroundLocationDisclosure()) {
        await Location.requestBackgroundPermissionsAsync().catch(() => undefined);
      }
      router.replace('/(tabs)');
    } catch {
      Alert.alert(t('No se pudo solicitar el permiso'), t('Revisá la configuración de ubicación del dispositivo.'));
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Screen>
      <TopBar title={t('Avisarte a tiempo')} subtitle={t('PERMISOS')} back />
      <Text style={styles.intro}>{t('Bajá usa tu ubicación durante el viaje para calcular la distancia hasta tu destino.')}</Text>
      <View style={styles.cards}>
        <Panel style={styles.permission}>
          <View style={styles.permissionMark}><Text style={styles.permissionGlyph}>⌖</Text></View>
          <View style={styles.permissionCopy}><Text style={styles.permissionTitle}>{t('Ubicación')}</Text><Text style={styles.permissionDetail}>{t('Solo durante el viaje, también con la pantalla apagada.')}</Text></View>
        </Panel>
        <Panel style={styles.permission}>
          <View style={[styles.permissionMark, styles.noticeMark]}><Text style={[styles.permissionGlyph, styles.noticeGlyph]}>!</Text></View>
          <View style={styles.permissionCopy}><Text style={styles.permissionTitle}>{t('Notificaciones')}</Text><Text style={styles.permissionDetail}>{t('Avisos visuales y vibración al acercarte.')}</Text></View>
        </Panel>
      </View>
      <View style={styles.actions}>
        <ActionButton label={requesting ? 'Solicitando…' : t('Permitir ubicación')} disabled={requesting} onPress={() => void enableLocation()} />
        <ActionButton label={t('Más tarde')} variant="quiet" onPress={() => router.replace('/(tabs)')} />
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  intro: { color: colors.secondary, fontSize: 13, lineHeight: 20, marginBottom: 18 },
  cards: { gap: 8 },
  permission: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  permissionMark: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b9811a' },
  permissionGlyph: { color: colors.primary, fontSize: 22 },
  noticeMark: { backgroundColor: '#f59e0b1a' },
  noticeGlyph: { color: colors.amber, fontWeight: '800' },
  permissionCopy: { flex: 1, gap: 4 },
  permissionTitle: { color: colors.text, fontSize: 12, fontWeight: '700' },
  permissionDetail: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  actions: { marginTop: 'auto', gap: 3, paddingBottom: 10 },
}));