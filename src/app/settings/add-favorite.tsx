import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { deleteFavorite, saveFavorite } from '../../lib/data';
import { geocodeAddress } from '../../lib/geocode';
import { ActionButton, colors, Screen, themedStyles, TopBar } from '../../components/ui/primitives';

import { useTranslation } from 'react-i18next';
export default function AddFavoriteScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string; name?: string; address?: string; latitude?: string; longitude?: string }>();
  const [name, setName] = useState(params.name ?? '');
  const [address, setAddress] = useState(params.address ?? '');
  const [busy, setBusy] = useState(false);

  const run = async (task: () => Promise<void>, errorTitle: string) => {
    setBusy(true);
    try {
      await task();
      router.back();
    } catch (err) {
      Alert.alert(errorTitle, err instanceof Error ? err.message : t('Intentá de nuevo.'));
      setBusy(false);
    }
  };

  // La dirección se ubica en el mapa al guardar, así el viaje va al lugar correcto.
  const save = async () => {
    const trimmed = address.trim();
    const unchanged = trimmed === (params.address ?? '') && Number(params.latitude) && Number(params.longitude);
    const found = unchanged
      ? { latitude: Number(params.latitude), longitude: Number(params.longitude) }
      : await geocodeAddress(trimmed);
    if (!found) throw new Error(t('No encontramos esa dirección en el mapa. Probá con calle, número y ciudad.'));
    await saveFavorite({ id: params.id, label: name.trim(), address: trimmed, ...found });
  };

  return (
    <Screen>
      <TopBar title={params.name ? t('Editar destino') : t('Nuevo destino')} subtitle={t('FAVORITOS')} back />
      <View style={styles.field}>
        <Text style={styles.label}>{t('NOMBRE')}</Text>
        <TextInput value={name} onChangeText={setName} placeholder={t('Casa, trabajo...')} placeholderTextColor={colors.muted} style={styles.input} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>{t('DIRECCIÓN')}</Text>
        <TextInput value={address} onChangeText={setAddress} placeholder={t('Buscar dirección')} placeholderTextColor={colors.muted} style={styles.input} />
      </View>
      <View style={styles.footer}><ActionButton label={t('Guardar destino')} disabled={busy || !name.trim() || !address.trim()} onPress={() => void run(save, t('No pudimos guardar el destino'))} />
        {params.id ? <ActionButton label={t('Eliminar destino')} variant="destructive" disabled={busy} onPress={() => void run(() => deleteFavorite(params.id as string), t('No pudimos eliminar el destino'))} /> : null}</View>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  field: { marginBottom: 16 },
  label: { color: colors.muted, fontSize: 10, fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 12, fontSize: 13 },
  footer: { marginTop: 'auto', paddingBottom: 14 },
}));