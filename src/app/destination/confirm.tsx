import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { geocodeAddress } from '../../lib/geocode';
import { startTrip } from '../../lib/trips';
import { useTripStore } from '../../stores/trip';
import { ActionButton, colors, Panel, Screen, SectionTitle, themedStyles, TopBar } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
const alertOptions = [
  { distance: '2 km', meters: 2000, detail: 'Aviso suave', color: colors.primary },
  { distance: '1 km', meters: 1000, detail: 'Vibración', color: colors.amber },
  { distance: '500 m', meters: 500, detail: 'Sonido y vibración', color: colors.red },
  { distance: '200 m', meters: 200, detail: 'Alerta fuerte', color: colors.red },
];

export default function DestinationConfirmScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ destination?: string; latitude?: string; longitude?: string }>();
  const [mode, setMode] = useState<'distance' | 'time'>('distance');
  const [alertMeters, setAlertMeters] = useState<number[]>([500]);
  const [starting, setStarting] = useState(false);
  const busLine = useTripStore((state) => state.busLine);
  const destination = params.destination || 'Av. Colón 4500';
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    Number(params.latitude) && Number(params.longitude)
      ? { latitude: Number(params.latitude), longitude: Number(params.longitude) }
      : null,
  );
  const [locateFailed, setLocateFailed] = useState(false);

  // Si el destino llega solo como dirección (ej. un lugar guardado), se ubica en el mapa.
  useEffect(() => {
    if (coords) return;
    let active = true;
    geocodeAddress(destination)
      .then((found) => {
        if (!active) return;
        if (found) setCoords(found);
        else setLocateFailed(true);
      })
      .catch(() => active && setLocateFailed(true));
    return () => {
      active = false;
    };
  }, [coords, destination]);

  // Se pueden elegir varias distancias, pero siempre queda al menos una.
  const toggleAlert = (meters: number) =>
    setAlertMeters((current) => {
      if (!current.includes(meters)) return [...current, meters];
      return current.length > 1 ? current.filter((value) => value !== meters) : current;
    });

  const start = async () => {
    if (!coords) return;
    setStarting(true);
    await startTrip({
      destination,
      latitude: coords.latitude,
      longitude: coords.longitude,
      mode,
      busLineId: busLine?.id,
    });
    router.replace({ pathname: '/trip/active', params: { destination, latitude: String(coords.latitude), longitude: String(coords.longitude), mode, alertMeters: alertMeters.join(',') } });
  };

  return (
    <Screen scroll>
      <TopBar title={t('Prepará tu aviso')} subtitle={t('DESTINO')} back />
      <Panel style={styles.destinationCard}>
        <View style={styles.pin}><Text style={styles.pinText}>•</Text></View>
        <View style={styles.destinationCopy}>
          <Text style={styles.destinationName}>{destination}</Text>
          <Text style={styles.destinationDetail}>{coords ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : locateFailed ? t('No encontramos esa dirección. Elegí el punto en el mapa.') : t('Ubicando dirección…')}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/destination/map', params: { destination, ...(coords ? { latitude: String(coords.latitude), longitude: String(coords.longitude) } : {}) } })}><Text style={styles.edit}>{t('Mapa')}</Text></Pressable>
      </Panel>

      <View style={styles.section}>
        <SectionTitle title={t('Avisarme por')} />
        <View style={styles.segment}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === 'distance' }} onPress={() => setMode('distance')} style={[styles.segmentButton, mode === 'distance' && styles.segmentActive]}>
            <Text style={[styles.segmentText, mode === 'distance' && styles.segmentTextActive]}>{t('Distancia')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === 'time' }} onPress={() => setMode('time')} style={[styles.segmentButton, mode === 'time' && styles.segmentActive]}>
            <Text style={[styles.segmentText, mode === 'time' && styles.segmentTextActive]}>{t('Tiempo')}</Text>
          </Pressable>
        </View>
        <Panel style={styles.alertList}>
          {mode === 'distance' ? alertOptions.map((option, index) => {
            const selected = alertMeters.includes(option.meters);
            return (
              <Pressable
                key={option.distance}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() => toggleAlert(option.meters)}
                style={[styles.alertRow, index > 0 && styles.divider]}
              >
                <View style={[styles.alertDot, { backgroundColor: option.color }]} />
                <Text style={styles.alertDistance}>{option.distance}</Text>
                <Text style={styles.alertDetail}>{t(option.detail)}</Text>
                <View style={[styles.checked, !selected && styles.unchecked]}>{selected ? <Text style={styles.check}>✓</Text> : null}</View>
              </Pressable>
            );
          }) : [
            { distance: t('5 min'), detail: t('Antes de llegar'), color: colors.primary },
            { distance: t('3 min'), detail: t('Vibración'), color: colors.amber },
            { distance: t('1 min'), detail: t('Alerta fuerte'), color: colors.red },
          ].map((option, index) => (
            <View key={option.distance} style={[styles.alertRow, index > 0 && styles.divider]}>
              <View style={[styles.alertDot, { backgroundColor: option.color }]} />
              <Text style={styles.alertDistance}>{option.distance}</Text>
              <Text style={styles.alertDetail}>{t(option.detail)}</Text>
              <View style={styles.checked}><Text style={styles.check}>✓</Text></View>
            </View>
          ))}
        </Panel>
      </View>

      <View style={styles.section}>
        <SectionTitle title={t('Opcional')} />
        <Pressable accessibilityRole="button" onPress={() => router.push('/destination/bus-line')} style={({ pressed }) => [styles.busButton, pressed && styles.pressed]}>
          <Text style={styles.busGlyph}>▤</Text>
          <View style={styles.busCopy}><Text style={styles.busTitle}>{t('Línea de colectivo')}</Text><Text style={styles.busDetail}>{busLine ? `${t('Línea')} ${busLine.number} · ${busLine.direction}` : t('Elegí tu línea para afinar los avisos')}</Text></View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      <View style={styles.startAction}>
        <ActionButton label={t('Comenzar viaje')} disabled={starting || !coords} onPress={() => void start()} />
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  destinationCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pin: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#ef44441a', alignItems: 'center', justifyContent: 'center' },
  pinText: { color: colors.red, fontSize: 23, lineHeight: 26 },
  destinationCopy: { flex: 1, gap: 4 },
  destinationName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  destinationDetail: { color: colors.muted, fontSize: 10 },
  edit: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  section: { marginTop: 22 },
  segment: { flexDirection: 'row', padding: 3, gap: 4, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  segmentButton: { flex: 1, minHeight: 37, justifyContent: 'center', alignItems: 'center', borderRadius: 6 },
  segmentActive: { backgroundColor: colors.surfaceRaised },
  segmentText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  segmentTextActive: { color: colors.text },
  alertList: { paddingVertical: 2 },
  alertRow: { minHeight: 49, flexDirection: 'row', alignItems: 'center', gap: 9 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  alertDot: { width: 7, height: 7, borderRadius: 4 },
  alertDistance: { width: 48, color: colors.text, fontSize: 12, fontWeight: '700' },
  alertDetail: { flex: 1, color: colors.muted, fontSize: 10 },
  checked: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  unchecked: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.muted },
  check: { color: '#052e24', fontSize: 11, fontWeight: '900' },
  busButton: { minHeight: 66, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  busGlyph: { color: colors.amber, fontSize: 20 },
  busCopy: { flex: 1, gap: 4 },
  busTitle: { color: colors.text, fontSize: 12, fontWeight: '600' },
  busDetail: { color: colors.muted, fontSize: 10 },
  chevron: { color: colors.muted, fontSize: 23 },
  startAction: { marginTop: 20 },
  pressed: { opacity: 0.68 },
}));