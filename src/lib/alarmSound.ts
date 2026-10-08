import type { AudioSource } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { useAlarmSound } from '../stores/alarmSound';

const defaultSound = require('../../assets/sounds/alarm.wav') as AudioSource;

const filePrefix = 'alarm-sound-';

function removeStoredFile(fileName: string | undefined) {
  if (!fileName) return;
  try {
    const file = new File(Paths.document, fileName);
    if (file.exists) file.delete();
  } catch (err) {
    console.warn('No se pudo borrar la canción anterior', err);
  }
}

/** Fuente de audio de la alarma: la canción del usuario si existe, si no el sonido por defecto. */
export function resolveAlarmSource(): AudioSource {
  const custom = useAlarmSound.getState().custom;
  if (custom) {
    try {
      const file = new File(Paths.document, custom.fileName);
      if (file.exists) return { uri: file.uri };
    } catch (err) {
      console.warn('No se pudo leer la canción elegida', err);
    }
  }
  return defaultSound;
}

/** Abre el selector de archivos, copia la canción dentro de la app y la deja como sonido de alarma. */
export async function pickAlarmSound(): Promise<boolean> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return false;

  const asset = result.assets[0];
  const extension = asset.name.includes('.') ? asset.name.split('.').pop() : 'mp3';
  const fileName = `${filePrefix}${Date.now()}.${extension}`;
  const target = new File(Paths.document, fileName);
  new File(asset.uri).copy(target);

  const previous = useAlarmSound.getState().custom;
  useAlarmSound.getState().setCustom({ fileName, displayName: asset.name });
  removeStoredFile(previous?.fileName);
  return true;
}

export function resetAlarmSound() {
  const previous = useAlarmSound.getState().custom;
  useAlarmSound.getState().setCustom(null);
  removeStoredFile(previous?.fileName);
}
