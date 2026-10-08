# Bajá — Guía para publicar en Google Play y App Store

> Esta guía resume lo que piden las tiendas según cómo funciona hoy la app. Las políticas de Google y Apple cambian seguido: **verificá cada punto en la consola de cada tienda** antes de enviar. Los textos legales (`src/legal/`) son una base redactada para esta app y **conviene que los revise un abogado**.

## 0. Bloqueantes (sin esto no se puede publicar)

1. **Completar los datos del titular** en `src/legal/config.json` (nombre legal, domicilio, email público, ciudad de los tribunales, región de Supabase). Luego correr `node scripts/build-legal.js`.
2. **Publicar las páginas legales en una URL pública** (carpeta `docs/legal/`, p. ej. GitHub Pages). Necesitás:
   - URL de la política de privacidad → `privacy.html` (obligatoria en ambas tiendas).
   - URL de eliminación de cuenta → `delete-account.html` (Google Play la pide en el formulario de seguridad de datos).
   - URL de soporte (Apple la exige) → puede ser la misma página o un email.
3. **Ejecutar en Supabase (SQL Editor)**: `schema.sql`, `policies.sql` y `migration-store-release.sql` (en ese orden) (crea `delete_my_account` y cierra una política insegura de `shared_trips`).
4. **Supabase → Authentication**: activar *Anonymous sign-ins*, Google y Apple; agregar las URLs de retorno (`baja://auth-callback`); configurar un **SMTP propio** (el de prueba de Supabase tiene límite muy bajo y no sirve en producción).
5. **Probar el seguimiento en segundo plano en un teléfono real** con un development build (ver la sección de pruebas).
6. **Cuentas de desarrollador**: Google Play Console (pago único) y Apple Developer Program (pago anual).

## 0.5. Herramientas del proyecto

- `npm run preflight` — revisa la configuración y lista lo que todavía falta para publicar (devuelve error si hay bloqueantes). Correrlo antes de cada build de producción.
- `node scripts/build-icons.js` — regenera, a partir de `assets/logoapp.png`, el ícono, los íconos adaptativos de Android, el ícono de notificaciones y la pantalla de inicio nativa (`assets/`).
- `node scripts/build-legal.js` — regenera `docs/legal/` y `src/legal/` a partir de `src/legal/config.json`.
- `npm run build:games` — regenera los minijuegos y sus portadas.
- `node scripts/build-licenses.js` — regenera la lista de la pantalla “Código abierto”.
- Textos de la ficha de las tiendas (es/en/pt), cuestionarios y notas para el revisor: `docs/store/FICHA.md`.

## 1. Datos de la app (para los formularios)

| Dato | Detalle |
|---|---|
| Nombre | Bajá |
| Identificador | `com.bajaapp.mobile` (Android e iOS). **No se puede cambiar después de publicar.** |
| Categoría sugerida | Mapas y navegación / Viajes y local |
| Público | Mayores de 13 años. No es una app para niños. |
| Publicidad | No tiene |
| Compras | No tiene |
| Analítica / seguimiento | No tiene |
| Idiomas | Español, inglés, portugués |

## 2. Qué datos se recopilan (base para Seguridad de los datos y Privacidad de la app)

| Dato | Se guarda en servidor | Para qué | Opcional |
|---|---|---|---|
| Email, nombre, foto (si usa Google/Apple) | Sí (Supabase) | Cuenta | Sí (hay modo invitado) |
| Identificador de usuario (incluye el de invitado) | Sí | Cuenta y sincronización | No |
| Destinos, coordenadas del destino, historial de viajes y avisos | Sí | Funcionalidad de la app | No |
| Lugares favoritos | Sí | Funcionalidad de la app | Sí |
| Ubicación precisa del dispositivo | **No** (se procesa en el teléfono) | Calcular distancia y avisar | Sí, pero sin ella no hay avisos |
| Texto de búsqueda de direcciones | Se envía a OpenStreetMap (tercero) | Buscar direcciones | Sí |

Recomendación conservadora para los formularios: **declarar la ubicación como recopilada** (precisa) para “funcionalidad de la app”, porque se guardan coordenadas de destino y distancias derivadas de la ubicación. Todo se transmite cifrado (HTTPS). El usuario puede pedir la eliminación (en la app y por web). No se usa para publicidad ni se vende.

## 3. Google Play

