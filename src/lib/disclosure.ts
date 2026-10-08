import { Alert } from 'react-native';
import i18n from '../i18n';

/**
 * Aviso destacado antes de pedir la ubicación en segundo plano (lo exigen Google Play y la App Store).
 * Resuelve `true` si el usuario acepta continuar al permiso del sistema.
 */
export function confirmBackgroundLocationDisclosure(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      i18n.t('Ubicación en segundo plano'),
      i18n.t('Bajá usa tu ubicación aunque la app esté cerrada o la pantalla apagada, solo durante un viaje activo, para avisarte cuando estés por llegar a tu destino. No guarda tu recorrido ni lo comparte.'),
      [
        { text: i18n.t('Ahora no'), style: 'cancel', onPress: () => resolve(false) },
        { text: i18n.t('Aceptar'), onPress: () => resolve(true) },
      ],
      { cancelable: false },
    );
  });
}
