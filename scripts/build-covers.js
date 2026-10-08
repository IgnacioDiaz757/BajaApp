// Genera las portadas cuadradas (320x320) de la grilla de juegos: assets/games/<juego>/cover.png.
// Se componen con los sprites de cada juego (escalado "nearest" para mantener el pixel art).
//
// Uso:  node scripts/build-covers.js

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const SIZE = 320;
const load = (game, file) => PNG.sync.read(fs.readFileSync(path.join(root, 'assets/games', game, file)));

function canvas() {
  return new PNG({ width: SIZE, height: SIZE });
}

function setPx(dst, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= dst.width || y >= dst.height) return;
  const i = (y * dst.width + x) * 4;
  const sa = a / 255;
  dst.data[i] = Math.round(r * sa + dst.data[i] * (1 - sa));
  dst.data[i + 1] = Math.round(g * sa + dst.data[i + 1] * (1 - sa));
  dst.data[i + 2] = Math.round(b * sa + dst.data[i + 2] * (1 - sa));
  dst.data[i + 3] = 255;
}

// Dibuja (sx, sy, sw, sh) de src en (dx, dy) escalado `scale` veces.
function blit(dst, src, dx, dy, scale, region) {
  const [sx, sy, sw, sh] = region || [0, 0, src.width, src.height];
  for (let y = 0; y < sh * scale; y++) {
    for (let x = 0; x < sw * scale; x++) {
      const i = ((sy + Math.floor(y / scale)) * src.width + sx + Math.floor(x / scale)) * 4;
      if (src.data[i + 3]) setPx(dst, dx + x, dy + y, src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]);
    }
  }
}

function gradient(dst, top, bottom, yEnd = SIZE) {
  for (let y = 0; y < yEnd; y++) {
    const t = y / yEnd;
    for (let x = 0; x < SIZE; x++) setPx(dst, x, y, ...top.map((c, k) => Math.round(c + (bottom[k] - c) * t)));
  }
}

function rect(dst, x0, y0, w, h, r, g, b) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setPx(dst, x, y, r, g, b);
}

function save(game, png) {
  fs.writeFileSync(path.join(root, 'assets/games', game, 'cover.png'), PNG.sync.write(png));
  console.log(`${game}: cover.png`);
}

// Gato Soñador: recorte cuadrado del póster del proyecto.
function dreamcat() {
  const poster = PNG.sync.read(fs.readFileSync(path.join(root, 'assets/games/dreamcat/poster.png')));
  const out = canvas();
  blit(out, poster, 0, 0, 1, [250, 0, 320, 320]);
  save('dreamcat', out);
}

// Block Runner: cielo, nubes, sol, piso de ladrillos, el robot y unos pinchos.
function blockrunner() {
  const out = canvas();
  gradient(out, [128, 235, 255], [198, 255, 255]);
  blit(out, load('blockrunner', 'sprites/sun.png'), 232, 24, 7);
  const cloud = load('blockrunner', 'sprites/cloud.png');
  blit(out, cloud, 20, 50, 6);
  blit(out, cloud, 190, 120, 5);
  const wall = load('blockrunner', 'sprites/wall.png');
  for (let row = 0; row < 2; row++) for (let col = 0; col < 5; col++) blit(out, wall, col * 64, 256 + row * 64, 4);
  blit(out, load('blockrunner', 'sprites/hero.png'), 40, 176, 5, [0, 0, 16, 16]);
  blit(out, load('blockrunner', 'sprites/blade.png'), 214, 192, 4);
  save('blockrunner', out);
}

