// Genera los sprites (arte original) de Block Runner en assets/games/blockrunner/sprites/.
// Es arte propio: reemplaza al del proyecto de origen.
//
// Uso:  node scripts/build-blockrunner-sprites.js   y después   node scripts/build-game.js blockrunner

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const outDir = path.join(__dirname, '..', 'assets/games/blockrunner/sprites');
fs.mkdirSync(outDir, { recursive: true });

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];

// Dibuja un sprite desde texto: cada letra es un color de la paleta, '.' es transparente.
function fromRows(rows, palette) {
  const h = rows.length;
  const w = rows[0].length;
  const png = new PNG({ width: w, height: h });
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`fila ${y} mide ${row.length}, se esperaba ${w}`);
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const c = palette[ch];
      if (!c) throw new Error(`color desconocido "${ch}"`);
      png.data.set(c, (y * w + x) * 4);
    });
  });
  return png;
}

function save(name, png) {
  fs.writeFileSync(path.join(outDir, `${name}.png`), PNG.sync.write(png));
}

// Une cuadros en una tira vertical (como las hojas de microStudio)
function strip(frames) {
  const w = frames[0].width;
  const out = new PNG({ width: w, height: frames.reduce((s, f) => s + f.height, 0) });
  let y = 0;
  for (const f of frames) {
    f.data.copy(out.data, y * w * 4);
    y += f.height;
  }
  return out;
}

// ---------- Robot corredor (16x16) ----------
const robot = {
  o: hex('#1d3557'), // contorno
  g: hex('#c5d0dc'), // chapa clara
  G: hex('#8d9db0'), // chapa oscura
  c: hex('#00e5ff'), // visor
  w: hex('#ffffff'),
  y: hex('#ffd23f'), // antena
  r: hex('#ef476f'), // detalle rojo
};

const head = [
  '................',
  '.......yy.......',
  '.......oo.......',
  '....oooooooo....',
  '....oggggggo....',
  '....occwcccw....'.slice(0, 16),
  '....oggggggo....',
  '....oooooooo....',
];
const body = [
  '.....oGGGGo.....',
  '...ooGGrrGGoo...',
  '...oGoGGGGoGo...',
  '...ooooGGoooo...',
];
const legsRun1 = ['....oGo..oGo....', '...oGo....oGo...', '..ooo......ooo..', '................'];
const legsRun2 = ['.....oGooGo.....', '.....oGooGo.....', '.....ooo.ooo....', '................'];
const legsRun3 = ['....oGo..oGo....', '...oGo....oGo...', '...ooo....ooo...', '................'];
const legsJump = ['....oGo..oGo....', '....ooo..ooo....', '................', '................'];

const frame = (legs, bob = 0) => {
  const rows = [...head, ...body, ...legs];
  if (bob) { rows.unshift('................'); rows.pop(); }
  return fromRows(rows, robot);
};

save('hero', strip([frame(legsRun1), frame(legsRun2, 1), frame(legsRun3), frame(legsRun2)]));
save('jump', frame(legsJump));

// Robot derrotado: visor en X y antena caída
const dead = [
  '................',
  '................',
  '.....y..........',
  '.....oyy........',
  '....oooooooo....',
  '....oggggggo....',
  '....orgrgrgo....'.slice(0, 16),
  '....oggggggo....',
  '....oooooooo....',
  '.....oGGGGo.....',
  '...ooGGrrGGoo...',
  '...oGoGGGGoGo...',
  '...ooooGGoooo...',
  '....oGo..oGo....',
  '...ooo....ooo...',
  '................',
];
save('dead', fromRows(dead, robot));

// ---------- Pinchos (16x16): obstáculo ----------
const spikes = (() => {
  const png = new PNG({ width: 16, height: 16 });
  const dark = hex('#3a3f4b'), mid = hex('#9aa5b5'), light = hex('#e8eef5'), base = hex('#5b6577');
  const put = (x, y, c) => { if (x >= 0 && x < 16 && y >= 0 && y < 16) png.data.set(c, (y * 16 + x) * 4); };
  for (let y = 12; y < 16; y++) for (let x = 0; x < 16; x++) put(x, y, y === 12 ? light : base);
  // tres pinchos triangulares
  for (const cx of [3, 8, 13]) {
    for (let y = 1; y < 12; y++) {
      const half = Math.floor((y - 1) / 3);
      for (let x = cx - half; x <= cx + half; x++) put(x, y, x === cx - half ? dark : x === cx + half ? mid : light);
    }
  }
  return png;
})();
save('blade', spikes);

// ---------- Piso de ladrillos (16x16) ----------
const wall = (() => {
  const png = new PNG({ width: 16, height: 16 });
  const mortar = hex('#8a4b2a'), brickA = hex('#d9733a'), brickB = hex('#c4622c');
  const put = (x, y, c) => png.data.set(c, (y * 16 + x) * 4);
  for (let y = 0; y < 16; y++) {
    const row = Math.floor(y / 4);
    const offset = row % 2 === 0 ? 0 : 4;
    for (let x = 0; x < 16; x++) {
      const bx = (x + offset) % 8;
      const isMortar = y % 4 === 3 || bx === 7;
      put(x, y, isMortar ? mortar : ((x + offset) % 16 < 8 ? brickA : brickB));
    }
  }
  return png;
})();
save('wall', wall);

// ---------- Sol (8x8) y nube (16x8) ----------
save('sun', fromRows([
  '..yyyy..',
  '.yyyyyy.',
  'yyyyyyyy',
  'yyyyyyyy',
  'yyyyyyyy',
  'yyyyyyyy',
  '.yyyyyy.',
  '..yyyy..',
], { y: hex('#ffd23f') }));

save('cloud', fromRows([
  '................',
  '.....wwww.......',
  '...wwwwwwww.....',
  '..wwwwwwwwwwww..',
  '.wwwwwwwwwwwwww.',
  'wwwwwwwwwwwwwwww',
  '.wwwwwwwwwwwwww.',
  '................',
], { w: hex('#ffffff') }));

console.log('sprites de Block Runner generados en', outDir);
