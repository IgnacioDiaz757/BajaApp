import { Share } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ActionButton, colors, Panel, Screen, themedStyles, TopBar } from '../../components/ui/primitives';
import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from 'react-i18next';
export default function ShareTripScreen() {
  const { t } = useTranslation();
  const { destination = t('tu destino') } = useLocalSearchParams<{ destination?: string }>();
  const shareTrip = async () => {
    await Share.share({ message: t('Estoy viajando hacia {{destination}} con Bajá.', { destination }) });
  };

  return (
    <Screen>
      <TopBar title={t('Compartir viaje')} subtitle={t('EN CAMINO')} back />
      <View style={styles.body}>
        <Panel style={styles.sharePanel}>
          <View style={styles.shareMark}><Text style={styles.shareGlyph}>↗</Text></View>
          <Text style={styles.shareTitle}>{t('Que sepan que vas en camino')}</Text>
          <Text style={styles.shareCopy}>{t('Compartí el destino y avisá que Bajá te va a alertar cuando estés por llegar.')}</Text>
          <Text style={styles.destinationLabel}>{t('DESTINO')}</Text>
          <Text style={styles.destination}>{destination}</Text>
        </Panel>
        <View style={styles.actions}>
          <ActionButton label={t('Compartir enlace')} onPress={shareTrip} />
          <ActionButton label={t('Volver al viaje')} variant="secondary" onPress={() => require('expo-router').router.back()} />
        </View>
        <Text style={styles.privacy}>{t('La ubicación en vivo solo se comparte cuando el enlace de seguimiento está habilitado.')}</Text>
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  body: { flex: 1, justifyContent: 'center', gap: 20 },
  sharePanel: { alignItems: 'center', padding: 20 },
  shareMark: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#10b9811a', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  shareGlyph: { color: colors.primary, fontSize: 30 },
  shareTitle: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  shareCopy: { color: colors.secondary, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7, marginBottom: 20 },
  destinationLabel: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  destination: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 5 },
  actions: { gap: 8 },
  privacy: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: 'center' },
}));