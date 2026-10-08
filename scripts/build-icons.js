// Genera los íconos de la app (assets/*.png) a partir del logo original assets/logoapp.png:
// ícono de iOS/Play, íconos adaptativos de Android, ícono de notificaciones, pantalla de inicio nativa y favicon.
//
// El logo viene como un cuadrado redondeado sobre fondo blanco; las tiendas piden el ícono a pantalla completa
// (sin esquinas) y Android pide el símbolo y el fondo por separado. Por eso se separa el símbolo blanco del logo
// (usando el degradado verde ajustado a la imagen) y se vuelve a componer en cada formato.
//
// Uso:  node scripts/build-icons.js

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const assets = path.join(__dirname, '..', 'assets');
const src = PNG.sync.read(fs.readFileSync(path.join(assets, 'logoapp.png')));
const W = src.width;
const H = src.height;
const px = (x, y, c) => src.data[(y * W + x) * 4 + c];

// Zona del símbolo (pin + colectivo) dentro del logo, con un margen; todo lo de afuera es fondo.
const SYMBOL_BOX = { x0: 270, y0: 170, x1: 985, y1: 1060 };
const inSymbolBox = (x, y) => x >= SYMBOL_BOX.x0 && x <= SYMBOL_BOX.x1 && y >= SYMBOL_BOX.y0 && y <= SYMBOL_BOX.y1;

// 1) Ajusta el degradado del fondo: canal = a + b·x + c·y, por mínimos cuadrados sobre píxeles de fondo puro.
function fitGradient() {
  const rows = [];
  for (let y = 120; y < H - 120; y += 12) {
    for (let x = 120; x < W - 120; x += 12) {
      if (inSymbolBox(x, y)) continue;
      const r = px(x, y, 0), g = px(x, y, 1), b = px(x, y, 2);
      if (g > 80 && g < 210 && r < 60) rows.push([x / W, y / H, r, g, b]);
    }
  }
  const solve = (channel) => {
    // ecuaciones normales 3x3 para [1, x, y]
    const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const v = [0, 0, 0];
    for (const row of rows) {
      const f = [1, row[0], row[1]];
      for (let i = 0; i < 3; i++) {
        v[i] += f[i] * row[2 + channel];
        for (let j = 0; j < 3; j++) m[i][j] += f[i] * f[j];
      }
    }
    // eliminación de Gauss
    for (let i = 0; i < 3; i++) {
      let p = i;
      for (let r = i + 1; r < 3; r++) if (Math.abs(m[r][i]) > Math.abs(m[p][i])) p = r;
      [m[i], m[p]] = [m[p], m[i]];
      [v[i], v[p]] = [v[p], v[i]];
      for (let r = i + 1; r < 3; r++) {
        const k = m[r][i] / m[i][i];
        for (let c = i; c < 3; c++) m[r][c] -= k * m[i][c];
        v[r] -= k * v[i];
      }
    }
    const x = [0, 0, 0];
    for (let i = 2; i >= 0; i--) {
      let s = v[i];
      for (let j = i + 1; j < 3; j++) s -= m[i][j] * x[j];
      x[i] = s / m[i][i];
    }
    return x;
  };
  return { samples: rows.length, coef: [solve(0), solve(1), solve(2)] };
}
const gradient = fitGradient();
// color del fondo en coordenadas normalizadas (0..1) del lienzo
const bgAt = (u, v) => gradient.coef.map(([a, b, c]) => Math.max(0, Math.min(255, a + b * u + c * v)));

// 2) Máscara del símbolo: cuánto "blanco" hay en cada píxel respecto del fondo (canal rojo: el más sensible).
const mask = new Float32Array(W * H);
let bbox = { x0: W, y0: H, x1: 0, y1: 0 };
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (!inSymbolBox(x, y)) continue;
    const bg = bgAt(x / W, y / H);
    const a = Math.max(0, Math.min(1, (px(x, y, 0) - bg[0]) / (255 - bg[0])));
    mask[y * W + x] = a;
    if (a > 0.5) {
      bbox = { x0: Math.min(bbox.x0, x), y0: Math.min(bbox.y0, y), x1: Math.max(bbox.x1, x), y1: Math.max(bbox.y1, y) };
    }
  }
}
const symbol = { cx: (bbox.x0 + bbox.x1) / 2, cy: (bbox.y0 + bbox.y1) / 2, w: bbox.x1 - bbox.x0, h: bbox.y1 - bbox.y0 };