// Carrera: cielo, montañas, pasto, ruta en perspectiva, árboles y el auto del jugador.
function racing() {
  const out = canvas();
  gradient(out, [120, 190, 255], [200, 230, 255], 150);
  const mountains = load('racing', 'sprites/background.png');
  blit(out, mountains, -30, 104, 2);
  rect(out, 0, 168, SIZE, SIZE - 168, 70, 160, 70);
  // ruta: se ensancha hacia abajo
  for (let y = 168; y < SIZE; y++) {
    const t = (y - 168) / (SIZE - 168);
    const half = 12 + t * 140;
    rect(out, Math.round(160 - half), y, Math.round(half * 2), 1, 90, 90, 98);
    rect(out, Math.round(160 - half), y, Math.max(2, Math.round(half * 0.06)), 1, 235, 235, 235);
    rect(out, Math.round(160 + half) - Math.max(2, Math.round(half * 0.06)), y, Math.max(2, Math.round(half * 0.06)), 1, 235, 235, 235);
    if (Math.floor(t * 9) % 2 === 0) rect(out, Math.round(160 - half * 0.03), y, Math.max(2, Math.round(half * 0.06)), 1, 240, 220, 80);
  }
  const tree = load('racing', 'sprites/tree.png');
  blit(out, tree, -22, 96, 2);
  blit(out, tree, 214, 100, 2);
  blit(out, load('racing', 'sprites/car_ai_red.png'), 134, 196, 1);
  blit(out, load('racing', 'sprites/car_player.png'), 80, 232, 2);
  save('racing', out);
}

// Night Chase: noche en la ciudad, edificios con ventanas, ruta en perspectiva y el auto visto de atrás con luces de neón.
function nightchase() {
  const out = canvas();
  gradient(out, [8, 4, 24], [60, 14, 70], 200);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // edificios a ambos lados, con ventanas
  const skyline = [[0, 70, 60], [52, 40, 46], [96, 90, 40], [208, 60, 50], [250, 100, 36], [284, 50, 44]];
  for (const [x, top, w] of skyline) {
    rect(out, x, top, w, 200 - top, 6, 6, 10);
    for (let y = top + 8; y < 190; y += 12) {
      for (let wx = x + 5; wx < x + w - 6; wx += 9) if (rnd() > 0.45) rect(out, wx, y, 4, 6, 255, 240, 150);
    }
  }
  // suelo oscuro y ruta
  rect(out, 0, 200, SIZE, SIZE - 200, 12, 8, 24);
  for (let y = 170; y < SIZE; y++) {
    const t = (y - 170) / (SIZE - 170);
    const half = 10 + t * 160;
    rect(out, Math.round(160 - half), y, Math.round(half * 2), 1, 14, 14, 20);
    const edge = Math.max(2, Math.round(half * 0.04));
    rect(out, Math.round(160 - half), y, edge, 1, 0, 230, 255);
    rect(out, Math.round(160 + half) - edge, y, edge, 1, 0, 230, 255);
    if (Math.floor(t * 8) % 2 === 0) rect(out, Math.round(160 - half * 0.02), y, Math.max(2, Math.round(half * 0.04)), 1, 120, 120, 130);
  }
  // auto enemigo lejano
  rect(out, 196, 206, 38, 14, 90, 0, 0);
  rect(out, 200, 212, 8, 4, 255, 30, 60);
  rect(out, 222, 212, 8, 4, 255, 30, 60);
  // batimóvil
  rect(out, 96, 246, 128, 34, 8, 8, 10);
  rect(out, 118, 226, 84, 24, 14, 14, 18);
  rect(out, 132, 214, 56, 16, 20, 20, 26);
  rect(out, 104, 252, 20, 8, 255, 30, 60);
  rect(out, 196, 252, 20, 8, 255, 30, 60);
  rect(out, 100, 244, 120, 3, 0, 230, 255);
  rect(out, 86, 268, 28, 32, 3, 3, 3);
  rect(out, 206, 268, 28, 32, 3, 3, 3);
  rect(out, 142, 262, 36, 10, 0, 170, 255);
  save('nightchase', out);
}

