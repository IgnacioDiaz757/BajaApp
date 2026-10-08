/*
 * Night Chase — persecución nocturna en 3D para Bajá.
 * Basado en un juego three.js r128 (incluido en vendor/ para funcionar sin internet).
 *
 * Cambios respecto al original:
 *  - Rendimiento: sin PointLights (eran 20), ventanas de edificios con una textura compartida (antes ~900 meshes),
 *    geometrías y materiales compartidos (antes se creaban y no se liberaban), sin backdrop-filter, HUD sin escrituras repetidas.
 *  - Lógica independiente de los FPS (todo escala con delta) y delta limitado al volver de segundo plano.
 *  - Falta agregada: pantalla de inicio, pausa (también al salir de la app), mejor puntaje, invulnerabilidad corta tras
 *    un choque, dificultad creciente (velocidad base y frecuencia de enemigos), reinicio completo, cámara adaptada a vertical.
 */
(function () {
  'use strict';

  var STR = window.STRINGS || {};
  function tr(key, fallback) { return STR[key] || fallback; }
  function $(id) { return document.getElementById(id); }

  function post(message) {
    try {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
      else if (window.parent !== window) window.parent.postMessage(message, '*');
    } catch (e) { /* sin puente: se ignora */ }
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-t]'), function (el) {
    var v = STR[el.getAttribute('data-t')];
    if (v) el.textContent = v;
  });

  var touch = ('ontouchstart' in window) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  if (touch) document.body.classList.add('touch');

  // ---------- Configuración y estado ----------
  var CONFIG = {
    laneWidth: 3.5,
    speed: { base: 0.5, max: 1.0, nitro: 2.2, current: 0.8 },
    nitro: { amount: 100, drain: 0.8, regen: 0.15 }, // por cuadro a 60 FPS
    camera: { shake: 0, fovBase: 70, fovNitro: 100 },
    cheats: { god: false, infinite: false, chaos: false },
  };
  var STATE = { mode: 'title', score: 0, lives: 6, discs: 3, ammoTimer: 0, fireCooldown: 0, playTime: 0, invuln: 0, spawnTimer: 0, cheatBuffer: '', randomCheatTriggered: false };
  var cheatTimers = { god: null, infinite: null, chaos: null };
  var cheatCountdown = null;
  var best = typeof window.BEST === 'number' ? window.BEST : 0;

  function k60(f, dt60) { return 1 - Math.pow(1 - f, dt60); } // factor de lerp por cuadro -> por delta

  // ---------- Escena ----------
  var stage = $('stage');
  var container = $('canvas-container');
  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020205, 0.012);

  var camera = new THREE.PerspectiveCamera(70, 1, 0.1, 600);
  camera.position.set(0, 3.5, 9);

  var renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.toneMapping = THREE.ReinhardToneMapping;
  container.appendChild(renderer.domElement);

  var bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 2.0, 0.6, 0.15);
  var composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  composer.addPass(bloomPass);

  var ambientLight = new THREE.AmbientLight(0x404040, 0.4);
  scene.add(ambientLight);
  var cityLight = new THREE.DirectionalLight(0x110022, 0.8);
  cityLight.position.set(10, 20, 10);
  scene.add(cityLight);

  // Con pantalla vertical el FOV vertical crece para que entren los 3 carriles
  function baseFov(aspect) {
    return Math.max(70, Math.min(110, 2 * Math.atan(0.7 / aspect) * 180 / Math.PI));
  }
  function resize() {
    var w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloomPass.setSize(w, h);
    camera.aspect = w / h;
    CONFIG.camera.fovBase = baseFov(camera.aspect);
    CONFIG.camera.fovNitro = CONFIG.camera.fovBase + 30;
    camera.fov = CONFIG.camera.fovBase;
    camera.updateProjectionMatrix();
  }

  // ---------- Materiales y geometrías compartidos ----------
  var roadMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.1, metalness: 0.9 });
  var neonBlue = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  var neonRed = new THREE.MeshBasicMaterial({ color: 0xff0033 });
  var streetLightMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  var poleMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  var headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
  var carPaintMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.3, metalness: 0.7 });
  var tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.1 });
  var stripeMat = new THREE.MeshBasicMaterial({ color: 0x555555 });

  var road = new THREE.Mesh(new THREE.PlaneGeometry(30, 400), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.z = -100;
  scene.add(road);

  var stripes = [];
  var stripeGeo = new THREE.PlaneGeometry(0.2, 5);
  for (var si = 0; si < 12; si++) {
    [-1, 1].forEach(function (side) {
      var s = new THREE.Mesh(stripeGeo, stripeMat);
      s.rotation.x = -Math.PI / 2;
      s.position.set(side * (CONFIG.laneWidth / 2 + 1.7), 0.01, -si * 10);
      scene.add(s);
      stripes.push(s);
    });
  }

  // Luz de farolas: un resplandor aditivo sobre la ruta (reemplaza a los PointLights, que eran muy caros)
  function glowTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,170,0,0.35)');
    grad.addColorStop(1, 'rgba(255,170,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  var glowMat = new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  var glowGeo = new THREE.PlaneGeometry(15, 15);

  var streetLights = [];
  var poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 10, 6);
  var armGeo = new THREE.CylinderGeometry(0.1, 0.1, 3, 6);
  var bulbGeo = new THREE.BoxGeometry(0.5, 0.2, 0.8);
  function createStreetLight(x, z) {
    var dir = x > 0 ? -1 : 1;
    var group = new THREE.Group();
    var pole = new THREE.Mesh(poleGeo, poleMat); pole.position.y = 5; group.add(pole);
    var arm = new THREE.Mesh(armGeo, poleMat); arm.rotation.z = -dir * Math.PI / 4; arm.position.set(dir, 9, 0); group.add(arm);
    var bulb = new THREE.Mesh(bulbGeo, streetLightMat); bulb.position.set(dir * 2.2, 9.5, 0); group.add(bulb);
    var glow = new THREE.Mesh(glowGeo, glowMat); glow.rotation.x = -Math.PI / 2; glow.position.set(dir * 5, 0.05, 0); group.add(glow);
    group.position.set(x, 0, z);
    scene.add(group);
    streetLights.push(group);
  }
  for (var li = 0; li < 10; li++) { createStreetLight(-8, -li * 40); createStreetLight(8, -li * 40 - 20); }

  // Edificios: una textura de fachada compartida (ventanas pintadas) en lugar de decenas de planos por edificio
  function facadeTexture(seed) {
    var c = document.createElement('canvas');
    c.width = 64; c.height = 128;
    var g = c.getContext('2d');
    g.fillStyle = '#050505';
    g.fillRect(0, 0, 64, 128);
    var rnd = seed;
    function r() { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; }
    for (var y = 0; y < 16; y++) {
      for (var x = 0; x < 8; x++) {
        if (r() > 0.45 && !(x === 0 && y === 0)) {
          g.fillStyle = r() > 0.2 ? '#ffffaa' : '#aaddff';
          g.fillRect(x * 8 + 2, y * 8 + 2, 4, 5);
        }
      }
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    return t;
  }
  var facadeMats = [11, 23, 37].map(function (seed) { return new THREE.MeshBasicMaterial({ map: facadeTexture(seed) }); });

  var buildings = [];
  function createBuilding(x, z) {
    var h = 20 + Math.random() * 50, w = 6 + Math.random() * 6, d = 6 + Math.random() * 6;
    var geo = new THREE.BoxGeometry(w, h, d);
    // El orden de caras es +x, -x, +y, -y, +z, -z (4 vértices cada una): se escalan las UV a la medida de cada cara
    var uv = geo.attributes.uv;
    for (var i = 0; i < uv.count; i++) {
      var face = Math.floor(i / 4);
      if (face === 2 || face === 3) { uv.setXY(i, 0, 0); continue; } // techo y piso: píxel oscuro
      var fw = face < 2 ? d : w;
      uv.setXY(i, uv.getX(i) * fw / 8, uv.getY(i) * h / 16);
    }
    var b = new THREE.Mesh(geo, facadeMats[Math.floor(Math.random() * facadeMats.length)]);
    b.position.set(x, h / 2, z);
    scene.add(b);
    buildings.push(b);
  }
  for (var bi = 0; bi < 30; bi++) {
    createBuilding(-22 - Math.random() * 15, -bi * 35);
    createBuilding(22 + Math.random() * 15, -bi * 35);
  }

  // ---------- Auto del jugador ----------
  var carGroup = new THREE.Group();
  (function buildCar() {
    var chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 3.8), carPaintMat); chassis.position.y = 0.6; carGroup.add(chassis);
    var armor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 1.8), carPaintMat); armor.position.set(0, 0.8, 0.5); carGroup.add(armor);
    var finGeo = new THREE.BoxGeometry(0.5, 0.2, 1.5);
    var lf = new THREE.Mesh(finGeo, carPaintMat); lf.position.set(1.4, 0.6, 1.2); lf.rotation.z = -0.2; lf.rotation.y = 0.2; carGroup.add(lf);
    var rf = new THREE.Mesh(finGeo, carPaintMat); rf.position.set(-1.4, 0.6, 1.2); rf.rotation.z = 0.2; rf.rotation.y = -0.2; carGroup.add(rf);
    var canopy = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.2, 4), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.8 }));
    canopy.rotation.x = -Math.PI / 2 - 0.1; canopy.position.set(0, 1.1, -0.2); canopy.scale.z = 0.8; carGroup.add(canopy);
    var burner = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 0.8, 12), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 }));
    burner.rotation.x = Math.PI / 2; burner.position.set(0, 0.6, 2.2); carGroup.add(burner);
    var hl = new THREE.BoxGeometry(0.6, 0.2, 0.1);
    var hl1 = new THREE.Mesh(hl, headlightMat); hl1.position.set(0.8, 0.7, -1.9); carGroup.add(hl1);
    var hl2 = new THREE.Mesh(hl, headlightMat); hl2.position.set(-0.8, 0.7, -1.9); carGroup.add(hl2);
    var fwGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.5, 16), rwGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.8, 16);
    var wheels = [
      [fwGeo, 1.4, 0.45, 1.2], [fwGeo, -1.4, 0.45, 1.2], [rwGeo, 1.0, 0.65, -1.2], [rwGeo, -1.0, 0.65, -1.2],
    ].map(function (w) {
      var m = new THREE.Mesh(w[0], tireMat); m.rotation.z = Math.PI / 2; m.position.set(w[1], w[2], w[3]); carGroup.add(m); return m;
    });
    carGroup.userData.wheels = wheels;
  })();
  var flame = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2.5, 8), new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.9 }));
  flame.rotation.x = Math.PI / 2; flame.position.set(0, 0.6, 3.5); flame.visible = false;
  carGroup.add(flame);
  scene.add(carGroup);

  var carLight = new THREE.SpotLight(0xffffcc, 15, 120, 0.6, 0.5, 1);
  carLight.position.set(0, 2, 0);
  carLight.target.position.set(0, 0, -20);
  scene.add(carLight);
  scene.add(carLight.target);

  // ---------- Enemigos, proyectiles y partículas ----------
  var enemies = [], projectiles = [], particles = [];
  var enemyMats = [0x660000, 0x111122].map(function (c) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, metalness: 0.6 }); });
  var cabinMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
  var eLower = new THREE.BoxGeometry(1.8, 0.5, 4.2), eCabin = new THREE.BoxGeometry(1.6, 0.5, 2.2);
  var eHood = new THREE.BoxGeometry(1.7, 0.1, 1.2), eTrunk = new THREE.BoxGeometry(1.7, 0.1, 0.8);
  var eTail = new THREE.BoxGeometry(0.4, 0.2, 0.1), eWheel = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12);

  function spawnEnemy() {
    if (enemies.length >= 8) return;
    var lane = Math.floor(Math.random() * 3) - 1;
    var mat = enemyMats[Math.floor(Math.random() * enemyMats.length)];
    var g = new THREE.Group();
    var lower = new THREE.Mesh(eLower, mat); lower.position.y = 0.5; g.add(lower);
    var cabin = new THREE.Mesh(eCabin, cabinMat); cabin.position.set(0, 1.0, -0.2); g.add(cabin);
    var hood = new THREE.Mesh(eHood, mat); hood.position.set(0, 0.8, 1.5); g.add(hood);
    var trunk = new THREE.Mesh(eTrunk, mat); trunk.position.set(0, 0.8, -1.8); g.add(trunk);
    var t1 = new THREE.Mesh(eTail, neonRed); t1.position.set(0.6, 0.7, -2.15); g.add(t1);
    var t2 = new THREE.Mesh(eTail, neonRed); t2.position.set(-0.6, 0.7, -2.15); g.add(t2);
    g.userData.wheels = [[0.9, 1.2], [-0.9, 1.2], [0.9, -1.2], [-0.9, -1.2]].map(function (p) {
      var w = new THREE.Mesh(eWheel, tireMat); w.rotation.z = Math.PI / 2; w.position.set(p[0], 0.35, p[1]); g.add(w); return w;
    });
    g.position.set(lane * CONFIG.laneWidth, 0, -250);
    scene.add(g);
    enemies.push(g);
  }

  var discGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 3);
  var particleGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
  var particleMats = {};
  function createExplosion(pos, color) {
    var mat = particleMats[color] || (particleMats[color] = new THREE.MeshBasicMaterial({ color: color }));
    for (var i = 0; i < 18; i++) {
      var m = new THREE.Mesh(particleGeo, mat);
      m.position.copy(pos);
      m.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() + 0.5, (Math.random() - 0.5) * 1.5);
      scene.add(m);
      particles.push(m);
    }
  }

  // ---------- HUD (solo se escribe el DOM cuando cambia el valor) ----------
  var cache = {};
  function setText(id, value) {
    if (cache[id] === value) return;
    cache[id] = value;
    $(id).textContent = value;
  }
  var lifePips = document.querySelectorAll('.life-pip');
  function updateLifeUI() {
    Array.prototype.forEach.call(lifePips, function (pip, i) { pip.classList.toggle('lost', i >= STATE.lives); });
  }
  function updateAmmo() {
    var c = $('ammo-container');
    c.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var pip = document.createElement('span');
      pip.className = i < STATE.discs ? 'ammo-pip' : 'ammo-pip empty';
      c.appendChild(pip);
    }
  }
  function setStatus() {
    var el = $('status-val');
    if (CONFIG.cheats.god) { el.textContent = tr('MODO DIOS', 'GOD MODE'); el.style.color = CONFIG.cheats.chaos ? '#ff00ff' : '#ffff00'; if (CONFIG.cheats.chaos) el.textContent = tr('MODO CAOS', 'CHAOS MODE'); }
    else { el.textContent = tr('EN LÍNEA', 'ONLINE'); el.style.color = '#00ff41'; }
  }

  // ---------- Cheats ----------
  function triggerCheat(type, name) {
    CONFIG.cheats[type] = true;
    if (type === 'chaos') { scene.fog.color.setHex(0x220033); ambientLight.color.setHex(0x00ff00); }
    setStatus();
    if (cheatTimers[type]) clearTimeout(cheatTimers[type]);
    var el = $('cheat-indicator');
    el.textContent = name + ' ACTIVATED [25s]';
    el.style.opacity = 1;
    var left = 25;
    clearInterval(cheatCountdown);
    cheatCountdown = setInterval(function () {
      left--;
      el.textContent = name + ' [' + left + 's]';
      if (left <= 0) clearInterval(cheatCountdown);
    }, 1000);
    cheatTimers[type] = setTimeout(function () {
      CONFIG.cheats[type] = false;
      if (type === 'chaos') { scene.fog.color.setHex(0x020205); ambientLight.color.setHex(0x404040); }
      setStatus();
      el.textContent = name + ' DEACTIVATED';
      setTimeout(function () { el.style.opacity = 0; }, 2000);
    }, 25000);
  }
  function resetCheats() {
    ['god', 'infinite', 'chaos'].forEach(function (t) { clearTimeout(cheatTimers[t]); CONFIG.cheats[t] = false; });
    clearInterval(cheatCountdown);
    $('cheat-indicator').style.opacity = 0;
    scene.fog.color.setHex(0x020205);
    ambientLight.color.setHex(0x404040);
    setStatus();
  }
  function checkCheats(text) {
    var s = text.toLowerCase();
    if (s.indexOf('shield') >= 0) { triggerCheat('god', 'GOD MODE'); return true; }
    if (s.indexOf('turbo') >= 0) { triggerCheat('infinite', 'INFINITE NITRO'); return true; }
    if (s.indexOf('chaos') >= 0) { triggerCheat('chaos', 'CHAOS MODE'); return true; }
    return false;
  }

  // ---------- Entrada ----------
  var keys = { left: false, right: false, boost: false };
  function fireWeapon() {
    if (STATE.mode !== 'play' || STATE.discs <= 0 || STATE.fireCooldown > 0) return;
    STATE.discs--;
    STATE.fireCooldown = 0.15;
    updateAmmo();
    var p = new THREE.Mesh(discGeo, neonBlue);
    p.rotation.x = Math.PI / 2;
    p.position.set(carGroup.position.x, 1, carGroup.position.z);
    scene.add(p);
    projectiles.push(p);
  }

  document.addEventListener('keydown', function (e) {
    if (e.target && e.target.tagName === 'INPUT') return; // se está escribiendo un código
    var k = e.key.toLowerCase();
    if (k === 'a' || k === 'arrowleft') keys.left = true;
    if (k === 'd' || k === 'arrowright') keys.right = true;
    if (k === ' ') { keys.boost = true; if (STATE.mode !== 'play') primaryAction(); e.preventDefault(); }
    if (k === 'f') fireWeapon();
    if (k === 'escape' || k === 'p') togglePause();
    STATE.cheatBuffer = (STATE.cheatBuffer + k).slice(-15);
    if (checkCheats(STATE.cheatBuffer)) STATE.cheatBuffer = '';
  });
  document.addEventListener('keyup', function (e) {
    var k = e.key.toLowerCase();
    if (k === 'a' || k === 'arrowleft') keys.left = false;
    if (k === 'd' || k === 'arrowright') keys.right = false;
    if (k === ' ') keys.boost = false;
  });

  // Botones táctiles (pointer events: multitoque y mouse con el mismo código)
  Array.prototype.forEach.call(document.querySelectorAll('#bar .btn'), function (btn) {
    var key = btn.getAttribute('data-key');
    function down(e) {
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
      btn.classList.add('down');
      if (key === 'fire') fireWeapon(); else keys[key] = true;
    }
    function up(e) {
      e.preventDefault();
      btn.classList.remove('down');
      if (key !== 'fire') keys[key] = false;
    }
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
  });

  var cheatPanel = $('mobile-cheat-panel'), cheatInput = $('mobile-cheat-input');
  $('mobile-cheat-trigger').addEventListener('click', function () { cheatPanel.style.display = 'flex'; cheatInput.value = ''; cheatInput.focus(); });
  $('close-mobile-cheat').addEventListener('click', function () { cheatPanel.style.display = 'none'; cheatInput.blur(); });
  cheatInput.addEventListener('input', function (e) { if (checkCheats(e.target.value)) e.target.value = ''; });

  // ---------- Flujo: inicio, pausa, fin, reinicio ----------
  function show(id, on) { $(id).classList.toggle('on', on); }

  function resetGame() {
    STATE.score = 0; STATE.lives = 6; STATE.discs = 3; STATE.ammoTimer = 0; STATE.fireCooldown = 0;
    STATE.playTime = 0; STATE.invuln = 0; STATE.spawnTimer = 0; STATE.randomCheatTriggered = false;
    CONFIG.speed.base = 0.5; CONFIG.speed.current = CONFIG.speed.base; CONFIG.nitro.amount = 100; CONFIG.camera.shake = 0;
    playerX = 0; playerVelX = 0; carGroup.position.x = 0; carGroup.visible = true;
    enemies.forEach(function (e) { scene.remove(e); }); enemies.length = 0;
    projectiles.forEach(function (p) { scene.remove(p); }); projectiles.length = 0;
    particles.forEach(function (p) { scene.remove(p); }); particles.length = 0;
    resetCheats();
    updateLifeUI();
    updateAmmo();
  }

  function startGame() {
    resetGame();
    STATE.mode = 'play';
    show('start-screen', false); show('game-over-screen', false); show('pause-screen', false);
  }
  function primaryAction() {
    if (STATE.mode === 'title' || STATE.mode === 'over') startGame();
    else if (STATE.mode === 'paused') togglePause();
  }
  function togglePause() {
    if (STATE.mode === 'play') { STATE.mode = 'paused'; keys.left = keys.right = keys.boost = false; show('pause-screen', true); }
    else if (STATE.mode === 'paused') { STATE.mode = 'play'; show('pause-screen', false); }
  }
  function gameOver() {
    STATE.mode = 'over';
    var score = Math.floor(STATE.score);
    var record = score > best;
    if (record) best = window.BEST = score;
    $('go-score').textContent = tr('Puntaje', 'Score') + '  ' + score;
    $('go-record').textContent = record ? tr('¡Nuevo récord!', 'New record!') : tr('Mejor puntaje', 'Best score') + '  ' + best;
    show('game-over-screen', true);
    post({ type: 'gameover', score: score, seconds: Math.round(STATE.playTime) });
  }

  $('start-btn').addEventListener('click', startGame);
  $('restart-btn').addEventListener('click', startGame);
  $('resume-btn').addEventListener('click', togglePause);
  $('pause-btn').addEventListener('click', togglePause);
  document.addEventListener('visibilitychange', function () { if (document.hidden && STATE.mode === 'play') togglePause(); });
  if (best > 0) $('start-best').textContent = tr('Mejor puntaje', 'Best score') + '  ' + best;

  // ---------- Bucle principal ----------
  var playerX = 0, playerVelX = 0;
  var clock = new THREE.Clock();
  var elapsed = 0;

  function animate() {
    requestAnimationFrame(animate);
    var delta = Math.min(clock.getDelta(), 0.05); // al volver de segundo plano no hay saltos
    var dt60 = delta * 60;
    var playing = STATE.mode === 'play';
    if (playing || STATE.mode === 'title') elapsed += delta;
    var time = elapsed;

    if (playing) {
      STATE.playTime += delta;
      STATE.fireCooldown = Math.max(0, STATE.fireCooldown - delta);
      STATE.invuln = Math.max(0, STATE.invuln - delta);
      // dificultad creciente: la velocidad base sube hasta CONFIG.speed.max y los enemigos aparecen más seguido
      CONFIG.speed.base = Math.min(CONFIG.speed.max, 0.5 + STATE.playTime * 0.003);
      STATE.spawnTimer -= delta;
      if (STATE.spawnTimer <= 0) { spawnEnemy(); STATE.spawnTimer = Math.max(0.6, 1.5 - STATE.playTime * 0.01); }
      if (STATE.discs < 3) {
        STATE.ammoTimer += delta;
        if (STATE.ammoTimer >= 2) { STATE.ammoTimer = 0; STATE.discs++; updateAmmo(); }
      }
      if (!STATE.randomCheatTriggered && STATE.playTime > 45) {
        STATE.randomCheatTriggered = true;
        var picks = [['god', 'AUTO: GOD MODE'], ['infinite', 'AUTO: INFINITE NITRO'], ['chaos', 'AUTO: CHAOS MODE']];
        var pick = picks[Math.floor(Math.random() * picks.length)];
        triggerCheat(pick[0], pick[1]);
      }
    }

    // El mundo avanza jugando; en el título avanza despacio de fondo; en pausa o fin queda quieto
    var worldSpeed = playing ? CONFIG.speed.current : (STATE.mode === 'title' ? 0.35 : 0);
    var move = worldSpeed * 80 * delta;
    carGroup.position.y = Math.sin(time * 20) * 0.02;

    stripes.forEach(function (s) { s.position.z += move; if (s.position.z > 20) s.position.z -= 120; });
    streetLights.forEach(function (sl) { sl.position.z += move; if (sl.position.z > 20) sl.position.z -= 400; });
    buildings.forEach(function (b) {
      b.position.z += move;
      if (b.position.z > 50) b.position.z = -600;
      if (CONFIG.cheats.chaos) { b.rotation.y += 0.02 * dt60; b.rotation.z = Math.sin(time * 5 + b.position.z) * 0.1; }
      else if (b.rotation.y !== 0 || b.rotation.z !== 0) {
        b.rotation.y *= Math.pow(0.9, dt60); b.rotation.z *= Math.pow(0.9, dt60);
        if (Math.abs(b.rotation.y) < 0.001 && Math.abs(b.rotation.z) < 0.001) { b.rotation.y = 0; b.rotation.z = 0; }
      }
    });

    var isBoosting = false;
    if (playing) {
      if (keys.left) playerVelX -= 60 * delta;
      if (keys.right) playerVelX += 60 * delta;
      playerVelX *= Math.pow(0.92, dt60);
      playerX += playerVelX * delta;
      var limit = CONFIG.laneWidth * 1.6;
      if (playerX > limit) { playerX = limit; playerVelX = 0; }
      if (playerX < -limit) { playerX = -limit; playerVelX = 0; }
      carGroup.position.x = playerX;
      carGroup.rotation.z = -playerVelX * 0.03;
      carGroup.rotation.y = -playerVelX * 0.015;
      carGroup.userData.wheels.forEach(function (w) { w.rotation.x += CONFIG.speed.current * 0.5 * dt60; });
      // parpadeo mientras dura la invulnerabilidad
      carGroup.visible = STATE.invuln <= 0 || Math.floor(STATE.invuln * 12) % 2 === 0;

      var nitroAvailable = CONFIG.nitro.amount > 0 || CONFIG.cheats.infinite;
      if (keys.boost && nitroAvailable) {
        isBoosting = true;
        CONFIG.speed.current += (CONFIG.speed.nitro - CONFIG.speed.current) * k60(0.08, dt60);
        if (!CONFIG.cheats.infinite) CONFIG.nitro.amount = Math.max(0, CONFIG.nitro.amount - CONFIG.nitro.drain * dt60);
        else CONFIG.nitro.amount = 100;
        CONFIG.camera.shake = 0.3;
        camera.fov += (CONFIG.camera.fovNitro - camera.fov) * k60(0.05, dt60);
      } else {
        CONFIG.speed.current += (CONFIG.speed.base - CONFIG.speed.current) * k60(0.04, dt60);
        if (!CONFIG.cheats.infinite) CONFIG.nitro.amount = Math.min(100, CONFIG.nitro.amount + CONFIG.nitro.regen * dt60);
        camera.fov += (CONFIG.camera.fovBase - camera.fov) * k60(0.05, dt60);
      }
      camera.updateProjectionMatrix();

      STATE.score += CONFIG.speed.current * 120 * delta;

      // enemigos
      for (var i = enemies.length - 1; i >= 0; i--) {
        var e = enemies[i];
        e.position.z += (CONFIG.speed.current * 80 - 25) * delta;
        e.userData.wheels.forEach(function (w) { w.rotation.x += 0.3 * dt60; });
        if (Math.random() < k60(0.01, dt60)) e.userData.targetX = (Math.random() - 0.5) * 8;
        if (e.userData.targetX !== undefined) e.position.x += (e.userData.targetX - e.position.x) * k60(0.05, dt60);
        if (CONFIG.cheats.chaos) { e.rotation.y += 0.1 * dt60; e.position.x += Math.sin(time * 10) * 0.1 * dt60; }

        if (Math.abs(e.position.z - carGroup.position.z) < 3.5 && Math.abs(e.position.x - carGroup.position.x) < 2.0) {
          if (CONFIG.cheats.god) {
            createExplosion(e.position, 0xffaa00);
            scene.remove(e); enemies.splice(i, 1);
            STATE.score += 100;
            continue;
          }
          if (STATE.invuln <= 0) {
            createExplosion(e.position, 0xff0000);
            STATE.lives--;
            STATE.invuln = 1.2;
            updateLifeUI();
            CONFIG.speed.current *= 0.5;
            CONFIG.camera.shake = 1.2;
            $('collision-warn').style.display = 'block';
            setTimeout(function () { $('collision-warn').style.display = 'none'; }, 500);
            e.position.z += 15;
            e.position.x += e.position.x > carGroup.position.x ? 4 : -4;
            e.rotation.y += Math.random();
            post({ type: 'hit' });
            if (STATE.lives <= 0) { gameOver(); break; }
          }
        }
        if (e.position.z > 20) { scene.remove(e); enemies.splice(i, 1); }
      }

      // discs
      for (var pi = projectiles.length - 1; pi >= 0; pi--) {
        var p = projectiles[pi];
        p.position.z -= 120 * delta;
        p.rotation.y += 15 * delta;
        var hit = false;
        for (var j = enemies.length - 1; j >= 0; j--) {
          if (p.position.distanceTo(enemies[j].position) < 3) {
            createExplosion(enemies[j].position, CONFIG.cheats.chaos ? 0xff00ff : 0xff5500);
            scene.remove(enemies[j]); enemies.splice(j, 1);
            hit = true;
            STATE.score += 500;
            break;
          }
        }
        if (hit || p.position.z < -300) { scene.remove(p); projectiles.splice(pi, 1); }
      }

      flame.visible = isBoosting;
      if (isBoosting) { flame.scale.set(1, 1 + Math.random() * 0.5, 1); carLight.intensity = 15 + Math.random() * 5; }
      else carLight.intensity = 15;
    }

    // partículas (siguen animándose aunque termine la partida)
    for (var qi = particles.length - 1; qi >= 0; qi--) {
      var q = particles[qi], v = q.userData.vel;
      q.position.x += v.x * dt60; q.position.y += v.y * dt60; q.position.z += v.z * dt60;
      v.y -= 0.02 * dt60;
      q.rotation.x += 0.1 * dt60;
      q.scale.multiplyScalar(Math.pow(0.92, dt60));
      if (q.scale.x < 0.01) { scene.remove(q); particles.splice(qi, 1); }
    }

    // HUD
    setText('time-val', STATE.playTime.toFixed(1));
    setText('score-val', String(Math.floor(STATE.score)));
    setText('speed-val', String(Math.floor(CONFIG.speed.current * 180)));
    var nitroScale = (CONFIG.nitro.amount / 100).toFixed(2);
    if (cache.nitro !== nitroScale) { cache.nitro = nitroScale; $('nitro-fill').style.transform = 'scaleX(' + nitroScale + ')'; }

    // cámara
    var shakeX = (Math.random() - 0.5) * CONFIG.camera.shake, shakeY = (Math.random() - 0.5) * CONFIG.camera.shake;
    CONFIG.camera.shake *= Math.pow(0.9, dt60);
    camera.position.x += (playerX * 0.4 + shakeX - camera.position.x) * k60(0.1, dt60);
    camera.position.y = 4 + shakeY + Math.abs(playerVelX) * 0.02;
    if (CONFIG.cheats.chaos) camera.position.x += (Math.random() - 0.5) * 0.2;
    camera.position.z = 9 + CONFIG.speed.current * 2;
    camera.lookAt(playerX * 0.1, 0, -20);

    composer.render();
  }

  window.addEventListener('resize', resize);
  resize();
  setStatus();
  updateLifeUI();
  updateAmmo();
  animate();
})();
