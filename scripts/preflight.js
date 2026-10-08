// Revisión previa a publicar en Google Play y App Store. Lista lo que todavía falta y termina con error (1)
// si hay algún bloqueante, para poder usarlo antes de cada compilación de producción.
//
// Uso:  npm run preflight

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const blockers = [];
const warnings = [];
const ok = [];
const check = (condition, good, bad, { warn = false } = {}) => {
  if (condition) ok.push(good);
  else (warn ? warnings : blockers).push(bad);
};

const app = JSON.parse(read('app.json')).expo;

// --- Identidad y versión
check(app.ios?.bundleIdentifier && app.ios.bundleIdentifier === app.android?.package, `Identificador ${app.android?.package}`, 'El identificador de iOS y Android debe existir y coincidir');
check(/^\d+\.\d+\.\d+$/.test(app.version), `Versión ${app.version}`, 'La versión debe tener el formato 1.0.0');
check(exists('eas.json'), 'eas.json presente', 'Falta eas.json');
check(app.ios?.config?.usesNonExemptEncryption === false, 'Cifrado declarado (usesNonExemptEncryption=false)', 'Falta ios.config.usesNonExemptEncryption');

// --- Íconos
const icon = PNG.sync.read(fs.readFileSync(path.join(root, app.icon)));
check(icon.width === 1024 && icon.height === 1024, 'Ícono 1024x1024', `El ícono debe ser 1024x1024 (es ${icon.width}x${icon.height})`);
check(!icon.alpha && !icon.data.some((v, i) => i % 4 === 3 && v !== 255), 'Ícono sin transparencia (iOS)', 'El ícono de iOS no puede tener transparencia');
for (const file of ['assets/android-icon-foreground.png', 'assets/android-icon-background.png', 'assets/android-icon-monochrome.png', 'assets/splash-icon.png', 'assets/notification-icon.png']) {
  check(exists(file), `${file} presente`, `Falta ${file}`);
}

// --- Permisos y sonidos
const blocked = app.android?.blockedPermissions ?? [];
for (const permission of ['RECORD_AUDIO', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE', 'SYSTEM_ALERT_WINDOW']) {
  check(blocked.includes(`android.permission.${permission}`), `Permiso ${permission} bloqueado`, `Conviene bloquear android.permission.${permission}`, { warn: true });
}
const badSounds = fs.readdirSync(path.join(root, 'assets/sounds')).filter((f) => !/^[a-z][a-z0-9_]*\.[a-z0-9]+$/.test(f));
check(badSounds.length === 0, 'Nombres de sonidos válidos para Android', `Nombres de sonido inválidos para Android (solo minúsculas, números y _): ${badSounds.join(', ')}`);

// --- Datos legales
const legal = JSON.parse(read('src/legal/config.json'));
const pending = Object.entries(legal).filter(([key, value]) => key !== '_comment' && typeof value === 'string' && /\[.*\]/.test(value)).map(([key]) => key);
check(pending.length === 0, 'Datos legales del titular completos', `Faltan datos en src/legal/config.json: ${pending.join(', ')} (después correr node scripts/build-legal.js)`);
for (const page of ['privacy', 'terms', 'delete-account', 'index']) check(exists(`docs/legal/${page}.html`), `docs/legal/${page}.html generado`, `Falta docs/legal/${page}.html (node scripts/build-legal.js)`);

// --- Variables de entorno
const env = exists('.env') ? read('.env') : '';
for (const name of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_GOOGLE_MAPS_KEY']) {
  const match = env.match(new RegExp(`^${name}=(.*)$`, 'm'));
  const value = match ? match[1].trim() : '';
  check(value && !/tu_|TU_|xxx/i.test(value), `${name} configurada`, `${name} está vacía o con el valor de ejemplo en .env (y cargala también en EAS: eas env:create)`);
}

// --- Contenido de las tiendas
check(exists('docs/store/FICHA.md'), 'Ficha de la tienda redactada (docs/store/FICHA.md)', 'Falta docs/store/FICHA.md', { warn: true });
const ignored = /^\.env$/m.test(read('.gitignore'));
check(ignored, '.env ignorado por git', '.env no está en .gitignore');

const print = (title, list, mark) => { if (list.length) { console.log(`\n${title}`); list.forEach((line) => console.log(`  ${mark} ${line}`)); } };
print('Listo', ok, '✔');
print('Advertencias', warnings, '!');
print('Bloqueantes', blockers, '✖');
console.log(`\n${blockers.length === 0 ? 'Sin bloqueantes.' : `${blockers.length} bloqueante(s) para publicar.`}`);
process.exit(blockers.length === 0 ? 0 : 1);
