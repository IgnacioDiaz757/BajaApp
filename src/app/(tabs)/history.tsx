import { differenceInMinutes, format } from 'date-fns';
import { StyleSheet, Text, View } from 'react-native';
import { colors, Panel, Screen, SectionTitle, themedStyles, TopBar } from '../../components/ui/primitives';
import { fetchTrips, tripDayLabel, type TripRow, type TripStatus } from '../../lib/trips';
import { useFocusData } from '../../lib/useFocusData';

import { useTranslation } from 'react-i18next';
const statusStyle: Record<TripStatus, { label: string; color: string }> = {
  arrived: { label: 'Llegaste bien', color: colors.primary },
  missed: { label: 'Parada perdida', color: colors.red },
  cancelled: { label: 'Cancelado', color: colors.muted },
  active: { label: 'En curso', color: colors.amber },
};

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { data: trips, loading, failed } = useFocusData<TripRow[]>(fetchTrips, []);
  const arrived = trips.filter((trip) => trip.status === 'arrived');
  const durations = arrived
    .filter((trip) => trip.ended_at)
    .map((trip) => differenceInMinutes(new Date(trip.ended_at as string), new Date(trip.started_at)));
  const average = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null;

  return (
    <Screen scroll>
      <TopBar title={t('Tus viajes')} subtitle={t('ACTIVIDAD')} />
      <View style={styles.summary}>
        <Panel style={styles.summaryItem}><Text style={styles.summaryValue}>{trips.length}</Text><Text style={styles.summaryLabel}>{t('viajes')}</Text></Panel>
        <Panel style={styles.summaryItem}><Text style={[styles.summaryValue, { color: colors.primary }]}>{arrived.length}</Text><Text style={styles.summaryLabel}>{t('llegadas')}</Text></Panel>
        <Panel style={styles.summaryItem}><Text style={styles.summaryValue}>{average === null ? '–' : `${average}m`}</Text><Text style={styles.summaryLabel}>{t('promedio')}</Text></Panel>
      </View>
      <View style={styles.listSection}>
        <SectionTitle title={t('Recientes')} />
        {trips.length === 0 ? (
          <Panel><Text style={styles.empty}>{loading ? t('Cargando viajes…') : failed ? t('No pudimos cargar tus viajes. Revisá tu conexión.') : t('Todavía no hiciste ningún viaje. Cuando termines el primero va a aparecer acá.')}</Text></Panel>
        ) : (
          <Panel style={styles.list}>
            {trips.map((trip, index) => {
              const status = statusStyle[trip.status];
              const started = new Date(trip.started_at);
              return (
                <View key={trip.id} style={[styles.tripRow, index > 0 && styles.divider]}>
                  <View style={[styles.statusMark, { backgroundColor: `${status.color}1a` }]}><Text style={{ color: status.color, fontSize: 16 }}>•</Text></View>
                  <View style={styles.tripCopy}>
                    <Text numberOfLines={1} style={styles.tripPlace}>{trip.destination_label}</Text>
                    <Text style={styles.tripMeta}>{tripDayLabel(started)}, {format(started, 'HH:mm')}{trip.status === 'arrived' && trip.ended_at ? ` · ${t('llegada')} ${format(new Date(trip.ended_at), 'HH:mm')}` : ''}</Text>
                  </View>
                  <Text style={[styles.tripState, { color: status.color }]}>{t(status.label)}</Text>
                </View>
              );
            })}
          </Panel>
        )}
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  summary: { flexDirection: 'row', gap: 7 },
  summaryItem: { flex: 1, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', minHeight: 82 },
  summaryValue: { color: colors.text, fontSize: 21, fontWeight: '700' },
  summaryLabel: { color: colors.muted, fontSize: 10, marginTop: 4 },
  listSection: { marginTop: 26 },
  list: { paddingVertical: 1 },
  tripRow: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  statusMark: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tripCopy: { flex: 1, gap: 4 },
  tripPlace: { color: colors.text, fontSize: 12, fontWeight: '600' },
  tripMeta: { color: colors.muted, fontSize: 10 },
  empty: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  tripState: { fontSize: 9, fontWeight: '700', maxWidth: 62, textAlign: 'right' },
}));