// Sky Flap: cielo, colinas, tuberías de arcilla, piso y el pájaro coral.
function skyflap() {
  const out = canvas();
  gradient(out, [78, 192, 202], [184, 236, 240]);
  const ellipse = (cx, cy, rx, ry, r, g, b) => {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) setPx(out, cx + x, cy + y, r, g, b);
  };
  // nubes
  for (const [cx, cy] of [[70, 60], [250, 100]]) {
    ellipse(cx, cy, 30, 14, 255, 255, 255);
    ellipse(cx + 22, cy - 10, 24, 16, 255, 255, 255);
    ellipse(cx - 20, cy - 4, 18, 11, 255, 255, 255);
  }
  // colinas
  ellipse(60, 262, 120, 56, 155, 226, 155);
  ellipse(250, 270, 110, 48, 111, 207, 106);
  // tuberías
  const pipe = (x, top, bottom) => {
    const dark = [90, 42, 12];
    rect(out, x, 0, 64, top, ...dark);
    rect(out, x + 3, 0, 58, top - 3, 255, 138, 61);
    rect(out, x + 8, 0, 14, top - 3, 255, 176, 103);
    rect(out, x - 4, top - 24, 72, 24, ...dark);
    rect(out, x - 1, top - 21, 66, 18, 255, 138, 61);
    rect(out, x + 5, top - 21, 14, 18, 255, 176, 103);
    rect(out, x - 4, bottom, 72, 24, ...dark);
    rect(out, x - 1, bottom + 3, 66, 18, 255, 138, 61);
    rect(out, x + 5, bottom + 3, 14, 18, 255, 176, 103);
    rect(out, x, bottom + 24, 64, 260 - bottom, ...dark);
    rect(out, x + 3, bottom + 24, 58, 260 - bottom, 255, 138, 61);
    rect(out, x + 8, bottom + 24, 14, 260 - bottom, 255, 176, 103);
  };
  pipe(210, 90, 190);
  pipe(-30, 130, 230);
  // piso
  rect(out, 0, 262, SIZE, 58, 222, 216, 149);
  rect(out, 0, 262, SIZE, 14, 155, 225, 93);
  rect(out, 0, 260, SIZE, 3, 84, 56, 71);
  // pájaro
  const bx = 120, by = 150;
  ellipse(bx, by, 29, 24, 84, 56, 71);
  ellipse(bx, by, 26, 21, 255, 93, 115);
  ellipse(bx - 8, by + 5, 13, 8, 84, 56, 71);
  ellipse(bx - 8, by + 5, 11, 6, 255, 224, 229);
  ellipse(bx + 12, by - 9, 10, 10, 84, 56, 71);
  ellipse(bx + 12, by - 9, 8, 8, 255, 255, 255);
  ellipse(bx + 15, by - 9, 4, 4, 34, 34, 34);
  rect(out, bx + 14, by + 2, 24, 12, 84, 56, 71);
  rect(out, bx + 16, by + 4, 20, 8, 255, 210, 63);
  save('skyflap', out);
}

// Snake: tablero oscuro cuadriculado, la serpiente verde con ojos y una manzana.
function snake() {
  const out = canvas();
  const cell = 20;
  rect(out, 0, 0, SIZE, SIZE, 11, 18, 34);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 2 === 0) rect(out, x * cell, y * cell, cell, cell, 14, 23, 41);
  const disc = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) setPx(out, Math.round(cx + x), Math.round(cy + y), ...c); };
  // cuerpo: de la cola (abajo izquierda) a la cabeza (arriba derecha)
  const path = [[2, 13], [3, 13], [4, 13], [5, 13], [5, 12], [5, 11], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [9, 9], [9, 8], [9, 7], [10, 7], [11, 7], [12, 7]];
  path.forEach(([cx, cy], i) => {
    const t = i / (path.length - 1); // 1 en la cabeza: más clara que la cola
    const c = [34, 150, 70].map((v, k) => Math.round(v + ([74, 222, 128][k] - v) * t));
    rect(out, cx * cell + 2, cy * cell + 2, cell - 4, cell - 4, ...c);
  });
  // cabeza con ojos mirando a la derecha
  const [hx, hy] = path[path.length - 1];
  const cx = hx * cell + cell / 2, cy = hy * cell + cell / 2;
  for (const s of [-1, 1]) {
    disc(cx + 3, cy + s * 5, 4.2, [248, 250, 252]);
    disc(cx + 4.5, cy + s * 5, 2.2, [2, 6, 23]);
  }
  // manzana
  const ax = 14 * cell + cell / 2, ay = 7 * cell + cell / 2;
  disc(ax, ay, 12, [239, 68, 68]);
  disc(ax - 4, ay - 4, 3, [252, 165, 165]);
  rect(out, ax + 1, ay - 18, 9, 4, 74, 222, 128);
  save('snake', out);
}

dreamcat();
blockrunner();
racing();
nightchase();
skyflap();
snake();
