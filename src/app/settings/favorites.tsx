import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchFavorites, type Favorite } from '../../lib/data';
import { useFocusData } from '../../lib/useFocusData';
import { ActionButton, colors, Panel, Screen, themedStyles, TopBar } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
export default function FavoritesScreen() {
  const { t } = useTranslation();
  const { data: places, loading } = useFocusData<Favorite[]>(fetchFavorites, []);

  return (
    <Screen scroll>
      <TopBar title={t('Destinos favoritos')} subtitle={t('TUS LUGARES')} back />
      {places.length === 0 ? <Panel><Text style={styles.empty}>{loading ? t('Cargando…') : t('Todavía no guardaste ningún destino.')}</Text></Panel> : null}
      <Panel style={[styles.list, places.length === 0 && styles.hidden]}>
        {places.map((place, index) => (
          <View key={place.id} style={[styles.row, index > 0 && styles.divider]}>
            <View style={[styles.mark, { backgroundColor: `${place.tint ?? colors.primary}1a` }]}><Text style={[styles.glyph, { color: place.tint ?? colors.primary }]}>{place.glyph ?? '⌂'}</Text></View>
            <View style={styles.copy}><Text style={styles.name}>{place.label}</Text><Text style={styles.address}>{place.address}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${place.label}`} onPress={() => router.push({ pathname: '/settings/add-favorite', params: { id: place.id, name: place.label, address: place.address, ...(place.latitude !== null && place.longitude !== null ? { latitude: String(place.latitude), longitude: String(place.longitude) } : {}) } })} style={styles.edit}><Text style={styles.editText}>{t('Editar')}</Text></Pressable>
          </View>
        ))}
      </Panel>
      <View style={styles.add}><ActionButton label={t('Agregar destino')} onPress={() => router.push('/settings/add-favorite')} /></View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  empty: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  hidden: { display: 'none' },
  list: { paddingVertical: 1 },
  row: { minHeight: 69, flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  mark: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 19, fontWeight: '600' },
  copy: { flex: 1, gap: 4 },
  name: { color: colors.text, fontSize: 12, fontWeight: '700' },
  address: { color: colors.muted, fontSize: 10 },
  edit: { padding: 7 },
  editText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
  add: { marginTop: 14 },
}));