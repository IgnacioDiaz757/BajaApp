import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { describeCoordinates } from '../../lib/geocode';
import { ActionButton, colors, Screen, themedStyles, TopBar } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
const initialRegion: Region = {
  latitude: -31.4201,
  longitude: -64.1888,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};

export default function DestinationMapScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ destination?: string; latitude?: string; longitude?: string }>();
  const start: Region = Number(params.latitude) && Number(params.longitude)
    ? { latitude: Number(params.latitude), longitude: Number(params.longitude), latitudeDelta: 0.008, longitudeDelta: 0.008 }
    : initialRegion;
  const [region, setRegion] = useState(start);
  const [confirming, setConfirming] = useState(false);

  const confirm = async () => {
    setConfirming(true);
    const moved = Math.abs(region.latitude - start.latitude) > 0.0001 || Math.abs(region.longitude - start.longitude) > 0.0001;
    const name = params.destination && !moved ? params.destination : await describeCoordinates(region.latitude, region.longitude);
    router.push({ pathname: '/destination/confirm', params: { destination: name, latitude: String(region.latitude), longitude: String(region.longitude) } });
    setConfirming(false);
  };

  return (
    <Screen>
      <TopBar title={t('Punto de llegada')} subtitle={t('ELEGIR EN EL MAPA')} back />
      <View style={styles.mapWrap}>
        <MapView initialRegion={start} onRegionChangeComplete={setRegion} style={StyleSheet.absoluteFill} showsUserLocation showsMyLocationButton>
          <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
        </MapView>
        <View pointerEvents="none" style={styles.crosshair}><View style={styles.crosshairDot} /></View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>{t('Ubicación seleccionada')}</Text>
        <Text style={styles.coordinates}>{region.latitude.toFixed(4)}, {region.longitude.toFixed(4)}</Text>
        <ActionButton label={t('Confirmar ubicación')} disabled={confirming} onPress={() => void confirm()} />
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  mapWrap: { flex: 1, minHeight: 240, overflow: 'hidden', borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.mapFallback },
  crosshair: { position: 'absolute', left: '50%', top: '50%', width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#ffffffaa', alignItems: 'center', justifyContent: 'center', transform: [{ translateX: -17 }, { translateY: -17 }] },
  crosshairDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },
  footer: { paddingTop: 14, gap: 4 },
  footerTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  coordinates: { color: colors.muted, fontSize: 11, marginBottom: 10 },
}));