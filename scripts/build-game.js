// Genera src/games/<juego>/html.ts: cada juego (HTML + JS + sprites en base64 + mapas) en un solo texto,
// listo para mostrarse en un WebView. Se corre cuando cambia assets/games/<juego>/ (game.js, sprites o maps).
//
// Uso:  node scripts/build-game.js            (todos los juegos)
//       node scripts/build-game.js dreamcat     (uno solo)

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const games = {
  racing: { exportName: 'racingHtmlTemplate' },
  dreamcat: { exportName: 'dreamcatHtmlTemplate' },
  blockrunner: { exportName: 'blockrunnerHtmlTemplate' },
  // Juegos con página propia (index.html). `vendor` lista las librerías de vendor/ que se incluyen para funcionar sin internet.
  skyflap: { exportName: 'skyflapHtmlTemplate', vendor: [] },
  snake: { exportName: 'snakeHtmlTemplate', vendor: [] },
  nightchase: {
    exportName: 'nightchaseHtmlTemplate',
    vendor: ['three.min', 'EffectComposer', 'RenderPass', 'ShaderPass', 'CopyShader', 'LuminosityHighPassShader', 'UnrealBloomPass'],
  },
};

function build(name) {
  const dir = path.join(root, 'assets/games', name);
  const gameJs = fs.readFileSync(path.join(dir, 'game.js'), 'utf8');

  const sprites = {};
  const spritesDir = path.join(dir, 'sprites');
  if (fs.existsSync(spritesDir)) {
    for (const file of fs.readdirSync(spritesDir).sort()) {
      if (!file.endsWith('.png')) continue;
      sprites[file.replace(/\.png$/, '')] = `data:image/png;base64,${fs.readFileSync(path.join(spritesDir, file)).toString('base64')}`;
    }
  }

  // Mapas opcionales (assets/games/<juego>/maps/*.json), re-serializados sin espacios.
  const mapsDir = path.join(dir, 'maps');
  const maps = {};
  if (fs.existsSync(mapsDir)) {
    for (const file of fs.readdirSync(mapsDir).sort()) {
      if (file.endsWith('.json')) maps[file.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(mapsDir, file), 'utf8'));
    }
  }
  const mapsScript = Object.keys(maps).length ? `<script>window.MAPS = ${JSON.stringify(maps)};</script>
` : '';
  const safe = (code) => code.replace(/<\/script>/g, '<\\/script>');

  let html;
  if (games[name].vendor) { // (los juegos con index.html propio declaran `vendor`, aunque esté vacío)
    // Página propia: el index.html del juego + configuración + librerías + game.js
    const vendor = games[name].vendor.map((f) => `<script>${safe(fs.readFileSync(path.join(dir, 'vendor', `${f}.js`), 'utf8'))}</script>`).join('\n');
    const scripts = `<script>/*__CONFIG__*/</script>\n${vendor}\n<script>${safe(gameJs)}</script>`;
    html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8').replace('<!--__SCRIPTS__-->', () => scripts);
  } else {
    html = `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html, body { margin: 0; height: 100%; background: #000; overflow: hidden; touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  canvas { display: block; image-rendering: pixelated; touch-action: none; }
</style></head>
<body><canvas id="c"></canvas>
<script>/*__CONFIG__*/</script>
<script>window.SPRITES = ${JSON.stringify(sprites)};</script>
${mapsScript}<script>${safe(gameJs)}</script>
</body></html>`;
  }

  const out = `// Archivo generado por scripts/build-game.js — no editar a mano.
export const ${games[name].exportName} = ${JSON.stringify(html)};
`;
  const outDir = path.join(root, 'src/games', name);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'html.ts'), out);
  console.log(`${name}: ${Object.keys(sprites).length} sprites, ${Object.keys(maps).length} mapas, ${(out.length / 1024).toFixed(0)} KB`);
}

const wanted = process.argv[2] ? [process.argv[2]] : Object.keys(games);
for (const name of wanted) {
  if (!games[name]) throw new Error(`Juego desconocido: ${name}. Opciones: ${Object.keys(games).join(', ')}`);
  build(name);
}
