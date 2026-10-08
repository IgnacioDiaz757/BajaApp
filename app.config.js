const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

// Expo entrega el contenido de app.json en `config`; acá solo se agrega la clave de Google Maps (que viene del entorno).
// Importante: `config` se fusiona con el de app.json; si se reemplazara, se perdería
// ios.config.usesNonExemptEncryption (la respuesta de cifrado que pide App Store Connect).
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: { ...config.android?.config, ...(mapsKey ? { googleMaps: { apiKey: mapsKey } } : {}) },
  },
  ios: {
    ...config.ios,
    config: { ...config.ios?.config, ...(mapsKey ? { googleMapsApiKey: mapsKey } : {}) },
  },
});
