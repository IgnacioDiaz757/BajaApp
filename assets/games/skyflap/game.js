/*
 * Sky Flap para Bajá. Juego de aletear entre tuberías (Canvas 2D, sin dependencias).
 * Cambios: script normal en lugar de módulo, récord entregado por la app (window.BEST) y avisado con postMessage,
 * textos traducibles (window.STRINGS), pausa si la app pasa a segundo plano.
 */
(function () {
  'use strict'

  const STR = window.STRINGS || {}
  document.querySelectorAll('[data-t]').forEach((el) => {
    const v = STR[el.getAttribute('data-t')]
    if (v) el.textContent = v
  })
  if (('ontouchstart' in window) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) document.body.classList.add('touch')

  function post(message) {
    try {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message))
      else if (window.parent !== window) window.parent.postMessage(message, '*')
    } catch (e) { /* sin puente: se ignora */ }
  }

    const canvas = document.querySelector('canvas')
    const ctx = canvas.getContext('2d')

    const $score = document.querySelector('#score')
    const $startPanel = document.querySelector('#start-panel')
    const $overPanel = document.querySelector('#over-panel')
    const $startBest = document.querySelector('#start-best')
    const $finalScore = document.querySelector('#final-score')
    const $finalBest = document.querySelector('#final-best')
    const $newRecord = document.querySelector('#new-record')
    const $medal = document.querySelector('#medal')
    const $restart = document.querySelector('#restart')

    // El mundo del juego mide siempre WORLD_HEIGHT unidades de alto.
    // Escalamos el canvas para que ocupe la pantalla y el ancho del mundo
    // depende de la proporción de la ventana (en móvil se ve menos mundo).
    const WORLD_HEIGHT = 640
    const GROUND_HEIGHT = 90

    // Física expresada en unidades por SEGUNDO (no por frame)
    const GRAVITY = 1700 // aceleración: unidades/s²
    const FLAP_VELOCITY = -480 // velocidad instantánea al aletear: unidades/s
    const MAX_FALL_SPEED = 900
    const SCROLL_SPEED = 170

    const BIRD_RADIUS = 17
    const PIPE_WIDTH = 72
    const PIPE_GAP = 160
    const PIPE_SPACING = 240
    const MAX_DELTA = 1 / 30

    const STATES = {
      READY: 'ready',
      PLAYING: 'playing',
      DYING: 'dying',
      OVER: 'over'
    }

    let scale = 1
    let worldWidth = 0
    let state = STATES.READY
    let bird, pipes, score, best, groundOffset, cloudOffset, hillsOffset, flash, overAt
    let lastTime = 0

    function readBest() {
      return typeof window.BEST === 'number' ? window.BEST : 0
    }

    function saveBest(value) {
      window.BEST = value
    }

    function resize() {
      // En algunos WebView el tamaño de la ventana es 0 hasta que termina el layout: se usan valores de respaldo
      const dpr = window.devicePixelRatio || 1
      const width = window.innerWidth || document.documentElement.clientWidth || 360
      const height = window.innerHeight || document.documentElement.clientHeight || 640
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      scale = height / WORLD_HEIGHT
      worldWidth = width / scale
      // Todo lo que dibujemos a partir de aquí usa unidades del mundo
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0)
      if (bird) bird.x = getBirdX()
    }

    function getBirdX() {
      return Math.min(worldWidth * 0.3, 340)
    }

    function randomGapY() {
      const min = 110 + PIPE_GAP / 2
      const max = WORLD_HEIGHT - GROUND_HEIGHT - 70 - PIPE_GAP / 2
      return min + Math.random() * (max - min)
    }

    function reset() {
      bird = { x: getBirdX(), y: WORLD_HEIGHT * 0.42, vy: 0, angle: 0 }
      score = 0
      best = readBest()
      flash = 0
      if (groundOffset === undefined) groundOffset = 0
      if (cloudOffset === undefined) cloudOffset = 0
      if (hillsOffset === undefined) hillsOffset = 0
      // Colocamos ya algunas tuberías para que la pantalla de inicio no esté vacía
      pipes = []
      // La primera tubería se ve siempre, aunque la pantalla sea angosta (celular en vertical)
      const firstPipeX = bird.x + Math.max(200, Math.min(380, worldWidth - bird.x - 30))
      for (let x = firstPipeX; x < worldWidth + PIPE_SPACING; x += PIPE_SPACING) {
        pipes.push({ x, gapY: randomGapY(), scored: false })
      }
      if (pipes.length === 0) pipes.push({ x: firstPipeX, gapY: randomGapY(), scored: false })

      state = STATES.READY
      $score.textContent = '0'
      $score.hidden = true
      $startBest.textContent = best
      $startPanel.hidden = false
      $overPanel.hidden = true
    }

    function flap() {
      if (state === STATES.READY) {
        state = STATES.PLAYING
        $startPanel.hidden = true
        $score.hidden = false
      }
      if (state === STATES.PLAYING) {
        // Aletear no suma velocidad: la sustituye. Así el salto siempre es igual
        bird.vy = FLAP_VELOCITY
      } else if (state === STATES.OVER && performance.now() - overAt > 600) {
        reset()
      }
    }

    // AABB (Axis-Aligned Bounding Box): dos rectángulos alineados con los ejes
    // se solapan si y solo si se solapan a la vez en el eje X y en el eje Y
    function intersects(a, b) {
      return a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    }

    function getBirdBox() {
      // La caja es algo más pequeña que el dibujo para que el juego sea justo
      const size = BIRD_RADIUS * 1.6
      return { x: bird.x - size / 2, y: bird.y - size / 2, w: size, h: size }
    }

    function getPipeBoxes(pipe) {
      const top = pipe.gapY - PIPE_GAP / 2
      const bottom = pipe.gapY + PIPE_GAP / 2
      return [
        { x: pipe.x, y: -1000, w: PIPE_WIDTH, h: top + 1000 },
        { x: pipe.x, y: bottom, w: PIPE_WIDTH, h: WORLD_HEIGHT - bottom }
      ]
    }

    function die() {
      state = STATES.DYING
      flash = 1
      post({ type: 'hit' })
    }

    function gameOver() {
      state = STATES.OVER
      overAt = performance.now()
      const isRecord = score > best
      if (isRecord) {
        best = score
        saveBest(best)
      }
      $finalScore.textContent = score
      $finalBest.textContent = best
      $newRecord.hidden = !isRecord
      $medal.textContent = score >= 40 ? '🥇' : score >= 20 ? '🥈' : score >= 10 ? '🥉' : '🐣'
      $overPanel.hidden = false
      $score.hidden = true
      post({ type: 'gameover', score })
    }

    function updateBird(dt) {
      // Integración de Euler: la gravedad cambia la velocidad
      // y la velocidad cambia la posición, ambas escaladas por dt
      bird.vy = Math.min(bird.vy + GRAVITY * dt, MAX_FALL_SPEED)
      bird.y += bird.vy * dt

      // Techo: no dejamos que el pájaro se escape por arriba
      if (bird.y < BIRD_RADIUS) {
        bird.y = BIRD_RADIUS
        bird.vy = 0
      }

      // Rotación según la velocidad: mira hacia arriba al subir
      // y cae en picado cuando la velocidad de caída es grande
      const target = Math.max(-0.45, Math.min(Math.PI / 2, bird.vy / 550))
      bird.angle += (target - bird.angle) * Math.min(1, dt * 12)

      const groundY = WORLD_HEIGHT - GROUND_HEIGHT
      if (bird.y + BIRD_RADIUS >= groundY) {
        bird.y = groundY - BIRD_RADIUS
        if (state === STATES.PLAYING) die()
        gameOver()
      }
    }

    function updatePipes(dt) {
      for (const pipe of pipes) pipe.x -= SCROLL_SPEED * dt

      // Quitamos las que salen por la izquierda y creamos nuevas por la derecha
      pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > -10)
      const last = pipes[pipes.length - 1]
      if (!last || last.x < worldWidth + 20 - PIPE_SPACING) {
        pipes.push({ x: (last ? last.x : worldWidth) + PIPE_SPACING, gapY: randomGapY(), scored: false })
      }

      const birdBox = getBirdBox()
      for (const pipe of pipes) {
        if (!pipe.scored && pipe.x + PIPE_WIDTH < bird.x) {
          pipe.scored = true
          score++
          $score.textContent = score
        }
        if (getPipeBoxes(pipe).some(box => intersects(birdBox, box))) {
          die()
          return
        }
      }
    }

    function updateScenery(dt) {
      // Parallax: cada capa se mueve a una velocidad distinta.
      // Cuanto más lejos está una capa, más despacio se desplaza
      groundOffset = (groundOffset + SCROLL_SPEED * dt) % 24
      hillsOffset += SCROLL_SPEED * 0.35 * dt
      cloudOffset += SCROLL_SPEED * 0.12 * dt
    }

    function update(dt, time) {
      flash = Math.max(0, flash - dt * 3)

      if (state === STATES.READY) {
        // Flotando suavemente mientras esperamos al jugador
        bird.y = WORLD_HEIGHT * 0.42 + Math.sin(time / 300) * 8
        bird.angle = 0
        // Solo se mueven las nubes: el suelo y las tuberías esperan al jugador
        cloudOffset += SCROLL_SPEED * 0.12 * dt
      } else if (state === STATES.PLAYING) {
        updateScenery(dt)
        updatePipes(dt)
        updateBird(dt)
      } else if (state === STATES.DYING) {
        updateBird(dt)
      }
    }

    function drawSky() {
      const gradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT)
      gradient.addColorStop(0, '#4ec0ca')
      gradient.addColorStop(1, '#b8ecf0')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, worldWidth, WORLD_HEIGHT)
    }

    function drawClouds() {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
      const period = 320
      const start = -(cloudOffset % period) - period
      for (let x = start; x < worldWidth + period; x += period) {
        const index = Math.round((x + cloudOffset) / period)
        const y = 90 + (index % 3) * 45
        ctx.beginPath()
        ctx.arc(x, y, 28, 0, Math.PI * 2)
        ctx.arc(x + 32, y - 14, 34, 0, Math.PI * 2)
        ctx.arc(x + 68, y, 26, 0, Math.PI * 2)
        ctx.rect(x, y, 68, 26)
        ctx.fill()
      }
    }

    function drawHills() {
      const baseY = WORLD_HEIGHT - GROUND_HEIGHT
      const layers = [
        { color: '#9be29b', height: 110, width: 260, speed: 0.6 },
        { color: '#6fcf6a', height: 70, width: 180, speed: 1 }
      ]
      for (const { color, height, width, speed } of layers) {
        const offset = (hillsOffset * speed) % width
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(-offset - width, baseY)
        for (let x = -offset - width; x < worldWidth + width; x += width) {
          ctx.quadraticCurveTo(x + width / 2, baseY - height * 2, x + width, baseY)
        }
        ctx.lineTo(worldWidth, baseY)
        ctx.fill()
      }
    }

    function drawPipe(pipe) {
      const top = pipe.gapY - PIPE_GAP / 2
      const bottom = pipe.gapY + PIPE_GAP / 2
      const groundY = WORLD_HEIGHT - GROUND_HEIGHT
      const lip = 26

      const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0)
      gradient.addColorStop(0, '#ffb067')
      gradient.addColorStop(0.35, '#ff8a3d')
      gradient.addColorStop(1, '#c4561a')

      ctx.fillStyle = gradient
      ctx.strokeStyle = '#5a2a0c'
      ctx.lineWidth = 3

      // Cuerpo superior e inferior
      ctx.fillRect(pipe.x + 4, 0, PIPE_WIDTH - 8, top - lip)
      ctx.strokeRect(pipe.x + 4, -4, PIPE_WIDTH - 8, top - lip + 4)
      ctx.fillRect(pipe.x + 4, bottom + lip, PIPE_WIDTH - 8, groundY - bottom - lip)
      ctx.strokeRect(pipe.x + 4, bottom + lip, PIPE_WIDTH - 8, groundY - bottom - lip + 4)

      // Bocas de las tuberías
      ctx.fillRect(pipe.x, top - lip, PIPE_WIDTH, lip)
      ctx.strokeRect(pipe.x, top - lip, PIPE_WIDTH, lip)
      ctx.fillRect(pipe.x, bottom, PIPE_WIDTH, lip)
      ctx.strokeRect(pipe.x, bottom, PIPE_WIDTH, lip)
    }

    function drawGround() {
      const y = WORLD_HEIGHT - GROUND_HEIGHT
      ctx.fillStyle = '#ded895'
      ctx.fillRect(0, y, worldWidth, GROUND_HEIGHT)

      // Franja de césped con rayas diagonales que se desplazan
      ctx.fillStyle = '#9be15d'
      ctx.fillRect(0, y, worldWidth, 18)
      ctx.fillStyle = '#73bf2e'
      for (let x = -groundOffset - 24; x < worldWidth + 24; x += 24) {
        ctx.beginPath()
        ctx.moveTo(x, y + 18)
        ctx.lineTo(x + 12, y)
        ctx.lineTo(x + 24, y)
        ctx.lineTo(x + 12, y + 18)
        ctx.fill()
      }
      ctx.fillStyle = '#543847'
      ctx.fillRect(0, y - 2, worldWidth, 3)
      ctx.fillStyle = '#cfc783'
      ctx.fillRect(0, y + 18, worldWidth, 5)
    }

    function drawBird(time) {
      ctx.save()
      ctx.translate(bird.x, bird.y)
      ctx.rotate(bird.angle)

      // Cuerpo
      ctx.fillStyle = '#ff5d73'
      ctx.strokeStyle = '#543847'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(0, 0, BIRD_RADIUS + 3, BIRD_RADIUS, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Ala: oscila rápido mientras vuela
      const wing = state === STATES.DYING || state === STATES.OVER ? 0 : Math.sin(time / 60) * 6
      ctx.fillStyle = '#ffe0e5'
      ctx.beginPath()
      ctx.ellipse(-7, 3 + wing * 0.5, 10, 6 + wing * 0.4, -0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Ojo
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(8, -7, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#222'
      ctx.beginPath()
      ctx.arc(10, -7, 3, 0, Math.PI * 2)
      ctx.fill()

      // Pico
      ctx.fillStyle = '#ffd23f'
      ctx.beginPath()
      ctx.moveTo(12, 1)
      ctx.lineTo(28, 5)
      ctx.lineTo(12, 10)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      ctx.restore()
    }

    function draw(time) {
      drawSky()
      drawClouds()
      drawHills()
      pipes.forEach(drawPipe)
      drawGround()
      drawBird(time)

      if (flash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flash})`
        ctx.fillRect(0, 0, worldWidth, WORLD_HEIGHT)
      }
    }

    // requestAnimationFrame se ejecuta al ritmo de refresco de la pantalla:
    // 60 veces por segundo en un monitor de 60 Hz pero 120 o 144 en otros.
    // Si moviéramos el pájaro X píxeles por frame, el juego iría el doble de
    // rápido en una pantalla de 120 Hz. Por eso multiplicamos todo por el
    // delta time (segundos transcurridos desde el frame anterior).
    function loop(time) {
      // Limitamos dt: si la pestaña estuvo oculta, dt sería enorme y el
      // pájaro atravesaría las tuberías de un salto
      const dt = Math.min((time - lastTime) / 1000, MAX_DELTA)
      lastTime = time

      update(dt, time)
      draw(time)
      requestAnimationFrame(loop)
    }

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
        event.preventDefault()
        if (!event.repeat) flap()
      }
    })

    // El toque vale en toda la pantalla (también sobre el panel de inicio). Se escuchan pointerdown y touchstart
    // porque algunos WebView solo entregan uno de los dos; si llegan ambos del mismo toque, se cuenta una vez.
    let lastTap = 0
    function onTap(event) {
      // El botón "Jugar de nuevo" se maneja con su propio click
      if (event.target && event.target.closest && event.target.closest('button')) return
      event.preventDefault()
      const now = performance.now()
      if (now - lastTap < 60) return
      lastTap = now
      flap()
    }
    window.addEventListener('pointerdown', onTap, { passive: false })
    window.addEventListener('touchstart', onTap, { passive: false })

    $restart.addEventListener('click', (event) => {
      event.stopPropagation()
      // Quitamos el foco: si no, la barra espaciadora volvería a "pulsar" el botón
      $restart.blur()
      if (state === STATES.OVER) reset()
    })

    window.addEventListener('resize', resize)
    window.addEventListener('orientationchange', resize)
    window.addEventListener('load', resize)
    setTimeout(resize, 150)
    setTimeout(resize, 600)

    resize()
    reset()
    requestAnimationFrame((time) => {
      lastTime = time
      loop(time)
    })
  

  // Al salir de la app se descarta el tiempo transcurrido para no atravesar tuberías al volver
  document.addEventListener('visibilitychange', () => { lastTime = performance.now() })
})()