- **Política de privacidad y eliminación de cuenta**: cargar las URLs del punto 0.
- **Seguridad de los datos**: completar con la tabla de la sección 2.
- **Permiso de ubicación en segundo plano** (`ACCESS_BACKGROUND_LOCATION`): Play exige una declaración con justificación y un **video corto** que muestre la función principal (avisar con la pantalla apagada) y el aviso destacado previo. La app ya muestra ese aviso antes de pedir el permiso (`src/lib/disclosure.ts`).
- **Servicio en primer plano de ubicación** (`FOREGROUND_SERVICE_LOCATION`): también se declara en *Contenido de la app*; mismo video.
- **Permisos que quedan en el manifiesto**: ubicación (fina, aproximada y en segundo plano), servicio en primer plano, notificaciones, vibración, internet. Se **quitaron** micrófono y almacenamiento.
- **Clasificación de contenido** (cuestionario), **público objetivo** (13+), **sin anuncios**.
- **Material de la ficha**: ícono 512×512, gráfico de funciones 1024×500, capturas de teléfono, descripción corta y larga.
- **Cuentas personales nuevas**: Google suele exigir una **prueba cerrada con un mínimo de testers durante 14 días** antes de pasar a producción. Verificá los números actuales en la consola.
- Compilación: `eas build --platform android --profile production` (genera el AAB). El `eas.json` ya está creado.

## 4. App Store

- **App Store Connect**: crear la app con el identificador `com.bajaapp.mobile`; cargar URL de privacidad y de soporte.
- **Etiquetas de privacidad (Nutrition Labels)**: info de contacto (email, nombre), identificadores (ID de usuario), ubicación, contenido del usuario / actividad — todo “vinculado al usuario”, para “funcionalidad de la app”; **“no se usa para rastrearte”**.
- **Inicio de sesión (guideline 4.8)**: la app ofrece Google, por lo que debe ofrecer Sign in with Apple (ya está). Falta configurar el *Services ID* de Apple en Supabase. Para el envío conviene pasar a Sign in with Apple **nativo** (`expo-apple-authentication`).
- **Eliminación de cuenta (5.1.1(v))**: ya está en Perfil > Eliminar cuenta.
- **Ubicación en segundo plano**: explicar en las *notas de revisión* para qué se usa (avisar al pasajero con la pantalla apagada) y que solo corre durante un viaje activo. Los textos de permisos ya están en `app.json`.
- **Cifrado**: `ITSAppUsesNonExemptEncryption = false` ya configurado (solo usa HTTPS estándar).
- **Notas para el revisor** (importante): el revisor no se va a mover. Indicar: “Elegir *Continuar sin cuenta*; Perfil > Alertas > *Probar alarma* reproduce el aviso final. Para un viaje real, elegir un destino a menos de 2 km y marcar 2 km como distancia de aviso”.
- **iPad**: se desactivó `supportsTablet`, así que no hacen falta capturas de iPad.
- Capturas: 6,9" (obligatoria) y las que pida la consola. Compilación: `eas build --platform ios --profile production` y `eas submit`.

## 5. Antes de enviar a producción (técnico)

- `eas.json` ya existe (perfiles `development`, `preview`, `production`). Cargar `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` y `EXPO_PUBLIC_GOOGLE_MAPS_KEY` como variables de EAS. La clave anónima de Supabase es pública por diseño: la protección son las políticas RLS.
- **Restringir la clave de Google Maps** a la app (paquete + huella SHA-1) y a las APIs necesarias.
- **Buscador de direcciones**: hoy usa el servicio público de OpenStreetMap (Nominatim), cuya política limita el uso intensivo. Para producción con tráfico real, pasar a un servicio con contrato (p. ej. Google Places, Mapbox o un Nominatim propio).
- **Anti-abuso**: las cuentas de invitado se crean sin captcha; considerar limitar el ritmo en Supabase.
- **Compartir viaje**: cuando se implemente el enlace en vivo, **actualizar la política de privacidad** (qué se comparte, con quién y por cuánto tiempo) y volver a revisar el formulario de seguridad de los datos.
- Reemplazar los lugares de ejemplo de la búsqueda y revisar el ícono y la pantalla de inicio.

## 6. Pruebas mínimas antes de enviar

- Viaje real con el teléfono bloqueado en iOS **y** Android: llega el aviso previo, llega la alarma, tocar la notificación abre la pantalla de alarma.
- Android con ahorro de batería activado y con la app cerrada desde recientes.
- Registro, inicio de sesión (email, Google, Apple), modo invitado, cierre de sesión y **eliminar cuenta** (verificar que desaparecen los datos en Supabase).
- Idioma y tema: cambiar en vivo y reiniciar la app.
- Sin internet y con GPS desactivado.
