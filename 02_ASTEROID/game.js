'use strict';

// Referencias al <canvas> del HTML y su contexto 2D, usados por todas las funciones draw().
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
// Dimensiones fijas del área de juego (coinciden con el atributo width/height del canvas en index.html).
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
// Mapa de "tecla mantenida": keys[code] es true mientras la tecla esté physically presionada.
const keys = {};
// Mapa de "flanco de subida": justPressed[code] es true solo en el primer frame en que se detecta
// la pulsación. Se consume (pone en false) al leerlo con pressed(), para que cada pulsación
// dispare la acción una sola vez (por ejemplo, un disparo por cada toque de Espacio).
const justPressed = {};

window.addEventListener('keydown', e => {
  // Solo marca justPressed si la tecla no estaba ya presionada (evita auto-repeat del navegador).
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  // Evita el scroll de la página y otras acciones por defecto del navegador para las teclas de juego.
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

// Lee y resetea el flanco de subida de una tecla. Se usa para acciones de "una sola vez por
// pulsación" (disparar, reiniciar partida), a diferencia de keys[] que se usa para movimiento continuo.
function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
// Envuelve un valor v dentro del rango [0, max), implementando el espacio toroidal:
// los objetos que salen por un borde de la pantalla reaparecen por el borde opuesto.
const wrap  = (v, max) => ((v % max) + max) % max;
// Distancia euclidiana entre dos puntos/objetos con propiedades x, y. Usada para las colisiones.
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
// Número aleatorio flotante en [min, max).
const rand  = (min, max) => min + Math.random() * (max - min);
// Entero aleatorio en [min, max] (inclusive en ambos extremos).
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
// Proyectil disparado por la nave. Vive un tiempo limitado (ttl) y se mueve en línea recta.
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520; // velocidad constante en px/s, en la dirección del ángulo de disparo
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;    // segundos de vida restante antes de desaparecer
    this.radius = 2;    // radio usado en las comprobaciones de colisión con asteroides
    this.dead = false;  // marca para ser eliminado del array `bullets` en el siguiente filtrado
  }

  update(dt) {
    // Avanza la posición y aplica el wrap toroidal en ambos ejes.
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Se dibuja como un pequeño círculo blanco.
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
// Arrays paralelos indexados por tamaño de asteroide (1 = pequeño, 2 = mediano, 3 = grande).
// El índice 0 no se usa (se deja en 0 para que el tamaño coincida directamente con el índice).
const RADII  = [0, 16, 30, 50];   // radio de colisión/dibujado por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño (los pequeños van más rápido)
const POINTS = [0, 100, 50, 20];  // puntos otorgados al destruir un asteroide de ese tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;            // 1, 2 o 3 — determina radio, velocidad y puntaje vía los arrays de arriba
    this.radius = RADII[size];
    this.dead = false;           // marca para ser eliminado del array `asteroids`

    // Velocidad y dirección aleatorias, con algo de variación (+-15) sobre la velocidad base.
    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2); // velocidad de rotación visual (rad/s), no afecta la física
    this.rot = rand(0, Math.PI * 2); // ángulo de rotación actual del polígono dibujado

    // Polígono irregular: genera entre 8 y 13 vértices distribuidos en círculo, cada uno con
    // un radio aleatorio (60%-100% del radio base) para que el asteroide no sea un círculo perfecto.
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  // Al destruirse, un asteroide de tamaño 2 o 3 se divide en dos asteroides del tamaño inmediatamente
  // inferior, en la misma posición. Los de tamaño 1 (los más pequeños) no generan fragmentos.
  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    // Traslada y rota el contexto al centro del asteroide para dibujar el polígono en coordenadas locales.
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
// La nave del jugador: maneja rotación, propulsión con fricción (drag), cooldown de disparo
// e invencibilidad temporal (al iniciar partida y al reaparecer tras perder una vida).
class Ship {
  constructor() { this.reset(); }

  // Restablece la nave a su estado inicial: centrada, mirando hacia arriba, sin velocidad
  // y con unos segundos de invencibilidad (usado tanto al empezar el juego como al reaparecer).
  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2; // apunta hacia arriba (eje Y invertido en canvas)
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;            // radio usado en la colisión nave vs asteroide
    this.thrusting     = false;  // true mientras se dibuja la llama del propulsor
    this.invincible    = 3;      // segundos de invencibilidad restantes (parpadeo visual)
    this.shootCooldown = 0;      // segundos restantes antes de poder disparar de nuevo
    this.tripleShotTimer = 0;    // segundos restantes del power-up de disparo triple (0 = inactivo)
    this.shieldTimer   = 0;      // segundos restantes del power-up de escudo temporal (0 = inactivo)
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible      > 0) this.invincible      -= dt;
    if (this.shootCooldown   > 0) this.shootCooldown   -= dt;
    if (this.tripleShotTimer > 0) this.tripleShotTimer -= dt;
    if (this.shieldTimer     > 0) this.shieldTimer     -= dt;

    const ROT   = 3.5;   // velocidad de rotación en rad/s
    const THRUST = 260;  // aceleración del propulsor en px/s²
    const DRAG   = 0.987; // factor de fricción aplicado cada frame para frenar gradualmente la nave

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      // Acelera en la dirección actual de la nave (no hay reversa).
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    // Fricción: reduce la velocidad un poco cada frame, simulando resistencia/desaceleración.
    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  // Intenta disparar desde la punta de la nave. Devuelve un array (vacío si está en cooldown o
  // muerta) para que el caller haga push(...). Con el power-up de disparo triple activo, dispara
  // 3 balas en abanico en vez de una sola.
  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2; // tiempo mínimo entre disparos
    const NOSE = 21; // distancia desde el centro de la nave hasta la punta, donde nace la bala
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;

    if (this.tripleShotTimer > 0) {
      const SPREAD = 0.22; // separación angular (rad) entre las balas laterales y la central
      return [
        new Bullet(ox, oy, this.angle - SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición: oculta la nave en frames alternos
    // (8 ciclos por segundo) para indicar visualmente que es invulnerable.
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    // Círculo de energía del escudo temporal: se dibuja sin rotar junto a la nave mientras el
    // power-up está activo, para indicar visualmente que el siguiente impacto será absorbido.
    if (this.shieldTimer > 0) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.85)';
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.fillStyle   = 'rgba(0, 255, 255, 0.08)';
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera, dibujado en coordenadas locales
    // (eje X local = "adelante" de la nave, ya que el contexto está rotado por this.angle).
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor: solo se dibuja mientras se acelera, con parpadeo aleatorio
    // (Math.random() > 0.35) para simular el efecto tembloroso de una llama.
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0); // largo de la llama variable, hacia atrás de la nave
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
// Pequeño segmento de línea que sale despedido en una dirección aleatoria y se desvanece
// con el tiempo. Se usa para representar explosiones (de asteroides y de la nave al morir).
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1); // duración total de vida, usada para calcular el alpha al dibujar
    this.ttl  = this.life;      // tiempo de vida restante
    this.dead = false;
  }

  update(dt) {
    // Sin fricción ni wrap: la partícula vuela en línea recta hasta desaparecer (puede salir del canvas).
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Alpha decreciente conforme se acaba el ttl, para un efecto de desvanecimiento gradual.
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    // El segmento se dibuja "hacia atrás" de la dirección de movimiento, dando aspecto de estela corta.
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── PowerUp ───────────────────────────────────────────────────────────────────
// Ítem coleccionable que cae al destruir un asteroide. Flota en el sitio hasta que la nave lo
// recoge o expira su tiempo de vida. Tipos existentes: 'tripleShot' y 'shield'.
const POWERUP_CHANCE    = 0.1;  // probabilidad de que un asteroide destruido suelte un power-up
const POWERUP_LIFETIME  = 11;   // segundos que permanece en pantalla antes de desaparecer si no se recoge
const POWERUP_WARN_TIME = 3;    // últimos segundos de vida en que parpadea para avisar que va a desaparecer
// Etiqueta corta dibujada sobre el icono de cada tipo de power-up, para identificar su efecto a simple vista.
const POWERUP_LABELS = { tripleShot: 'x3', shield: 'SH' };
// Número de lados del polígono dibujado por tipo, para diferenciarlos visualmente (rombo vs hexágono)
// manteniendo la estética wireframe del juego.
const POWERUP_SHAPES = { tripleShot: 4, shield: 6 };

class PowerUp {
  constructor(x, y, type = 'tripleShot') {
    this.x      = x;
    this.y      = y;
    this.type   = type;
    this.radius = 12; // radio usado en la colisión con la nave
    this.rot    = rand(0, Math.PI * 2);
    this.blink  = 0;
    this.ttl    = POWERUP_LIFETIME;
    this.dead   = false;
  }

  update(dt) {
    this.rot   += 1.4 * dt;
    this.blink += dt;
    this.ttl   -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // En los últimos POWERUP_WARN_TIME segundos de vida parpadea rápido para avisar que está
    // por desaparecer. Antes de eso permanece visible de forma constante.
    if (this.ttl <= POWERUP_WARN_TIME && Math.floor(this.blink / 0.1) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    // Polígono regular de N lados (4 = rombo, 6 = hexágono, ...) según POWERUP_SHAPES,
    // empezando por el vértice superior, para distinguir cada tipo de power-up a simple vista.
    const sides = POWERUP_SHAPES[this.type] || 4;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a  = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * this.radius;
      const py = Math.sin(a) * this.radius;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle   = 'rgba(0, 255, 255, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.restore();

    // Etiqueta del power-up, dibujada sin rotar para que siempre se lea en posición vertical.
    const label = POWERUP_LABELS[this.type];
    if (label) {
      ctx.fillStyle    = '#0ff';
      ctx.font         = 'bold 13px monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, this.x, this.y);
    }
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
// Única fuente de verdad del juego: variables globales mutables (no hay un objeto que las encapsule).
let ship, bullets, asteroids, particles, powerUps;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover' — controla qué rama ejecuta update()
let deadTimer;  // cuenta regresiva (segundos) mientras state === 'dead', antes de reaparecer
let tripleShotSpawnedThisLevel; // asegura que el power-up de disparo triple caiga como máximo una vez por nivel
let shieldSpawnedThisLevel;     // asegura que el power-up de escudo caiga como máximo una vez por nivel

// Genera `count` asteroides grandes (tamaño 3) en posiciones aleatorias del canvas, evitando
// que aparezcan demasiado cerca del centro (donde reaparece la nave) para no matarla al instante.
function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

// Reinicia todo el estado para empezar una partida nueva desde cero (puntaje, vidas, nivel 1).
function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  tripleShotSpawnedThisLevel = false;
  shieldSpawnedThisLevel     = false;
  spawnAsteroids(4);
}

// Avanza al siguiente nivel: limpia balas y partículas, reposiciona la nave (con invencibilidad)
// y genera más asteroides que en el nivel anterior (dificultad creciente), conservando puntaje y vidas.
function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  tripleShotSpawnedThisLevel = false;
  shieldSpawnedThisLevel     = false;
  ship.reset();
  spawnAsteroids(3 + level);
}

// Crea `count` partículas de explosión en el punto (x, y). Usada al destruir asteroides y al morir la nave.
function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

// Maneja la pérdida de una vida: dispara la explosión visual, marca la nave como muerta,
// resta una vida y decide si la partida termina (sin vidas restantes) o si entra en estado
// "dead" (pausa breve antes de reaparecer).
function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2; // segundos de pausa antes de reaparecer
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
// Máquina de estados principal, llamada una vez por frame con el delta-time en segundos.
function update(dt) {
  if (state === 'gameover') {
    // En game over solo se espera Espacio para reiniciar; las partículas de la explosión final
    // siguen animándose para que el efecto visual no se corte abruptamente.
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    // Cuenta regresiva tras perder una vida: los asteroides, partículas y power-ups siguen
    // animándose, pero no hay nave en juego ni se procesan colisiones, hasta que el timer llega a 0.
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    powerUps.forEach(p => p.update(dt));
    powerUps = powerUps.filter(p => !p.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // state === 'playing': lógica normal del juego.

  // Disparar: justPressed asegura una bala por pulsación, no una bala por frame mientras se mantiene.
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));

  // Limpieza de entidades muertas (balas expiradas, partículas extinguidas) antes de chequear colisiones.
  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);

  // Colisión bala vs asteroide: comprobación simple por distancia entre centros (sin masking de
  // colisión real). Al impactar, se suma puntaje, se genera una explosión y el asteroide se divide.
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5); // más fragmentos visuales para asteroides más grandes
        newAsteroids.push(...a.split());
        // Suelta un power-up al azar entre los tipos que no hayan caído ya en este nivel
        // (cada tipo está limitado a una aparición por nivel).
        const availableTypes = [];
        if (!tripleShotSpawnedThisLevel) availableTypes.push('tripleShot');
        if (!shieldSpawnedThisLevel)     availableTypes.push('shield');
        if (availableTypes.length > 0 && Math.random() < POWERUP_CHANCE) {
          const type = availableTypes[randInt(0, availableTypes.length - 1)];
          powerUps.push(new PowerUp(a.x, a.y, type));
          if (type === 'tripleShot') tripleShotSpawnedThisLevel = true;
          else if (type === 'shield') shieldSpawnedThisLevel = true;
        }
      }
    }
  }
  // Reemplaza el array quitando los destruidos y agregando los fragmentos nuevos generados arriba.
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Colisión nave vs power-up: la nave recoge el ítem y activa su efecto correspondiente.
  for (const p of powerUps) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'tripleShot') ship.tripleShotTimer = 10;
      else if (p.type === 'shield') ship.shieldTimer = 7;
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Colisión nave vs asteroide: solo se comprueba si la nave no está invencible. El radio de
  // colisión del asteroide se reduce al 82% para que el choque se sienta un poco más justo
  // (perdonando el contacto en el borde irregular del polígono dibujado).
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shieldTimer > 0) {
          // El escudo absorbe el impacto: se consume y otorga una breve invencibilidad para
          // evitar que el mismo asteroide (aún superpuesto) mate a la nave en el frame siguiente.
          ship.shieldTimer = 0;
          ship.invincible  = 0.5;
          explode(ship.x, ship.y, 10);
        } else {
          killShip();
        }
        break;
      }
    }
  }

  // Nivel completado: cuando ya no quedan asteroides en pantalla, se avanza de nivel.
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
// Dibuja el icono de "vida restante" (una pequeña nave) en el HUD, en la posición (x, y).
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2); // apunta hacia arriba, igual que la nave real al iniciar
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