const maskAt = (x, y) => {
  // interpolación bilineal
  const x0 = Math.floor(x), y0 = Math.floor(y);
  if (x0 < 0 || y0 < 0 || x0 >= W - 1 || y0 >= H - 1) return 0;
  const fx = x - x0, fy = y - y0;
  const i = y0 * W + x0;
  return mask[i] * (1 - fx) * (1 - fy) + mask[i + 1] * fx * (1 - fy) + mask[i + W] * (1 - fx) * fy + mask[i + W + 1] * fx * fy;
};

function inRoundedSquare(u, v, radius) {
  const cx = Math.min(Math.max(u, radius), 1 - radius);
  const cy = Math.min(Math.max(v, radius), 1 - radius);
  return (u - cx) ** 2 + (v - cy) ** 2 <= radius * radius;
}

// 3) Composición. `symbolHeight`: alto del símbolo como fracción del lienzo.
//    bg: 'full' (a pantalla completa) | 'rounded' (cuadrado redondeado) | null (transparente)
//    ink: color del símbolo (null = no dibujarlo, para el fondo adaptativo)
function render(size, { symbolHeight, bg = 'full', ink = [255, 255, 255], radius = 0.224, dy = 0 }) {
  const png = new PNG({ width: size, height: size });
  const SS = 3;
  // píxeles del logo por píxel de salida
  const scale = (symbol.h / (symbolHeight * size));
  for (let py = 0; py < size; py++) {
    for (let pxl = 0; pxl < size; pxl++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const ox = pxl + (sx + 0.5) / SS;
          const oy = py + (sy + 0.5) / SS;
          const u = ox / size, v = oy / size;
          const sxLogo = symbol.cx + (ox - size / 2) * scale;
          const syLogo = symbol.cy + (oy - size / 2 - dy * size) * scale;
          const m = ink ? maskAt(sxLogo, syLogo) : 0;
          let layerA = 0;
          let base = null;
          if (bg === 'full') { base = bgAt(u, v); layerA = 1; }
          else if (bg === 'rounded' && inRoundedSquare(u, v, radius)) { base = bgAt(u, v); layerA = 1; }
          const outA = m + layerA * (1 - m);
          if (outA > 0) {
            const colorBase = base || [0, 0, 0];
            const inkColor = ink || [255, 255, 255];
            r += (inkColor[0] * m + colorBase[0] * layerA * (1 - m));
            g += (inkColor[1] * m + colorBase[1] * layerA * (1 - m));
            b += (inkColor[2] * m + colorBase[2] * layerA * (1 - m));
            a += outA;
          }
        }
      }
      const i = (py * size + pxl) * 4;
      const n = SS * SS;
      if (a > 0) {
        png.data[i] = Math.round(r / a);
        png.data[i + 1] = Math.round(g / a);
        png.data[i + 2] = Math.round(b / a);
        png.data[i + 3] = Math.round((a / n) * 255);
      }
    }
  }
  return png;
}

function save(name, png, { opaque = false } = {}) {
  const buffer = opaque ? PNG.sync.write(png, { colorType: 2, inputColorType: 6, inputHasAlpha: true }) : PNG.sync.write(png);
  fs.writeFileSync(path.join(assets, name), buffer);
  console.log(`${name} (${png.width}x${png.height})${opaque ? ' sin transparencia' : ''}`);
}

console.log(`Logo ${W}x${H}: degradado ajustado con ${gradient.samples} muestras; símbolo ${symbol.w}x${symbol.h}px`);

// iOS y Play: 1024, cuadrado, a pantalla completa y SIN transparencia (iOS aplica solo las esquinas redondeadas)
save('icon.png', render(1024, { symbolHeight: 0.64 }), { opaque: true });
// Android adaptativo: el símbolo debe quedar dentro del 66 % central
save('android-icon-background.png', render(512, { ink: null }));
save('android-icon-foreground.png', render(512, { symbolHeight: 0.56, bg: null }));
save('android-icon-monochrome.png', render(432, { symbolHeight: 0.56, bg: null, ink: [0, 0, 0] }));
// Pantalla de inicio nativa: cuadrado verde redondeado con el símbolo (igual a la pantalla de inicio de la app)
save('splash-icon.png', render(512, { symbolHeight: 0.62, bg: 'rounded' }));
// Ícono de notificaciones de Android: 96x96, todo blanco con transparencia
save('notification-icon.png', render(96, { symbolHeight: 0.86, bg: null }));
save('favicon.png', render(48, { symbolHeight: 0.66, bg: 'rounded' }));
