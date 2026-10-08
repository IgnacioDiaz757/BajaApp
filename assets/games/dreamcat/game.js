/*
 * Gato Soñador (plataformas) para Bajá.
 * Port a JavaScript de un proyecto de microStudio (MicroScript).
 * Se ejecuta dentro de un WebView (celular) o un iframe (web). Sin dependencias.
 * Coordenadas del mundo: origen en el centro del nivel, eje Y hacia arriba (como microStudio).
 */
(function () {
  'use strict';

  var STR = window.STRINGS || {};
  function tr(key, fallback) { return STR[key] || fallback; }

  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var MAPS = window.MAPS || {};
  var images = {};

  function post(message) {
    try {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
      else if (window.parent !== window) window.parent.postMessage(message, '*');
    } catch (e) { /* sin puente: se ignora */ }
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function moveToward(cur, target, amount) {
    if (cur < target) return Math.min(target, cur + amount);
    if (cur > target) return Math.max(target, cur - amount);
    return cur;
  }
  function formatTime(t) {
    var tenths = Math.floor((t % 1) * 10);
    var seconds = Math.floor(t) % 60;
    return Math.floor(t / 60) + ':' + (seconds < 10 ? '0' : '') + seconds + '.' + tenths;
  }

  // ---------- Sprites (hojas verticales: los cuadros van apilados) ----------
  var ANIM = { cat_idle: [7, 6], cat_run: [4, 10], cat_jump: [1, 5], cat_climb: [2, 3], cat_sit: [8, 4] };

  function drawSprite(name, x, y, w, flip, frame) {
    var img = images[name];
    if (!img) return;
    var frames = (ANIM[name] || [1])[0];
    var fh = img.height / frames;
    var h = w * fh / img.width;
    var sx = Math.round(sxOf(x));
    var sy = Math.round(syOf(y));
    ctx.save();
    ctx.translate(sx, sy);
    if (flip < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, 0, frame * fh, img.width, fh, Math.round(-w * S / 2), Math.round(-h * S / 2), Math.round(w * S), Math.round(h * S));
    ctx.restore();
  }
  function animFrame(name, now) {
    var a = ANIM[name];
    return a && a[0] > 1 ? Math.floor(now / 1000 * a[1]) % a[0] : 0;
  }

  // ---------- Mapas: se prearman una vez en un canvas (rendimiento) ----------
  var maps = {};
  function buildMap(key) {
    var raw = MAPS[key];
    if (!raw || maps[key]) return maps[key];
    var names = raw.sprites.map(function (s) { return typeof s === 'string' ? s : ''; });
    var m = { w: raw.width, h: raw.height, bw: raw.block_width, bh: raw.block_height, data: raw.data, names: names };
    var layer = document.createElement('canvas');
    layer.width = m.w * m.bw;
    layer.height = m.h * m.bh;
    var lc = layer.getContext('2d');
    lc.imageSmoothingEnabled = false;
    for (var r = 0; r < m.h; r++) {
      for (var c = 0; c < m.w; c++) {
        var name = names[m.data[r * m.w + c]];
        if (!name) continue;
        var parts = name.split(':');
        var img = images[parts[0]];
        if (!img) continue;
        var dx = c * m.bw;
        var dy = (m.h - 1 - r) * m.bh; // la fila 0 es la de abajo
        if (parts[1]) {
          var xy = parts[1].split(',');
          lc.drawImage(img, +xy[0] * 16, +xy[1] * 16, 16, 16, dx, dy, m.bw, m.bh);
        } else {
          lc.drawImage(img, dx, dy, m.bw, m.bh);
        }
      }
    }
    m.layer = layer;
    maps[key] = m;
    return m;
  }
  function tileAt(m, gx, gy) {
    if (gx < 0 || gy < 0 || gx >= m.w || gy >= m.h) return '';
    return m.names[m.data[gy * m.w + gx]];
  }
  function is(name, prefix) { return name.indexOf(prefix) === 0; }

  // ---------- Vista: la pantalla se mide en "píxeles de juego"; S = píxeles reales por píxel de juego ----------
  var S = 4, VW = 270, VH = 480, DPR = 1, PW = 0, PH = 0, BAR = 0; // BAR: alto (px reales) de la franja de controles
  function sxOf(wx) { return (wx - camera.x + VW / 2) * S; }
  function syOf(wy) { return (VH / 2 - (wy - camera.y)) * S; }

  function drawLayer(layer, cx, cy, scale) {
    // cx, cy: centro de la capa en el mundo
    var w = layer.width * scale, h = layer.height * scale;
    var x = Math.round(sxOf(cx - w / 2));
    var y = Math.round(syOf(cy + h / 2));
    ctx.drawImage(layer, x, y, Math.round(w * S), Math.round(h * S));
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 3);
    PW = Math.round(window.innerWidth * DPR);
    PH = Math.round(window.innerHeight * DPR);
    canvas.width = PW;
    canvas.height = PH;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    // Los controles van en una franja propia abajo: el juego se ve completo por encima y nada queda tapado.
    var ctl = Math.min(76 * DPR, PW / 5);
    BAR = Math.round(ctl + 40 * DPR);
    var gameH = PH - BAR;
    S = Math.max(1, Math.round(Math.min(PW, gameH) / 260));
    VW = PW / S;
    VH = gameH / S;
    ctx.imageSmoothingEnabled = false;
  }

  // ---------- Entrada: teclado + botones táctiles ----------
  var keys = {};
  var pointers = {};
  var taps = [];
  var btn = {};

  window.addEventListener('keydown', function (e) {
    keys[e.code] = true;
    if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
    else if ((e.code === 'Enter' || e.code === 'Space') && state !== 'play') onTap(PW / 2, PH / 2);
    if (e.code.indexOf('Arrow') === 0 || e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });

  canvas.addEventListener('pointerdown', function (e) {
    var p = { x: e.clientX * DPR, y: e.clientY * DPR };
    pointers[e.pointerId] = p;
    taps.push(p);
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (pointers[e.pointerId]) pointers[e.pointerId] = { x: e.clientX * DPR, y: e.clientY * DPR };
  });
  function release(e) { delete pointers[e.pointerId]; }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  function inRect(p, r) { return r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }
  function held(name) {
    for (var id in pointers) if (inRect(pointers[id], btn[name])) return true;
    return false;
  }
  var input = { left: false, right: false, up: false, down: false };
  function readInput() {
    input.left = !!(keys.ArrowLeft || keys.KeyA) || held('left');
    input.right = !!(keys.ArrowRight || keys.KeyD) || held('right');
    input.up = !!(keys.ArrowUp || keys.KeyW || keys.Space) || held('up');
    input.down = !!(keys.ArrowDown || keys.KeyS) || held('down');
  }

  // ---------- Estado del juego ----------
  var SPAWNS = [null, [-470, -202, 1], [415, -202, -1], [-474, -10, 1], [-15, 6, -1]];
  var LEVELS = 4;
  var state = 'title'; // title | play | paused | end
  var level, player, camera, gameTimer, levelComplete, overlayAlpha, overlayTarget, newRecord;
  camera = { x: 0, y: 0, tx: 0, ty: 0 };

  function newGame() {
    player = {
      x: 0, y: 0, vx: 0, vy: 0, facing: 1, topSpeed: 2, size: 16, landed: true,
      jumpVelocity: 4.2, maxFall: 8, accel: 0.4, climbSpeed: 1, climbing: false,
    };
    gameTimer = 0;
    newRecord = false;
    setLevel(1);
    state = 'play';
  }

  function setLevel(num) {
    overlayAlpha = 2.5; // tarda en empezar a aclarar
    overlayTarget = 0;
    levelComplete = false;
    if (num > LEVELS) {
      endGame();
      return;
    }
    var map = buildMap('level' + num);
    level = {
      number: num,
      map: map,
      width: map.w * map.bw,
      height: map.h * map.bh,
      sky: buildMap('sky' + num),
      waterA: buildMap('water' + num + 'a'),
      waterB: buildMap('water' + num + 'b'),
    };
    player.x = SPAWNS[num][0];
    player.y = SPAWNS[num][1];
    player.facing = SPAWNS[num][2];
    player.vx = 0;
    player.vy = 0;
    snapCamera();
  }

  function endGame() {
    state = 'end';
    overlayTarget = 0.35;
    var best = typeof window.BEST === 'number' ? window.BEST : null;
    newRecord = best === null || gameTimer < best;
    if (newRecord) window.BEST = gameTimer;
    post({ type: 'finish', seconds: Math.round(gameTimer * 10) / 10 });
  }

  function togglePause() {
    if (state === 'play') { state = 'paused'; overlayTarget = 0.75; }
    else if (state === 'paused') { state = 'play'; overlayTarget = 0; }
  }

  function respawn() {
    var sp = SPAWNS[level.number];
    player.x = sp[0];
    player.y = sp[1];
    player.vx = 0;
    player.vy = 0;
  }

  // ---------- Cámara (camera.ms) ----------
  function snapCamera() {
    camera.tx = player.x;
    camera.ty = player.y;
    camera.x = player.x;
    camera.y = player.y;
    updateCamera();
    camera.x = camera.tx;
    camera.y = camera.ty;
  }
  function updateCamera() {
    var dragX = 25, dragY = 40, smoothing = 0.9;
    camera.tx = clamp(camera.tx, player.x - dragX, player.x + dragX);
    camera.ty = clamp(camera.ty, player.y - dragY, player.y + dragY);
    var xl = Math.max(0, level.width / 2 - VW / 2);
    var yl = Math.max(0, level.height / 2 - VH / 2);
    camera.tx = clamp(camera.tx, -xl, xl);
    camera.ty = clamp(camera.ty, -yl, yl);
    camera.x += (camera.tx - camera.x) * (1 - smoothing);
    camera.y += (camera.ty - camera.y) * (1 - smoothing);
    if (Math.abs(camera.tx - camera.x) < 0.2) camera.x = camera.tx;
    if (Math.abs(camera.ty - camera.y) < 0.2) camera.y = camera.ty;
  }

  // ---------- Jugador (player.ms) ----------
  function tileAtWorld(x, y) {
    var m = level.map;
    return tileAt(m, Math.floor((x + level.width / 2) / (level.width / m.w)), Math.floor((y + level.height / 2) / (level.height / m.h)));
  }

  function updatePlayer() {
    var here = tileAtWorld(player.x, player.y);
    player.climbing = (is(here, 'vine') || is(here, 'ladder')) && !player.landed;

    if (player.climbing) {
      player.vx = 0;
      if (input.left) player.vx -= player.climbSpeed / 3;
      if (input.right) player.vx += player.climbSpeed / 3;
      player.vy = 0;
      if (input.up) player.vy = player.climbSpeed;
      if (input.down) player.vy = -player.climbSpeed;
      var cell = ((player.x + level.width / 2) / (level.width / level.map.w)) % 1;
      player.facing = cell < 0.5 ? 1 : -1;
    } else {
      if (input.left) { player.facing = -1; player.vx -= player.accel; }
      if (input.right) { player.facing = 1; player.vx += player.accel; }
      player.vx = clamp(player.vx, -player.topSpeed, player.topSpeed);
      if (input.up && player.landed) player.vy = player.jumpVelocity;
    }

    physics();

    player.x = clamp(player.x, -level.width / 2 + 8, level.width / 2 - 8);
    levelComplete = is(tileAtWorld(player.x, player.y), 'goal');
  }

  function physics() {
    var m = level.map;
    if (!player.climbing) {
      player.vx *= 0.85;
      if (player.vx > -0.05 && player.vx < 0.05) player.vx = 0;
      player.vy -= 0.2;
      if (player.vy < -player.maxFall) player.vy = -player.maxFall;
    }
    var hw = level.width / 2, hh = level.height / 2;
    function ground(gx, gy) { return is(tileAt(m, gx, gy), 'ground'); }

    var oldTop = Math.floor((player.y + 4 + hh) / 16);
    var oldBottom = Math.floor((player.y - 6 + hh) / 16);
    var oldRight = Math.floor((player.x + 4 + hw) / 16 - 0.001);
    var oldLeft = Math.floor((player.x - 4 + hw) / 16);
    var newTop = Math.floor((player.y + player.vy + 4 + hh) / 16);
    var newBottom = Math.floor((player.y + player.vy - 6 + hh) / 16);
    var newRight = Math.floor((player.x + player.vx + 4 + hw) / 16);
    var newLeft = Math.floor((player.x + player.vx - 4 + hw) / 16);

    if (player.vy < 0 && (ground(oldLeft, newBottom) || ground(oldRight, newBottom))) {
      player.y = -hh + (newBottom + 1) * 16 + 6;
      player.vy = 0;
      player.landed = true;
    } else if (player.vy > 0 && (ground(oldLeft, newTop) || ground(oldRight, newTop))) {
      player.vy = 0;
    } else if (!player.climbing) {
      player.landed = false;
    }

    if (player.vx < 0 && (ground(newLeft, oldBottom) || ground(newLeft, oldTop))) {
      player.vx = 0;
      player.x = -hw + (newLeft + 1) * 16 + 4;
    } else if (player.vx > 0 && (ground(newRight, oldBottom) || ground(newRight, oldTop))) {
      player.vx = 0;
      player.x = -hw + newRight * 16 - 4;
    }

    player.x += player.vx;
    player.y += player.vy;

    if (player.y < -hh - 100) respawn(); // se cayó al mar
  }

  function drawPlayer(now) {
    var name, size = player.size;
    if (player.climbing) name = 'cat_climb';
    else if (player.vy > 0) { name = 'cat_jump'; size *= 1.1; }
    else if (player.vy < 0) name = 'cat_idle';
    else if (Math.abs(player.vx) > 0.5) name = 'cat_run';
    else name = 'cat_idle';
    var frame = name === 'cat_climb' && !input.up && !input.down ? 0 : animFrame(name, now);
    drawSprite(name, player.x, player.y, size, player.facing, frame);
  }

  // ---------- Dibujo ----------
  function font(px, bold) { return (bold === false ? '' : 'bold ') + Math.round(px * DPR) + 'px system-ui, -apple-system, Roboto, sans-serif'; }
  function text(str, x, y, px, color, align, bold) {
    ctx.font = font(px, bold);
    ctx.fillStyle = color || '#fff';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawWorld(now) {
    // cielo con parallax; se agranda si la pantalla es más alta que la imagen
    var sky = level.sky;
    var skyScale = Math.max(1, (VH + 220) / sky.layer.height, (VW + 360) / sky.layer.width);
    drawLayer(sky.layer, -camera.x / 3 + camera.x, -camera.y / 3 + camera.y, skyScale);
    drawLayer(level.map.layer, 0, 0, 1);
    drawPlayer(now);
    // agua animada, por delante del jugador
    var t = now;
    var h1 = Math.sin(t / 1000) * 3, h2 = Math.sin(t / 347) * 1.5;
    var x1 = (t / 100) % 16, x2 = (t / 72) % 16;
    drawLayer(level.waterA.layer, x1, -247 + h1, 1);
    drawLayer(level.waterB.layer, x2, -255 + h2, 1);
  }

  function drawEnd(now) {
    // escenario final: mapas de 10x5 celdas que se muestran a 400x200 y se escalan para cubrir la pantalla
    var sc = Math.max(VH / 200, VW / 400);
    var cw = 400 * sc, ch = 200 * sc;
    var shift = clamp(-140 * sc, -(cw - VW) / 2, (cw - VW) / 2); // centra al gato si sobra ancho
    function layer(m, dy) {
      ctx.drawImage(m.layer, Math.round((VW / 2 - cw / 2 + shift) * S), Math.round((VH / 2 - ch / 2 + dy * sc) * S), Math.round(cw * S), Math.round(ch * S));
    }
    layer(buildMap('end_sky'), 0);
    layer(buildMap('end_foreground'), 20);
    var img = images.cat_sit;
    if (img) {
      var fh = img.height / 8, f = animFrame('cat_sit', now);
      var w = 40 * sc, h = w * fh / img.width;
      ctx.drawImage(img, 0, f * fh, img.width, fh, Math.round((VW / 2 + 140 * sc + shift - w / 2) * S), Math.round((VH / 2 + 20 * sc - h / 2) * S), Math.round(w * S), Math.round(h * S));
    }
  }

  function drawButton(name, x, y, size, label) {
    btn[name] = { x: x, y: y, w: size, h: size };
    var down = held(name) || (name === 'left' && keys.ArrowLeft) || (name === 'right' && keys.ArrowRight) || (name === 'up' && keys.ArrowUp);
    ctx.globalAlpha = down ? 0.75 : 0.4;
    ctx.fillStyle = '#10201f';
    roundRect(x, y, size, size, size * 0.28);
    ctx.fill();
    ctx.lineWidth = 2 * DPR;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.globalAlpha = down ? 1 : 0.85;
    text(label, x + size / 2, y + size / 2 + size * 0.03, size * 0.42 / DPR, '#fff');
    ctx.globalAlpha = 1;
  }

  function drawHud() {
    var safeTop = 12 * DPR;
    var pad = 14 * DPR;
    // tiempo
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#000';
    roundRect(pad, safeTop, 112 * DPR, 30 * DPR, 15 * DPR);
    ctx.fill();
    ctx.globalAlpha = 1;
    text(formatTime(gameTimer), pad + 56 * DPR, safeTop + 15 * DPR, 15, '#fff');
    // nivel
    text(tr('Nivel', 'Level') + ' ' + level.number + '/' + LEVELS, PW / 2, safeTop + 15 * DPR, 13, '#fff');
    // pausa
    var ps = 38 * DPR;
    btn.pause = { x: PW - pad - ps, y: safeTop - 4 * DPR, w: ps, h: ps };
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#000';
    roundRect(btn.pause.x, btn.pause.y, ps, ps, ps / 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.fillRect(btn.pause.x + ps * 0.34, btn.pause.y + ps * 0.28, ps * 0.1, ps * 0.44);
    ctx.fillRect(btn.pause.x + ps * 0.56, btn.pause.y + ps * 0.28, ps * 0.1, ps * 0.44);

    // controles táctiles
    var size = Math.min(76 * DPR, PW / 5);
    var gap = 12 * DPR;
    var bottom = PH - BAR + (BAR - size) / 2;
    ctx.fillStyle = '#0b1514';
    ctx.fillRect(0, PH - BAR, PW, BAR);
    drawButton('left', pad, bottom, size, '◀');
    drawButton('right', pad + size + gap, bottom, size, '▶');
    drawButton('up', PW - pad - size, bottom, size, '▲');
    drawButton('down', PW - pad - size * 2 - gap, bottom, size, '▼');
  }

  function panel(lines, buttons) {
    // texto centrado sobre fondo oscurecido
    var cy = PH * 0.38;
    lines.forEach(function (l, i) { text(l.t, PW / 2, cy + i * 34 * DPR, l.px, l.color || '#fff', 'center', l.bold); });
    var by = cy + lines.length * 34 * DPR + 20 * DPR;
    buttons.forEach(function (b, i) {
      var w = Math.min(260 * DPR, PW - 48 * DPR), h = 52 * DPR;
      var x = PW / 2 - w / 2, y = by + i * (h + 14 * DPR);
      btn[b.id] = { x: x, y: y, w: w, h: h };
      ctx.fillStyle = b.primary ? '#18b88a' : 'rgba(255,255,255,0.14)';
      roundRect(x, y, w, h, 14 * DPR);
      ctx.fill();
      text(b.label, PW / 2, y + h / 2, 17, '#fff');
    });
  }

  function render(now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, PW, PH);
    btn = {};

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, PW, PH - BAR);
    ctx.clip();
    if (state === 'end') drawEnd(now);
    else drawWorld(now);
    ctx.restore();
    if (state === 'play') drawHud();

    if (overlayAlpha > 0) {
      ctx.globalAlpha = Math.min(1, overlayAlpha);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, PW, PH);
      ctx.globalAlpha = 1;
    }

    var best = typeof window.BEST === 'number' ? window.BEST : null;
    if (state === 'title') {
      panel([
        { t: tr('Gato Soñador', 'Dream Cat'), px: 34 },
        { t: tr('Aventura entre sueños', 'Adventure through dreams'), px: 17, bold: false, color: '#9fe8d2' },
        { t: tr('Guiá al gatito hasta las uvas moradas de cada nivel', 'Guide the kitten to the purple grapes on each level'), px: 13, bold: false, color: '#ddd' },
        { t: best !== null ? tr('Mejor tiempo', 'Best time') + '  ' + formatTime(best) : '', px: 14, bold: false, color: '#ddd' },
      ], [{ id: 'start', label: tr('Tocá para empezar', 'Tap to start'), primary: true }]);
    } else if (state === 'paused') {
      panel([
        { t: tr('Pausa', 'Paused'), px: 30 },
        { t: best !== null ? tr('Mejor tiempo', 'Best time') + '  ' + formatTime(best) : '', px: 14, bold: false, color: '#ddd' },
      ], [
        { id: 'resume', label: tr('Continuar', 'Resume'), primary: true },
        { id: 'restart', label: tr('Juego nuevo', 'New game') },
      ]);
    } else if (state === 'end') {
      panel([
        { t: tr('¡El gatito volvió a casa!', 'The kitten is back home!'), px: 24 },
        { t: tr('Tiempo', 'Time') + '  ' + formatTime(gameTimer), px: 18, bold: false },
        { t: newRecord ? tr('¡Nuevo récord!', 'New record!') : '', px: 16, color: '#ffd45e' },
      ], [{ id: 'restart', label: tr('Tocá para jugar de nuevo', 'Tap to play again'), primary: true }]);
    }
  }

  function onTap(x, y) {
    var p = { x: x, y: y };
    if (state === 'title') newGame();
    else if (state === 'play') { if (inRect(p, btn.pause)) togglePause(); }
    else if (state === 'paused') {
      if (inRect(p, btn.restart)) newGame();
      else if (inRect(p, btn.resume) || !btn.restart) togglePause();
    } else if (state === 'end') newGame();
  }

  // ---------- Bucle: física a 60 Hz fijos ----------
  var STEP = 1000 / 60, acc = 0, last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    acc = Math.min(acc + (last ? now - last : STEP), STEP * 5);
    last = now;

    while (taps.length) { var tp = taps.shift(); onTap(tp.x, tp.y); }
    while (acc >= STEP) {
      acc -= STEP;
      overlayAlpha = moveToward(overlayAlpha, overlayTarget, 0.05);
      if (state === 'play') {
        readInput();
        updatePlayer();
        updateCamera();
        gameTimer += 1 / 60;
        if (levelComplete) {
          post({ type: 'level', level: level.number });
          setLevel(level.number + 1);
        }
      }
    }
    render(now);
  }

  // ---------- Arranque ----------
  function start() {
    resize();
    window.addEventListener('resize', resize);
    // fondo del título: primer nivel
    player = { x: -470, y: -202, vx: 0, vy: 0, facing: 1, size: 16, landed: true, climbing: false };
    setLevel(1);
    overlayAlpha = 0.8;
    overlayTarget = 0.8;
    requestAnimationFrame(frame);
  }

  var names = Object.keys(window.SPRITES || {});
  var pending = names.length;
  names.forEach(function (name) {
    var img = new Image();
    img.onload = img.onerror = function () { if (--pending === 0) start(); };
    img.src = window.SPRITES[name];
    images[name] = img;
  });
  if (!names.length) start();
})();
