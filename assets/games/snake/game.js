/*
 * Snake (la serpiente) para Bajá. Basado en snake.html (Canvas 2D, sin dependencias).
 * Cambios: script normal (no módulo) y sin APIs recientes (roundRect, Array.at, ??, hsl moderno) para WebView viejos;
 * récord entregado por la app (window.BEST) y avisado con postMessage; textos traducibles (window.STRINGS);
 * swipe que responde apenas el dedo se mueve (antes recién al soltar) y vale en toda la pantalla; pausa al salir de la app.
 */
(function () {
  'use strict'

  const STR = window.STRINGS || {}
  function tr(key, fallback) { return STR[key] || fallback }
  document.querySelectorAll('[data-t]').forEach((el) => {
    const v = STR[el.getAttribute('data-t')]
    if (v) el.textContent = v
  })
  const isTouch = ('ontouchstart' in window) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  if (isTouch) document.body.classList.add('touch')

  function post(message) {
    try {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message))
      else if (window.parent !== window) window.parent.postMessage(message, '*')
    } catch (e) { /* sin puente: se ignora */ }
  }

  const canvas = document.querySelector('canvas')
  const context = canvas.getContext('2d')
  const $board = document.querySelector('#board')
  const $score = document.querySelector('#score')
  const $record = document.querySelector('#record')
  const $overlay = document.querySelector('.overlay')
  const $overlayTitle = $overlay.querySelector('h2')
  const $overlayText = $overlay.querySelector('p')
  const $overlayButton = $overlay.querySelector('button')

  // CONSTANTES
  const COLS = 20
  const ROWS = 20
  const INITIAL_LENGTH = 4
  const INITIAL_SPEED = 7 // pasos por segundo
  const MAX_SPEED = 20
  const SPEED_PER_FOOD = 0.5
  const MAX_QUEUED_DIRECTIONS = 3
  const SWIPE_THRESHOLD = 18 // píxeles mínimos para considerar un swipe

  const STATES = { READY: 'ready', PLAYING: 'playing', PAUSED: 'paused', OVER: 'over' }
  const DIRECTIONS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' }

  // event.code (posición física de la tecla): WASD funciona igual en cualquier distribución
  const KEY_TO_DIRECTION = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right'
  }

  // ESTADO
  let snake = []
  let direction = 'right'
  let directionQueue = []
  let food = null
  let score = 0
  let record = typeof window.BEST === 'number' ? window.BEST : 0
  let state = STATES.READY
  let lastFrameTime = 0
  let accumulator = 0

  function resetGame() {
    const startX = Math.floor(COLS / 2) - 2
    const startY = Math.floor(ROWS * 0.8)

    // La serpiente es un array de segmentos: la posición 0 es la cabeza
    snake = Array.from({ length: INITIAL_LENGTH }, (_, index) => ({ x: startX - index, y: startY }))

    direction = 'right'
    directionQueue = []
    score = 0
    accumulator = 0
    food = createFood()
    updateScoreboard()
  }

  function createFood() {
    // Se eligen al azar casillas libres: nunca aparece comida encima de la serpiente
    const occupied = new Set(snake.map(({ x, y }) => `${x},${y}`))
    const freeCells = []
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!occupied.has(`${x},${y}`)) freeCells.push({ x, y })
      }
    }
    if (freeCells.length === 0) return null
    return freeCells[Math.floor(Math.random() * freeCells.length)]
  }

  function getSpeed() {
    return Math.min(MAX_SPEED, INITIAL_SPEED + score * SPEED_PER_FOOD)
  }

  // Cola de direcciones: si el jugador gira dos veces dentro del mismo tick no se pierde el segundo giro
  // ni se permite un giro de 180º (cada dirección se compara con la ÚLTIMA encolada)
  function queueDirection(newDirection) {
    const lastDirection = directionQueue.length > 0 ? directionQueue[directionQueue.length - 1] : direction
    if (newDirection === lastDirection) return
    if (newDirection === OPPOSITE[lastDirection]) return
    if (directionQueue.length >= MAX_QUEUED_DIRECTIONS) return
    directionQueue.push(newDirection)
  }

  function isSameCell(a, b) { return a.x === b.x && a.y === b.y }
  function isOutside(p) { return p.x < 0 || p.y < 0 || p.x >= COLS || p.y >= ROWS }

  function step() {
    if (directionQueue.length > 0) direction = directionQueue.shift()

    const d = DIRECTIONS[direction]
    const head = { x: snake[0].x + d.x, y: snake[0].y + d.y }
    const willEat = food && isSameCell(head, food)

    // Si no come, la cola se mueve en este mismo paso: la cabeza SÍ puede entrar donde está la cola ahora
    const body = willEat ? snake : snake.slice(0, -1)

    if (isOutside(head) || body.some((segment) => isSameCell(segment, head))) {
      gameOver()
      return
    }

    // Mover = nueva cabeza (unshift) y quitar la cola (pop). Al comer no se quita: la serpiente crece
    snake.unshift(head)

    if (willEat) {
      score++
      bumpScore()
      post({ type: 'eat', score: score })
      food = createFood()
      if (!food) gameOver(true)
    } else {
      snake.pop()
    }
  }

  function gameOver(hasWon) {
    state = STATES.OVER

    const isNewRecord = score > record
    if (isNewRecord) record = window.BEST = score

    updateScoreboard()
    post({ type: 'gameover', score: score, won: !!hasWon })
    showOverlay({
      title: hasWon ? tr('¡Ganaste!', '¡Ganaste!') + ' 🏆' : tr('FIN DEL JUEGO', 'Game over'),
      text: tr('Puntaje', 'Puntaje') + ': ' + score + (isNewRecord ? ' · ' + tr('¡Nuevo récord!', '¡Nuevo récord!') : ' · ' + tr('Récord', 'Récord') + ': ' + record),
      button: tr('Jugar de nuevo', 'Jugar de nuevo'),
      isOver: true
    })
  }

  function startGame() {
    if (state === STATES.OVER) resetGame()
    state = STATES.PLAYING
    hideOverlay()
    $overlayButton.blur()
  }

  function pauseGame() {
    if (state !== STATES.PLAYING) return
    state = STATES.PAUSED
    showOverlay({
      title: tr('Pausa', 'Pausa'),
      text: isTouch ? tr('Tocá para continuar', 'Tocá para continuar') : 'Pulsa espacio para continuar',
      button: tr('Continuar', 'Continuar')
    })
  }

  function togglePause() {
    if (state === STATES.PLAYING) pauseGame()
    else startGame()
  }

  function showOverlay(o) {
    $overlayTitle.textContent = o.title
    $overlayText.textContent = o.text
    $overlayButton.textContent = o.button
    $overlay.classList.toggle('is-over', !!o.isOver)
    $overlay.hidden = false
  }

  function hideOverlay() {
    $overlay.hidden = true
  }

  function updateScoreboard() {
    $score.textContent = score
    $record.textContent = Math.max(score, record)
  }

  function bumpScore() {
    updateScoreboard()
    const $box = $score.parentElement
    $box.classList.remove('bump')
    void $box.offsetWidth // fuerza un reflow para reiniciar la animación
    $box.classList.add('bump')
  }

  // GAME LOOP: requestAnimationFrame ~60 veces por segundo; la serpiente da menos pasos. Se acumula el tiempo
  // y se da un paso cada vez que supera la duración de un tick
  function loop(now) {
    const delta = now - lastFrameTime
    lastFrameTime = now

    if (state === STATES.PLAYING) {
      // Si la app estuvo en segundo plano el delta puede ser enorme: se limita para no dar decenas de pasos de golpe
      accumulator = Math.min(accumulator + delta, 250)
      while (state === STATES.PLAYING && accumulator >= 1000 / getSpeed()) {
        accumulator -= 1000 / getSpeed()
        step()
      }
    }

    draw(now)
    window.requestAnimationFrame(loop)
  }

  // DIBUJO
  function resizeCanvas() {
    // Resolución interna = tamaño real en pantalla × devicePixelRatio (nítido en pantallas retina)
    const width = $board.getBoundingClientRect().width || 300
    $board.style.height = width + 'px' // respaldo si el WebView no soporta aspect-ratio
    const size = Math.round(width * (window.devicePixelRatio || 1))
    canvas.width = size
    canvas.height = size
  }

  function draw(now) {
    const cell = canvas.width / COLS
    drawBoard(cell)
    if (food) drawFood(cell, now)
    drawSnake(cell)
  }

  function drawBoard(cell) {
    context.fillStyle = '#0b1222'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#0e1729'
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if ((x + y) % 2 === 0) context.fillRect(x * cell, y * cell, cell, cell)
      }
    }
  }

  function drawFood(cell, now) {
    const pulse = 1 + Math.sin(now / 180) * 0.08
    const centerX = (food.x + 0.5) * cell
    const centerY = (food.y + 0.5) * cell
    const radius = cell * 0.32 * pulse

    context.save()
    context.shadowColor = '#f87171'
    context.shadowBlur = cell * 0.8
    context.fillStyle = '#ef4444'
    context.beginPath()
    context.arc(centerX, centerY, radius, 0, Math.PI * 2)
    context.fill()
    context.restore()

    // hojita
    context.fillStyle = '#4ade80'
    context.beginPath()
    context.ellipse(centerX + radius * 0.35, centerY - radius * 1.05, radius * 0.4, radius * 0.18, -0.6, 0, Math.PI * 2)
    context.fill()
  }

  // Rectángulo redondeado propio (context.roundRect no existe en WebView/Safari viejos)
  function roundedRect(x, y, w, h, r) {
    context.moveTo(x + r, y)
    context.arcTo(x + w, y, x + w, y + h, r)
    context.arcTo(x + w, y + h, x, y + h, r)
    context.arcTo(x, y + h, x, y, r)
    context.arcTo(x, y, x + w, y, r)
    context.closePath()
  }

  function drawSnake(cell) {
    const padding = cell * 0.08

    snake.forEach((segment, index) => {
      // Degradado de color de la cabeza a la cola
      const progress = index / Math.max(1, snake.length - 1)
      const lightness = 62 - progress * 22
      context.fillStyle = 'hsl(' + (142 + progress * 30) + ', 72%, ' + lightness + '%)'

      context.beginPath()
      roundedRect(
        segment.x * cell + padding,
        segment.y * cell + padding,
        cell - padding * 2,
        cell - padding * 2,
        index === 0 ? cell * 0.35 : cell * 0.25
      )
      context.fill()
    })

    drawEyes(cell)
  }

  function drawEyes(cell) {
    const head = snake[0]
    const d = DIRECTIONS[direction]
    const centerX = (head.x + 0.5) * cell
    const centerY = (head.y + 0.5) * cell

    // Los ojos se colocan hacia delante y separados en perpendicular
    const forward = cell * 0.18
    const side = cell * 0.2

    for (const sign of [-1, 1]) {
      const eyeX = centerX + d.x * forward + d.y * side * sign
      const eyeY = centerY + d.y * forward + d.x * side * sign

      context.fillStyle = '#f8fafc'
      context.beginPath()
      context.arc(eyeX, eyeY, cell * 0.11, 0, Math.PI * 2)
      context.fill()

      context.fillStyle = '#020617'
      context.beginPath()
      context.arc(eyeX + d.x * cell * 0.04, eyeY + d.y * cell * 0.04, cell * 0.055, 0, Math.PI * 2)
      context.fill()
    }
  }

  // CONTROLES
  document.addEventListener('keydown', (event) => {
    const newDirection = KEY_TO_DIRECTION[event.code]

    if (newDirection) {
      event.preventDefault()
      if (state === STATES.PAUSED) return
      if (state !== STATES.PLAYING) startGame()
      queueDirection(newDirection)
      return
    }

    if (event.code === 'Space' || event.code === 'Enter' || event.code === 'KeyP') {
      event.preventDefault()
      togglePause()
    }
  })

  // Swipe en toda la pantalla: se guarda dónde empieza el toque y, apenas el dedo se aleja lo suficiente,
  // el eje con mayor desplazamiento decide la dirección. Después el punto de partida se reinicia, así se pueden
  // encadenar giros sin levantar el dedo.
  let swipeStart = null

  function applySwipe(newDirection) {
    if (state === STATES.PAUSED) return
    if (state !== STATES.PLAYING) startGame()
    queueDirection(newDirection)
  }

  window.addEventListener('pointerdown', (event) => {
    if (event.target && event.target.closest && event.target.closest('button')) return // el botón usa su propio click
    swipeStart = { x: event.clientX, y: event.clientY, id: event.pointerId }
  })

  window.addEventListener('pointermove', (event) => {
    if (!swipeStart || swipeStart.id !== event.pointerId) return
    const dx = event.clientX - swipeStart.x
    const dy = event.clientY - swipeStart.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return
    swipeStart = { x: event.clientX, y: event.clientY, id: event.pointerId }
    applySwipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'))
  })

  function endSwipe(event) {
    if (swipeStart && swipeStart.id === event.pointerId) swipeStart = null
  }
  window.addEventListener('pointerup', endSwipe)
  window.addEventListener('pointercancel', endSwipe)

  $overlayButton.addEventListener('click', startGame)
  // En pausa, tocar el tablero también continúa
  $overlay.addEventListener('click', (event) => {
    if (state === STATES.PAUSED && event.target === $overlay) startGame()
  })

  // Si la app pasa a segundo plano, se pausa automáticamente
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseGame()
  })

  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('orientationchange', resizeCanvas)
  window.addEventListener('load', resizeCanvas)
  setTimeout(resizeCanvas, 150)
  setTimeout(resizeCanvas, 600)

  resetGame()
  resizeCanvas()
  window.requestAnimationFrame((now) => {
    lastFrameTime = now
    loop(now)
  })
})()
