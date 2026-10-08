import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { searchPlaces, type Place } from '../../lib/geocode';
import { ActionButton, colors, Panel, Screen, themedStyles, TopBar } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
const destinations = [
  { name: 'Av. Colón 4500', neighborhood: 'Nueva Córdoba, Córdoba', latitude: -31.4201, longitude: -64.1888 },
  { name: 'Av. Colón 1100', neighborhood: 'Centro, Córdoba', latitude: -31.4146, longitude: -64.1862 },
  { name: 'Terminal de Ómnibus', neighborhood: 'Nueva Córdoba, Córdoba', latitude: -31.4231, longitude: -64.1804 },
  { name: 'Ciudad Universitaria', neighborhood: 'Córdoba', latitude: -31.4414, longitude: -64.1937 },
];

export default function DestinationSearchScreen() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (query.trim().length < 3) return;
    setSearching(true);
    setError(null);
    try {
      setResults(await searchPlaces(query));
    } catch (err) {
      setResults(null);
      setError(err instanceof Error ? err.message : t('No pudimos buscar. Revisá tu conexión.'));
    } finally {
      setSearching(false);
    }
  };

  const updateQuery = (value: string) => {
    setQuery(value);
    setResults(null);
    setError(null);
  };

  const chooseDestination = (place: { name: string; latitude: number; longitude: number }) => {
    router.push({
      pathname: '/destination/confirm',
      params: { destination: place.name, latitude: String(place.latitude), longitude: String(place.longitude) },
    });
  };

  const list: { name: string; neighborhood: string; latitude: number; longitude: number }[] =
    results ? results.map((place) => ({ name: place.name, neighborhood: place.detail, latitude: place.latitude, longitude: place.longitude })) : destinations;

  return (
    <Screen>
      <TopBar title={t('Elegir destino')} subtitle={t('NUEVO VIAJE')} back />
      <View style={styles.searchBox}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Buscar')} onPress={() => void search()}>
          <Text style={styles.searchGlyph}>⌕</Text>
        </Pressable>
        <TextInput
          autoFocus
          autoCapitalize="sentences"
          placeholder={t('Dirección, lugar o parada')}
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          value={query}
          onChangeText={updateQuery}
          onSubmitEditing={() => void search()}
          style={styles.input}
        />
        {query.length > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('Borrar búsqueda')} onPress={() => updateQuery('')}>
            <Text style={styles.clear}>×</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.sectionLabel}>{searching ? t('BUSCANDO…') : results ? 'RESULTADOS' : 'SUGERENCIAS'}</Text>
      <View style={styles.results}>
        {list.map((destination) => (
          <Pressable key={`${destination.name}-${destination.latitude}`} accessibilityRole="button" onPress={() => chooseDestination(destination)} style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
            <View style={styles.pin}><Text style={styles.pinText}>•</Text></View>
            <View style={styles.resultCopy}>
              <Text numberOfLines={1} style={styles.resultTitle}>{destination.name}</Text>
              <Text numberOfLines={1} style={styles.resultSubtitle}>{destination.neighborhood}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
        {error ? <Panel><Text style={styles.emptyTitle}>{t('No pudimos buscar')}</Text><Text style={styles.emptyText}>{error}</Text></Panel> : null}
        {results && results.length === 0 ? (
          <Panel><Text style={styles.emptyTitle}>{t('No encontramos ese lugar')}</Text><Text style={styles.emptyText}>{t('Probá con calle y número, o elegí el punto en el mapa.')}</Text></Panel>
        ) : null}
      </View>
      <View style={styles.mapAction}>
        <ActionButton label={t('Elegir punto en el mapa')} variant="secondary" onPress={() => router.push('/destination/map')} />
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  searchBox: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 8, borderColor: colors.primary, borderWidth: 1, backgroundColor: colors.surface, paddingHorizontal: 12, gap: 8 },
  searchGlyph: { color: colors.primary, fontSize: 25 },
  input: { flex: 1, color: colors.text, fontSize: 13, paddingVertical: 0 },
  clear: { color: colors.secondary, fontSize: 23, paddingHorizontal: 4 },
  sectionLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 22, marginBottom: 8 },
  results: { gap: 2 },
  result: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pin: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#10b9811a', alignItems: 'center', justifyContent: 'center' },
  pinText: { color: colors.primary, fontSize: 22, lineHeight: 25 },
  resultCopy: { flex: 1, gap: 4 },
  resultTitle: { color: colors.text, fontSize: 13, fontWeight: '600' },
  resultSubtitle: { color: colors.muted, fontSize: 11 },
  chevron: { color: colors.muted, fontSize: 23 },
  emptyTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  emptyText: { color: colors.muted, fontSize: 11, marginTop: 6, lineHeight: 17 },
  mapAction: { marginTop: 'auto', paddingTop: 12 },
  pressed: { opacity: 0.65 },
}));