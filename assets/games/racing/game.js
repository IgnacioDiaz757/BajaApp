/*
 * Carrera de autitos (pseudo 3D) — versión vertical para Bajá.
 * Port a JavaScript del "Racing demo" de microStudio (ver README.md de esta carpeta).
 * Se ejecuta dentro de un WebView (celular) o un iframe (web). Sin dependencias.
 */
(function () {
  'use strict';

  var STR = window.STRINGS || {};
  function tr(key, fallback) { return STR[key] || fallback; }

  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var images = window.SPRITES || {};
  var pending = 0;
  var assets = {};

  function post(message) {
    try {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
      else if (window.parent !== window) window.parent.postMessage(message, '*');
    } catch (e) { /* sin puente: se ignora */ }
  }

  // ---------- Utilidades (util.ms) ----------
  function fmod(x, y) { return x - Math.floor(x / y) * y; }
  function lineToDistance(line) { return 10 / ((100 - line) + 1); }
  function distanceToLine(distance) { return 101 - 10 / distance; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ---------- Pista (track.ms) ----------
  var trackData = '===l===r===LR===RR==R=L=L=L======RR=RLR===';
  var trackDic = { l: -150, L: -300, r: 150, R: 300 };
  var trackValue = [];
  for (var ti = 0; ti < trackData.length; ti++) trackValue[ti] = trackDic[trackData[ti]] || 0;
  var TRACK_LEN = trackValue.length;

  function readTrack(x) {
    var i1 = Math.floor(x);
    var a = x - i1;
    var i2 = i1 + 1;
    var v1 = trackValue[((i1 % TRACK_LEN) + TRACK_LEN) % TRACK_LEN];
    var v2 = trackValue[((i2 % TRACK_LEN) + TRACK_LEN) % TRACK_LEN];
    a = a * a * (3 - 2 * a);
    return v1 * (1 - a) + v2 * a;
  }

  var DECOR = [
    { sprite: 'palm_tree', size: 2.5, ratio: 1, offset: 0 },
    { sprite: 'bush', size: 0.5, ratio: 1, offset: 2 },
    { sprite: 'rock_sml', size: 0.5, ratio: 0.5, offset: 0.2 },
    { sprite: 'rock_sml', size: 1, ratio: 0.5, offset: 0.2 },
    { sprite: 'tree', size: 2, ratio: 1.2, offset: 2 },
    { sprite: 'rock_sml', size: 1, ratio: 0.5, offset: 2 },
    { sprite: 'dead_bushes', size: 1, ratio: 0.25, offset: 2 },
    { sprite: 'rock_med1', size: 1, ratio: 1, offset: 1 }
  ];
  var RIGHT_TURN_SIGN = { sprite: 'right_turn', size: 0.75, ratio: 1, offset: 0 };
  var RIGHT_ARROW_SIGN = { sprite: 'sharp_right', size: 0.5, ratio: 0.67, offset: 0 };
  var LEFT_TURN_SIGN = { sprite: 'left_turn', size: 0.75, ratio: 1, offset: 0 };
  var LEFT_ARROW_SIGN = { sprite: 'sharp_left', size: 0.5, ratio: 0.67, offset: 0 };

  var leftObjects = [];
  var rightObjects = [];
  (function buildSideObjects() {
    function decor() {
      var o = DECOR[Math.floor(Math.pow(Math.random(), 2) * DECOR.length)];
      return { sprite: o.sprite, size: o.size, offset: o.offset * Math.random(), ratio: o.ratio };
    }
    for (var i = 0; i < TRACK_LEN * 10; i++) {
      if (Math.random() < 0.2) {
        var sign = null;
        if (readTrack(i / 10) > 200) sign = RIGHT_ARROW_SIGN;
        else if (readTrack(i / 10) < -200) sign = LEFT_ARROW_SIGN;
        else if (readTrack(i / 10 + 1) > 200) sign = RIGHT_TURN_SIGN;
        else if (readTrack(i / 10 + 1) < -200) sign = LEFT_TURN_SIGN;
        if (sign) { leftObjects[i] = sign; rightObjects[i] = sign; continue; }
      }
      if (Math.random() < 0.5) leftObjects[i] = decor();
      if (Math.random() < 0.5) rightObjects[i] = decor();
    }
  })();

  // ---------- Estado del juego ----------
  var RACE_LAPS = 3;
  var CAR_COLORS = ['green', 'blue', 'yellow', 'white', 'black', 'red'];

  var state = 'menu'; // menu | countdown | racing | finished
  var countdown = 0;
  var frame = 0;
  var speed = 0;
  var track = [];
  var horizon = 0;
  var position = TRACK_LEN - 1;
  var dist = 0;
  var x = 0;
  var dx = 0;
  var turn = 0;
  var left = 0;
  var right = 0;
  var invuln = 0;
  var shake = 0;
  var raceFrames = 0;
  var result = null;
  var aiCars = [];
  var clouds = [];

  function resetRace() {
    speed = 0;
    track = [];
    horizon = 0;
    position = TRACK_LEN - 1;
    dist = 0;
    x = 0;
    dx = 0;
    turn = 0;
    invuln = 0;
    shake = 0;
    raceFrames = 0;
    result = null;
    aiCars = [];
    for (var i = 10; i >= 1; i--) {
      aiCars.push({
        base: 120 - 240 * (i % 2),
        x: 120 - 240 * (i % 2),
        position: TRACK_LEN - 1 + i * 0.1,
        dist: i * 0.1,
        speed: 30 + i,
        color: CAR_COLORS[i % 6],
        phase: Math.random() * 6.28,
        freq: 0.012 + Math.random() * 0.012
      });
    }
    clouds = [
      { name: 'cloud_big', x: 120, y: 35, v: 0.02, size: 40 },
      { name: 'cloud_med', x: -120, y: 50, v: 0.04, size: 40 },
      { name: 'cloud_sml', x: 60, y: 70, v: 0.06, size: 40 }
    ];
  }
  resetRace();

  // ---------- Entrada ----------
  var keys = {};
  var pointers = {};

  function readInput() {
    var l = keys.ArrowLeft ? 1 : 0;
    var r = keys.ArrowRight ? 1 : 0;
    for (var id in pointers) {
      if (pointers[id] < canvas.clientWidth / 2) l = 1; else r = 1;
    }
    if (l && r) { l = 0; r = 0; }
    left = l; right = r;
  }

  function startOrRestart() {
    if (state === 'menu' || state === 'finished') {
      resetRace();
      state = 'countdown';
      countdown = 180; // 3 s
    }
  }

  window.addEventListener('keydown', function (e) {
    keys[e.key] = true;
    if (e.key === ' ' || e.key === 'Enter') startOrRestart();
  });
  window.addEventListener('keyup', function (e) { keys[e.key] = false; });
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    pointers[e.pointerId] = e.clientX;
    startOrRestart();
  });
  canvas.addEventListener('pointermove', function (e) { if (e.pointerId in pointers) pointers[e.pointerId] = e.clientX; });
  function release(e) { delete pointers[e.pointerId]; }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', release);

  // ---------- Actualización (update.ms) ----------
  function update() {
    frame++;
    readInput();

    if (state === 'countdown') {
      countdown--;
      if (countdown <= 0) { state = 'racing'; speed = 20; }
    }
    var driving = state === 'racing' || state === 'finished';
    if (state === 'finished') { left = 0; right = 0; }

    if (driving) {
      if (state === 'racing') speed += (60 - speed) * 0.002;
      else speed *= 0.985;
      if (left) dx += (-7 - dx) * 0.1; else if (right) dx += (7 - dx) * 0.1; else dx *= 0.9;
      if (left || right) speed *= 0.998;
      x += dx;
    }
    horizon -= turn * 0.02 * speed / 50;

    for (var ci = 0; ci < clouds.length; ci++) {
      var c = clouds[ci];
      c.x -= turn * 0.02 * speed / 50 * (1 + (c.y - 30) / 300);
      c.x += c.v;
      if (c.x > 100 + c.size) c.x -= 200 + c.size;
      else if (c.x < -100 - c.size) c.x += 200 + c.size;
    }

    var step = 0.02 * speed / 50;
    position += step;
    dist += step;
    if (driving) {
      x -= turn * 0.04 * speed * speed / 40 / 40;
      if (Math.abs(x) > 230) { speed *= 0.98; x *= 0.99; }
    }
    if (position >= TRACK_LEN) position -= TRACK_LEN;

    var moving = state === 'racing' || state === 'finished';
    for (var i = 0; i < aiCars.length; i++) {
      var a = aiCars[i];
      if (moving) {
        a.position += a.speed * 0.02 / 50;
        a.dist += a.speed * 0.02 / 50;
        if (a.position > TRACK_LEN) a.position -= TRACK_LEN;
      }
      a.x = clamp(a.base + Math.sin(frame * a.freq + a.phase) * 75, -190, 190);
    }

    if (invuln > 0) invuln--;
    if (shake > 0) shake--;

    if (state === 'racing') {
      raceFrames++;
      // Choques con los otros autos
      for (var k = 0; k < aiCars.length; k++) {
        var o = aiCars[k];
        var d = fmod(o.position - position + TRACK_LEN * 1.5, TRACK_LEN) - TRACK_LEN * 0.5;
        if (invuln <= 0 && d > -0.02 && d < 0.06 && Math.abs(o.x - x) < 55) {
          speed *= 0.45;
          invuln = 70;
          shake = 14;
          dx += (x >= o.x ? 1 : -1) * 8;
          post({ type: 'crash' });
        }
      }
      if (dist >= RACE_LAPS * TRACK_LEN) finishRace();
    }
  }

  function playerRank() {
    var rank = 1;
    for (var i = 0; i < aiCars.length; i++) if (aiCars[i].dist > dist) rank++;
    return rank;
  }

  function finishRace() {
    state = 'finished';
    var seconds = raceFrames / 60;
    var rank = playerRank();
    var best = typeof window.BEST === 'number' ? window.BEST : null;
    var record = rank === 1 && (best === null || seconds < best);
    if (record) window.BEST = seconds;
    result = { seconds: seconds, rank: rank, record: record };
    post({ type: 'finish', seconds: seconds, rank: rank });
  }

  // ---------- Dibujo ----------
  var W = 0, H = 0, S = 1, HH = 400, hx = 0, hy = 0, ky = 2.4;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    // Ancho lógico fijo de 200 unidades; el alto depende de la pantalla (vertical).
    S = canvas.width / 200;
    HH = canvas.height / S;
    hx = canvas.width / 2;
    hy = canvas.height * 0.4; // horizonte
    ky = (HH * 0.6) / 100; // alto extra del camino respecto del demo horizontal
    ctx.imageSmoothingEnabled = false;
  }
  window.addEventListener('resize', resize);

  var ox = 0, oy = 0; // sacudida
  function px(wx) { return hx + ox + wx * S; }
  function py(wy) { return hy + oy - wy * S; }

  function sprite(name, wx, wy, w, h) {
    var img = assets[name];
    if (!img || !img.naturalWidth) return;
    if (h === undefined) h = w * img.height / img.width;
    ctx.drawImage(img, px(wx) - w * S / 2, py(wy) - h * S / 2, w * S, h * S);
  }
  function rect(wx, wy, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(px(wx) - w * S / 2, py(wy) - h * S / 2, w * S, h * S);
  }
  function alpha(v) { ctx.globalAlpha = clamp(v, 0, 1); }

  function drawBackground() {
    ctx.fillStyle = 'rgb(255,179,28)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var sky = ctx.createLinearGradient(0, hy + oy, 0, 0);
    sky.addColorStop(0, 'rgb(255,198,255)');
    sky.addColorStop(1, '#4488cc');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, hy + oy);
    var h = fmod(horizon, 200);
    for (var o = -200; o <= 200; o += 200) sprite('background', o + h, 15, 200, 30);
    for (var i = 0; i < clouds.length; i++) {
      var c = clouds[i];
      alpha(0.5 + (c.y - 30) * 0.5 / 40);
      sprite(c.name, c.x, c.y * 1.7, c.size);
    }
    alpha(1);
  }

  function drawRoad() {
    var off = 0;
    var off2 = -x;
    var tt = 0;
    for (var i = 0; i <= 100; i++) {
      var d0 = lineToDistance(i);
      var d = position + d0;
      var width = 50 / d0;
      var t = readTrack(d);
      var road = (d * 100) % 10 < 5 ? 'road1' : 'road2';
      if (d % TRACK_LEN > TRACK_LEN - 0.1) {
        road = (d * 100) % 2 < 1 ? 'finishline1' : 'finishline2';
      } else if (d % TRACK_LEN > TRACK_LEN - 1) {
        road = (d * 100) % 10 < 8 ? 'road2' : 'startline';
      }
      tt += t * d0 * d0 * 0.005;
      off += tt;
      var lx = off + off2 * (100 - i) / 100;
      sprite(road, lx, ky * (-100 + i), width, ky + 0.8);
      track[i] = lx;
      if (i === 0) turn = t;
    }
  }

  function drawFog() {
    alpha(0.5);
    sprite('fog2', 0, 0, 200, HH / 14);
    alpha(1);
  }

  function drawCars() {
    alpha(1);
    for (var i = 0; i < aiCars.length; i++) {
      var c = aiCars[i];
      var d = c.position - position;
      if (d < -TRACK_LEN / 2) d += TRACK_LEN;
      if (d <= 0) continue;
      var scale = 1000 / (d * 120);
      var line = distanceToLine(d);
      var h = clamp(Math.floor(line), 0, 99);
      var a = line - Math.floor(line);
      var pxo = track[h] * (1 - a) + track[h + 1] * a;
      var car = readTrack(c.position);
      if (car + x - c.x > 100) car = 2; else if (car + x - c.x < -100) car = 0; else car = 1;
      var cx = c.x * scale * 0.012 + pxo;
      var cy = ky * (-100 + line) + scale / 4;
      rect(cx, cy - scale / 4 + 1, scale, scale / 8, 'rgba(0,0,0,.25)');
      sprite('car_ai_' + c.color + ['_left', '', '_right'][clamp(car, 0, 2)], cx, cy, scale, scale / 2);
    }
  }

  function drawSideObjects() {
    for (var i = 25; i >= 1; i--) {
      var pos = position * 10 + i;
      var index = Math.floor(pos);
      var lo = leftObjects[index % leftObjects.length];
      var ro = rightObjects[index % leftObjects.length];
      var distance = index - position * 10; // entre 0 y 25
      if (distance < 1) continue;
      var line = distanceToLine(distance / 10);
      var width = 50 / (distance / 10);
      var size = 1000 / (distance * 70) * 4;
      var h = clamp(Math.floor(line), 0, 99);
      var a = line - Math.floor(line);
      var sx = track[h] * (1 - a) + track[h + 1] * a;
      alpha(Math.exp(-distance * 0.01) * Math.min(1, (25 - i) * 0.2));
      var ground = ky * (line - 100);
      if (lo) {
        var sl = size * 2 * lo.size;
        sprite(lo.sprite, width * (0.65 + lo.offset) + sx, ground + sl / 2 * lo.ratio, sl, sl * lo.ratio);
      }
      if (ro) {
        var sr = size * 2 * ro.size;
        sprite(ro.sprite, -width * (0.65 + ro.offset) + sx, ground + sr / 2 * ro.ratio, sr, sr * ro.ratio);
      }
    }
    alpha(1);
  }

  function drawPlayerCar() {
    alpha(1);
    var bottom = ky * -100;
    var bob = Math.sin(position * 80) * (Math.abs(x) > 230 ? 1 : 0.25);
    if (invuln > 0 && Math.floor(invuln / 5) % 2 === 0) alpha(0.45);
    rect(0, bottom + 14 + bob, 92, 22, 'rgba(0,0,0,.3)');
    var car = turn > 100 ? 2 : turn < -100 ? 0 : 1;
    car += -left + right;
    var name = ['car_player_left', 'car_player', 'car_player_right'][clamp(car, 0, 2)];
    sprite(name, 0, bottom + 32 + bob, 92, 46);
    alpha(1);
  }

  function text(str, wx, wy, size, color, align) {
    ctx.fillStyle = color || '#fff';
    ctx.font = 'bold ' + Math.round(size * S) + 'px system-ui, sans-serif';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, px(wx), py(wy));
  }
  function outlined(str, wx, wy, size, color, align) {
    ctx.lineWidth = Math.max(2, size * S * 0.16);
    ctx.strokeStyle = 'rgba(0,0,0,.65)';
    ctx.font = 'bold ' + Math.round(size * S) + 'px system-ui, sans-serif';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeText(str, px(wx), py(wy));
    text(str, wx, wy, size, color, align);
  }
  function formatTime(seconds) {
    var m = Math.floor(seconds / 60);
    var s = seconds - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
  }

  function drawUI() {
    var top = HH * 0.4 - 14;
    var lap = Math.min(RACE_LAPS, Math.floor(dist / TRACK_LEN) + 1);
    outlined(tr('lap', 'Vuelta') + ' ' + lap + '/' + RACE_LAPS, -92, top, 9, '#fff', 'left');
    outlined(tr('pos', 'Puesto') + ' ' + playerRank() + '/' + (aiCars.length + 1), 92, top, 9, '#fff', 'right');
    outlined(formatTime(state === 'finished' && result ? result.seconds : raceFrames / 60), 0, top, 11, '#ffe27a', 'center');
    outlined(Math.floor(speed * 6.2) + ' km/h', 0, top - 15, 8, '#fff', 'center');

    // Flechas táctiles
    var ay = ky * -100 + 62;
    alpha(left ? 1 : 0.4);
    sprite('touch_arrow', -70, ay, 30, 30);
    alpha(right ? 1 : 0.4);
    ctx.save();
    ctx.translate(px(70), py(ay));
    ctx.scale(-1, 1);
    var img = assets.touch_arrow;
    if (img && img.naturalWidth) ctx.drawImage(img, -15 * S, -15 * S, 30 * S, 30 * S);
    ctx.restore();
    alpha(1);
  }

  function shade() {
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawOverlay() {
    if (state === 'menu') {
      shade();
      outlined(tr('title', 'Carrera'), 0, 46, 24, '#ffe27a');
      outlined(tr('tapStart', 'Tocá para empezar'), 0, 8, 10, '#fff');
      outlined(tr('howTo', 'Tocá izquierda o derecha para girar'), 0, -12, 7, '#cfe3ff');
      var best = typeof window.BEST === 'number' ? window.BEST : null;
      if (best !== null) outlined(tr('best', 'Mejor tiempo') + ': ' + formatTime(best), 0, -34, 8, '#ffe27a');
    } else if (state === 'countdown') {
      var n = Math.ceil(countdown / 60);
      outlined(String(n), 0, 40, 40, '#fff');
    } else if (state === 'finished' && result) {
      shade();
      outlined(tr('finished', '¡Carrera terminada!'), 0, 58, 13, '#ffe27a');
      outlined(tr('pos', 'Puesto') + ' ' + result.rank + '/' + (aiCars.length + 1), 0, 30, 16, '#fff');
      outlined(tr('time', 'Tiempo') + ': ' + formatTime(result.seconds), 0, 6, 10, '#fff');
      if (result.record) outlined(tr('record', '¡Nuevo récord!'), 0, -14, 10, '#7dffb0');
      outlined(tr('again', 'Tocá para jugar de nuevo'), 0, -40, 8, '#cfe3ff');
    }
  }

  function render() {
    ox = shake > 0 ? (Math.random() - 0.5) * shake * 0.4 * S : 0;
    oy = shake > 0 ? (Math.random() - 0.5) * shake * 0.4 * S : 0;
    drawBackground();
    drawRoad();
    drawFog();
    drawCars();
    drawSideObjects();
    drawPlayerCar();
    drawUI();
    drawOverlay();
  }

  // ---------- Bucle principal ----------
  var last = 0;
  var acc = 0;
  function loop(now) {
    if (!last) last = now;
    acc += Math.min(100, now - last);
    last = now;
    var steps = 0;
    while (acc >= 1000 / 60 && steps < 6) { update(); acc -= 1000 / 60; steps++; }
    render();
    requestAnimationFrame(loop);
  }

  function boot() {
    resize();
    post({ type: 'ready' });
    requestAnimationFrame(loop);
  }

  var names = Object.keys(images);
  pending = names.length;
  if (!pending) boot();
  names.forEach(function (name) {
    var img = new Image();
    img.onload = img.onerror = function () {
      assets[name] = img;
      pending--;
      if (pending === 0) boot();
    };
    img.src = images[name];
  });
})();
