import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { colors, themedStyles } from './ui/primitives';
import { useTranslation } from 'react-i18next';
export function TripMap({ destination, target }: { destination: string; target: { latitude: number; longitude: number } }) {
  const { t } = useTranslation();
  const [region, setRegion] = useState<Region>({ ...target, latitudeDelta: 0.025, longitudeDelta: 0.025 });

  return (
    <View style={styles.map}>
      <MapView initialRegion={region} onRegionChangeComplete={setRegion} style={StyleSheet.absoluteFill} showsUserLocation showsMyLocationButton>
        <Marker coordinate={target} title={t('Destino')} description={destination} pinColor="#ef4444" />
      </MapView>
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({ map: { flex: 1, backgroundColor: colors.mapFallback } }));