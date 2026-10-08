/*
 * Block Runner — runner infinito para Bajá.
 * Port a JavaScript de un runner de microStudio (MicroScript). Arte original generado por scripts/build-blockrunner-sprites.js.
 * Se ejecuta dentro de un WebView (celular) o un iframe (web). Sin dependencias.
 * Coordenadas del juego: origen en el centro, eje Y hacia arriba (como microStudio).
 * Tocar = saltar. Botón "Bajar" = caer rápido (era el click derecho).
 */
(function () {
  'use strict';

  var STR = window.STRINGS || {};
  function tr(key, fallback) { return STR[key] || fallback; }

  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var images = {};

  function post(message) {
    try {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
      else if (window.parent !== window) window.parent.postMessage(message, '*');
    } catch (e) { /* sin puente: se ignora */ }
  }

  // ---------- Vista ----------
  var S = 4, VW = 200, VH = 400, DPR = 1, PW = 0, PH = 0;
  var HERO_X = 0;               // x del héroe en el mundo (cerca del borde izquierdo)
  var GROUND_Y = -60;           // y (mundo) de la parte de arriba del piso
  function sx(wx) { return Math.round((wx + VW / 2) * S); }
  function sy(wy) { return Math.round((VH / 2 - wy) * S); }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 3);
    PW = Math.round(window.innerWidth * DPR);
    PH = Math.round(window.innerHeight * DPR);
    canvas.width = PW;
    canvas.height = PH;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    S = Math.max(1, Math.round(PW / 200));
    VW = PW / S;
    VH = PH / S;
    HERO_X = -VW / 2 + 48;
    GROUND_Y = Math.round(-VH * 0.12);
    ctx.imageSmoothingEnabled = false;
  }

  // Dibuja un sprite centrado en (x, y) del mundo, de ancho w.
  function sprite(name, x, y, w, frame, frames) {
    var img = images[name];
    if (!img) return;
    var fh = img.height / (frames || 1);
    var h = w * fh / img.width;
    ctx.drawImage(img, 0, (frame || 0) * fh, img.width, fh, sx(x - w / 2), sy(y + h / 2), Math.round(w * S), Math.round(h * S));
  }

  // ---------- Estado (main.ms) ----------
  var state = 'title'; // title | play | over
  var blades, passed, score, position, speed, heroY, heroVy, overTicks, newRecord, jumpHeld, dropHeld;

  // Un salto dura ~47 cuadros y se avanza (2 + speed) por cuadro: la separación mínima crece con la velocidad.
  function minGap() { return 52 * (2 + speed) + 40; }

  function init() {
    speed = 0.5;
    blades = [220, 220 + minGap(), 220 + 2 * minGap()];
    passed = [0, 0, 0];
    score = 0;
    position = 0;
    heroY = 0;
    heroVy = 0;
    overTicks = 0;
    newRecord = false;
  }

  function startGame() {
    init();
    state = 'play';
  }

  function gameOver() {
    state = 'over';
    overTicks = 0;
    var best = typeof window.BEST === 'number' ? window.BEST : 0;
    newRecord = score > best;
    if (newRecord) window.BEST = score;
    post({ type: 'gameover', score: score });
  }

  function update() {
    if (state === 'over') { overTicks++; return; }
    if (state !== 'play') return;

    position += 2;
    heroY = Math.max(0, heroY + heroVy);
    if (jumpHeld && heroY === 0) { heroVy = 7; post({ type: 'jump' }); }
    if (dropHeld && heroY > 0) heroVy = -7;
    heroVy -= 0.3;

    for (var i = 0; i < blades.length; i++) {
      if (blades[i] < position - 120) {
        // siempre detrás del último obstáculo y a una distancia que permita aterrizar y volver a saltar
        var farthest = Math.max.apply(null, blades);
        blades[i] = Math.max(position + 280 + Math.random() * 200, farthest + minGap() + Math.random() * 60);
        passed[i] = 0;
      }
      if (Math.abs(position - blades[i]) < 10) {
        if (heroY < 10) { gameOver(); return; }
        if (!passed[i]) { passed[i] = 1; score++; }
      }
    }

    position += speed;
    speed += 0.001; // más rápido cuanto más vivís
  }

  // ---------- Entrada ----------
  var btnDrop = null;
  var pointers = {};
  function inRect(p, r) { return r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }

  function refreshInput() {
    jumpHeld = false;
    dropHeld = false;
    for (var id in pointers) {
      if (inRect(pointers[id], btnDrop)) dropHeld = true;
      else jumpHeld = true;
    }
    if (keys.Space || keys.ArrowUp || keys.KeyW) jumpHeld = true;
    if (keys.ArrowDown || keys.KeyS) dropHeld = true;
  }
  var keys = {};
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
      if (state !== 'play' && !keys[e.code]) tapAction();
      e.preventDefault();
    }
    keys[e.code] = true;
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });

  function tapAction() {
    if (state === 'title') startGame();
    else if (state === 'over' && overTicks > 30) startGame();
  }

  canvas.addEventListener('pointerdown', function (e) {
    pointers[e.pointerId] = { x: e.clientX * DPR, y: e.clientY * DPR };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
    tapAction();
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (pointers[e.pointerId]) pointers[e.pointerId] = { x: e.clientX * DPR, y: e.clientY * DPR };
  });
  function release(e) { delete pointers[e.pointerId]; }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // ---------- Dibujo ----------
  function font(px) { return 'bold ' + Math.round(px * DPR) + 'px system-ui, -apple-system, Roboto, sans-serif'; }
  function text(str, x, y, px, color, align) {
    ctx.font = font(px);
    ctx.fillStyle = color;
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

  function render(now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    var g = ctx.createLinearGradient(0, 0, 0, PH);
    g.addColorStop(0, 'rgb(128,235,255)');
    g.addColorStop(1, 'rgb(198,255,255)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PW, PH);

    var topY = VH / 2; // borde superior del mundo visible
    sprite('sun', VW / 2 - 30, topY - 40, 20);
    var cloudOffset = state === 'play' || state === 'over' ? position % 120 : (now / 60) % 120;
    for (var c = -1; c < VW / 120 + 2; c++) sprite('cloud', -VW / 2 + c * 120 - cloudOffset + 120, topY - 90, 55);

    // piso: se repite hacia abajo hasta el borde de la pantalla
    var scroll = state === 'over' ? 0 : position % 40;
    for (var row = 0; GROUND_Y - 20 - row * 40 > -VH / 2 - 20; row++) {
      for (var i = -1; -VW / 2 + i * 40 < VW / 2 + 40; i++) sprite('wall', -VW / 2 + i * 40 + 20 - (row === 0 ? scroll : scroll), GROUND_Y - 20 - row * 40, 40);
    }

    if (state === 'over') {
      sprite('dead', HERO_X, GROUND_Y + 20, 40);
    } else {
      var name = heroY > 0 ? 'jump' : 'hero';
      var frame = name === 'hero' ? Math.floor(now / 1000 * 5 * (state === 'play' ? 1.6 : 0.6)) % 4 : 0;
      sprite(name, HERO_X, GROUND_Y + 20 + heroY, 40, frame, name === 'hero' ? 4 : 1);
    }
    for (var b = 0; b < blades.length; b++) {
      var bx = HERO_X + blades[b] - position;
      if (bx > -VW / 2 - 20 && bx < VW / 2 + 20) sprite('blade', bx, GROUND_Y + 10, 20);
    }

    if (state === 'over') {
      ctx.fillStyle = 'rgba(255,0,0,0.45)';
      ctx.fillRect(0, 0, PW, PH);
    }

    btnDrop = null;
    if (state === 'play') {
      text(String(score), PW / 2, 56 * DPR, 44, 'rgba(0,0,0,0.55)');
      // botón Bajar
      var w = 104 * DPR, h = 56 * DPR;
      btnDrop = { x: PW - w - 18 * DPR, y: PH - h - 28 * DPR, w: w, h: h };
      ctx.fillStyle = dropHeld ? 'rgba(16,32,31,0.8)' : 'rgba(16,32,31,0.5)';
      roundRect(btnDrop.x, btnDrop.y, w, h, 16 * DPR);
      ctx.fill();
      text('▼  ' + tr('Bajar', 'Drop'), btnDrop.x + w / 2, btnDrop.y + h / 2, 16, '#fff');
    } else {
      var best = typeof window.BEST === 'number' ? window.BEST : 0;
      var cy = PH * 0.36;
      if (state === 'title') {
        text('Block Runner', PW / 2, cy, 40, '#fff');
        text(tr('Saltá los pinchos', 'Jump over the spikes'), PW / 2, cy + 44 * DPR, 17, '#10201f');
        text(tr('Tocá para saltar', 'Tap to jump'), PW / 2, cy + 74 * DPR, 14, 'rgba(0,0,0,0.6)');
        if (best > 0) text(tr('Mejor puntaje', 'Best score') + '  ' + best, PW / 2, cy + 108 * DPR, 15, '#10201f');
        text(tr('Tocá para empezar', 'Tap to start'), PW / 2, PH * 0.78, 18, '#fff');
      } else {
        text(tr('FIN DEL JUEGO', 'GAME OVER'), PW / 2, cy, 36, '#fff');
        text(tr('Puntaje', 'Score') + '  ' + score, PW / 2, cy + 46 * DPR, 22, '#fff');
        text(newRecord ? tr('¡Nuevo récord!', 'New record!') : tr('Mejor puntaje', 'Best score') + '  ' + best, PW / 2, cy + 80 * DPR, 16, newRecord ? '#ffe36b' : '#fff');
        if (overTicks > 30) text(tr('Tocá para jugar de nuevo', 'Tap to play again'), PW / 2, PH * 0.78, 18, '#fff');
      }
    }
  }

  // ---------- Bucle: física a 60 Hz fijos ----------
  var STEP = 1000 / 60, acc = 0, last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    acc = Math.min(acc + (last ? now - last : STEP), STEP * 5);
    last = now;
    refreshInput();
    while (acc >= STEP) { acc -= STEP; update(); }
    render(now);
  }

  function start() {
    init();
    resize();
    window.addEventListener('resize', resize);
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
