import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { fetchFavorites, type Favorite } from '../../lib/data';
import { useSession } from '../../lib/auth';
import { fetchTrips, tripDayLabel, type TripRow } from '../../lib/trips';
import { useFocusData } from '../../lib/useFocusData';
import { ActionButton, colors, Panel, Screen, SectionTitle, themedStyles, TopBar } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
const tripStatusLabel: Record<TripRow['status'], string> = {
  arrived: 'Llegaste bien',
  missed: 'Parada perdida',
  cancelled: 'Cancelado',
  active: 'En curso',
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { data: favorites } = useFocusData<Favorite[]>(fetchFavorites, []);
  const { data: trips } = useFocusData<TripRow[]>(fetchTrips, []);
  const recentTrips = trips.slice(0, 3);
  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0];

  return (
    <Screen scroll>
      <TopBar title={t('¿A dónde vas?')} subtitle={firstName ? `HOLA, ${firstName.toUpperCase()}` : 'HOLA'} right={(
        <Pressable accessibilityRole="button" accessibilityLabel={t('Buscar destino')} onPress={() => router.push('/destination/search')} style={styles.searchButton}>
          <Text style={styles.searchGlyph}>⌕</Text>
        </Pressable>
      )} />

      <Pressable accessibilityRole="button" onPress={() => router.push('/destination/search')} style={({ pressed }) => [styles.searchField, pressed && styles.pressed]}>
        <Text style={styles.searchIcon}>⌕</Text>
        <Text style={styles.searchPlaceholder}>{t('Buscar dirección o lugar')}</Text>
        <Text style={styles.searchHint}>⌘ K</Text>
      </Pressable>

      <View style={styles.sectionGap}>
        <SectionTitle title={t('Tus lugares')} action="Editar" onAction={() => router.push('/settings/favorites')} />
        <View style={styles.favoriteList}>
          {favorites.length === 0 ? <Panel><Text style={styles.emptyText}>{t('Guardá tus lugares frecuentes para salir más rápido.')}</Text></Panel> : null}
          {favorites.map((favorite) => (
            <Pressable
              key={favorite.id}
              accessibilityRole="button"
              onPress={() => router.push({
                pathname: '/destination/confirm',
                params: {
                  destination: favorite.address,
                  ...(favorite.latitude !== null && favorite.longitude !== null
                    ? { latitude: String(favorite.latitude), longitude: String(favorite.longitude) }
                    : {}),
                },
              })}
              style={({ pressed }) => [styles.favorite, pressed && styles.pressed]}
            >
              <View style={[styles.favoriteMark, { backgroundColor: `${favorite.tint ?? '#10b981'}1a` }]}>
                <Text style={[styles.favoriteGlyph, { color: favorite.tint ?? '#10b981' }]}>{favorite.glyph ?? '⌂'}</Text>
              </View>
              <View style={styles.favoriteCopy}>
                <Text style={styles.favoriteName}>{favorite.label}</Text>
                <Text style={styles.favoriteAddress}>{favorite.address}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.sectionGap}>
        <SectionTitle title={t('Viajes recientes')} action="Ver todos" onAction={() => router.push('/(tabs)/history')} />
        <Panel style={styles.recentPanel}>
          {recentTrips.length === 0 ? <Text style={styles.emptyText}>{t('Tus viajes van a aparecer acá.')}</Text> : null}
          {recentTrips.map((trip, index) => (
            <View key={trip.id} style={[styles.recentRow, index > 0 && styles.divider]}>
              <View style={styles.recentPin}><Text style={styles.recentPinGlyph}>•</Text></View>
              <View style={styles.recentCopy}>
                <Text numberOfLines={1} style={styles.recentDestination}>{trip.destination_label}</Text>
                <Text style={styles.recentDate}>{tripDayLabel(new Date(trip.started_at))}, {format(new Date(trip.started_at), 'HH:mm')} · {t(tripStatusLabel[trip.status])}</Text>
              </View>
            </View>
          ))}
        </Panel>
      </View>

      <View style={styles.bottomAction}>
        <ActionButton label={t('Elegir en el mapa')} variant="secondary" onPress={() => router.push('/destination/map')} />
        <ActionButton label={t('Jugar mientras viajás')} variant="quiet" onPress={() => router.push('/games')} />
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  emptyText: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  searchButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  searchGlyph: { color: colors.primary, fontSize: 31, lineHeight: 34 },
  searchField: { height: 52, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  searchIcon: { color: colors.primary, fontSize: 25 },
  searchPlaceholder: { color: colors.muted, fontSize: 13, flex: 1 },
  searchHint: { color: colors.muted, fontSize: 10, backgroundColor: colors.surfaceRaised, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 4 },
  sectionGap: { marginTop: 25 },
  favoriteList: { gap: 7 },
  favorite: { minHeight: 66, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, gap: 11 },
  favoriteMark: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  favoriteGlyph: { fontSize: 21, fontWeight: '600' },
  favoriteCopy: { flex: 1, gap: 3 },
  favoriteName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  favoriteAddress: { color: colors.muted, fontSize: 11 },
  chevron: { color: colors.muted, fontSize: 24 },
  recentPanel: { paddingVertical: 2 },
  recentRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  recentPin: { width: 29, height: 29, borderRadius: 8, backgroundColor: '#10b9811a', alignItems: 'center', justifyContent: 'center' },
  recentPinGlyph: { color: colors.primary, fontSize: 23, lineHeight: 25 },
  recentCopy: { flex: 1, gap: 4 },
  recentDestination: { color: colors.text, fontSize: 12, fontWeight: '600' },
  recentDate: { color: colors.muted, fontSize: 10 },
  bottomAction: { marginTop: 14 },
  pressed: { opacity: 0.7 },
}));