// Dibuja la interfaz superior: puntaje (izquierda), nivel (centro) e iconos de vidas (derecha).
function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  if (ship.tripleShotTimer > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0ff';
    ctx.fillText(`TRIPLE x3  ${ship.tripleShotTimer.toFixed(1)}s`, 14, 48);
  }

  if (ship.shieldTimer > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0ff';
    ctx.fillText(`ESCUDO  ${ship.shieldTimer.toFixed(1)}s`, 14, ship.tripleShotTimer > 0 ? 70 : 48);
  }
}

// Dibuja un overlay centrado con un título grande y un subtítulo más pequeño y semitransparente
// (usado actualmente solo para la pantalla de "GAME OVER").
function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

// Dibuja un frame completo. El orden de dibujo importa para el layering visual:
// fondo → partículas → asteroides → balas → nave → HUD → overlay (de atrás hacia adelante).
function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerUps.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null; // marca de tiempo del frame anterior, usada para calcular el delta-time

// Loop de animación basado en requestAnimationFrame. ts es el timestamp de alta resolución
// que el navegador pasa automáticamente a cada callback.
function loop(ts) {
  // En el primer frame no hay lastTime todavía, así que dt = 0 para evitar un salto inicial.
  // Math.min(..., 0.05) limita el delta-time a 50ms para evitar saltos grandes en la simulación
  // cuando la pestaña pierde el foco y el navegador deja de llamar requestAnimationFrame por un rato.
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
