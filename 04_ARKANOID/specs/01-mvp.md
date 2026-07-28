# SPEC 01 — MVP jugable de Arkanoid

> **Estado:** Implementado
> **Depende de:** —
> **Fecha:** 2026-07-27
> **Objetivo:** Construir un MVP jugable de Arkanoid en el navegador: pala controlable por teclado y ratón, bola con rebote físico, un nivel fijo de bloques, sistema de vidas/puntuación y pantallas de inicio, victoria y derrota.

---

## Alcance

**Entra:**

- Canvas de 640×800px renderizado en `index.html`, usando el spritesheet existente (`assets/spritesheet.js`).
- Pala controlable con teclado (flechas izquierda/derecha o A/D) y con ratón (sigue la posición X del cursor).
- Bola que empieza pegada a la pala; se lanza con barra espaciadora o click del ratón.
- Física de rebote clásica de Arkanoid: el ángulo de salida al golpear la pala depende del punto de impacto; rebote reflejado normal contra paredes y bloques.
- Velocidad de la bola constante durante toda la partida.
- Un único nivel fijo: cuadrícula de 8 columnas × 6 filas (48 bloques), un color por fila (6 de los 7 colores del spritesheet).
- Todos los bloques se rompen de un solo golpe y otorgan los mismos puntos.
- Sistema de 3 vidas: al perder la bola se resta una vida y se relanza pegada a la pala; al llegar a 0 vidas, game over.
- Condición de victoria: romper los 48 bloques del nivel.
- Marcador de puntuación visible en pantalla durante la partida.
- Pantalla de inicio con botón/acción para empezar la partida.
- Pantalla de game over al perder las 3 vidas, con botón de reinicio.
- Pantalla de victoria ("¡Has ganado!") al romper todos los bloques, con botón de reinicio.
- Todo el código del juego en un archivo nuevo `assets/game.js`, enlazado desde `index.html`.

**Fuera de alcance (para specs futuras):**

- Sonido (integración de `ball-bounce.mp3` y `break-sound.mp3`).
- Persistencia de puntuaciones (high scores) entre sesiones.
- Múltiples niveles o progresión de niveles.
- Bloques duros (más de un golpe para romperse) — el color `gray` del spritesheet queda reservado para esto.
- Power-ups.
- Aceleración de la velocidad de la bola con el tiempo/nivel.
- Menú de pausa.

---

## Modelo de datos

```js
// Estado global del juego
const state = {
  screen: 'start',        // 'start' | 'playing' | 'gameover' | 'win'
  score: 0,
  lives: 3,

  paddle: {
    x: 0, y: 0,            // esquina superior izquierda
    w: 100, h: 14,
  },

  ball: {
    x: 0, y: 0,
    vx: 0, vy: 0,           // velocidad en px/frame
    radius: 8,
    attached: true,         // true = pegada a la pala, aún no lanzada
  },

  bricks: [
    // { x, y, w, h, color, alive }
  ],
};
```

Conventions:

- Coordenadas: origen arriba-izquierda, igual que Canvas API.
- Velocidades en píxeles/frame, constantes durante toda la partida.
- `bricks` se genera una vez al iniciar/reiniciar la partida: 8 columnas × 6 filas, colores por fila desde `['red','yellow','cyan','magenta','hotpink','green']` (índice fila 0–5).
- `alive: false` marca un bloque ya roto; no se elimina del array, se filtra al dibujar y comprobar colisiones.
- La condición de victoria se cumple cuando ningún elemento de `bricks` tiene `alive: true`.

---

## Plan de implementación

1. Crear `index.html` con un `<canvas id="game" width="640" height="800">`, enlazando `assets/spritesheet.js` y un nuevo `assets/game.js` vacío. Prueba manual: abrir en el navegador, canvas negro visible, sin errores en consola.
2. En `game.js`, llamar a `loadSpritesheet` e implementar el bucle de juego con `requestAnimationFrame` que limpia el canvas cada frame. Prueba manual: sin errores en consola, el bucle corre de forma continua.
3. Implementar la pantalla de inicio (`state.screen === 'start'`): dibujar título y "Pulsa ESPACIO o haz click para jugar"; escuchar teclado/click para pasar a `'playing'`. Prueba manual: se ve la pantalla y la interacción cambia de pantalla.
4. Implementar la pala: dibujar con `drawSprite(ctx, 'paddle', ...)`, moverla con flechas/A-D y con la posición X del ratón sobre el canvas, acotada a los bordes. Prueba manual: la pala responde a teclado y ratón sin salirse del canvas.
5. Implementar la bola pegada a la pala y su lanzamiento con espacio o click: mientras `ball.attached`, sigue la X de la pala; al lanzar, adquiere velocidad inicial fija. Prueba manual: la bola acompaña a la pala y sale disparada al lanzar.
6. Implementar movimiento y rebote de la bola contra paredes (izquierda, derecha, arriba) y contra la pala, con ángulo de salida dependiente del punto de impacto. Prueba manual: la bola rebota correctamente en paredes y pala.
7. Generar la cuadrícula de 48 bloques (8×6) al iniciar partida y dibujarlos con `drawSprite(ctx, 'block_<color>', ...)`. Prueba manual: se ven los 48 bloques coloreados por fila.
8. Implementar colisión bola-bloque: al golpear un bloque `alive`, marcarlo `alive:false`, sumar puntos y rebotar la bola. Prueba manual: los bloques desaparecen al ser golpeados y el score sube.
9. Implementar pérdida de vida cuando la bola cae por debajo de la pala: restar una vida y reiniciar la bola pegada a la pala; si `lives` llega a 0, pasar a `'gameover'`. Prueba manual: perder las 3 bolas lleva a game over.
10. Detectar victoria cuando todos los bloques tienen `alive:false` y pasar a `state.screen = 'win'`. Prueba manual: romper todos los bloques muestra la condición de victoria.
11. Implementar las pantallas de game over y victoria con botón de reinicio (click o tecla) que reinicia `state` completo (vidas, score, bloques) y vuelve a `'playing'`. Prueba manual: desde ambas pantallas, reiniciar arranca una partida nueva jugable.
12. Dibujar el marcador de puntuación y vidas durante `'playing'`. Prueba manual: score y vidas se actualizan visualmente en tiempo real.

---

## Criterios de aceptación

- [X] `index.html` carga en el navegador sin errores en consola.
- [X] La pantalla de inicio se muestra al cargar la página, con instrucción para empezar.
- [X] Pulsar espacio o hacer click en la pantalla de inicio empieza la partida.
- [X] La pala se mueve con las flechas izquierda/derecha (o A/D) sin salir de los límites del canvas.
- [X] La pala se mueve siguiendo la posición X del ratón sin salir de los límites del canvas.
- [X] Al empezar la partida, la bola aparece pegada a la pala y se mueve con ella.
- [X] Pulsar espacio o hacer click lanza la bola con velocidad constante.
- [X] La bola rebota en las paredes izquierda, derecha y superior.
- [X] La bola rebota en la pala con un ángulo que depende del punto de impacto.
- [X] El nivel muestra 48 bloques (8 columnas × 6 filas) con un color distinto por fila.
- [X] Al golpear un bloque, este desaparece y la bola rebota.
- [X] Romper un bloque suma puntos al marcador, visible en pantalla durante la partida.
- [X] El contador de vidas es visible en pantalla durante la partida.
- [X] Si la bola cae por debajo de la pala, se resta una vida y la bola se relanza pegada a la pala.
- [X] Al llegar a 0 vidas, se muestra la pantalla de game over con botón de reinicio.
- [X] Al romper los 48 bloques, se muestra la pantalla "¡Has ganado!" con botón de reinicio.
- [X] El botón de reinicio (en game over o victoria) reinicia vidas, score y bloques, y vuelve a una partida jugable.
- [X] Todo el código del juego reside en `assets/game.js`, enlazado desde `index.html`.

---

## Decisiones

- **Sí:** pala controlable con teclado y ratón simultáneamente. El usuario pidió explícitamente ambos.
- **No:** un único método de control. Descartado por petición directa.
- **Sí:** bola pegada a la pala al inicio de cada vida, lanzamiento manual con espacio o click.
- **No:** bola en movimiento automático desde el inicio. Menos fiel al Arkanoid clásico.
- **Sí:** ángulo de rebote en la pala dependiente del punto de impacto (física clásica de Arkanoid).
- **No:** rebote simple invirtiendo la velocidad Y. Se sentiría plano y poco reconocible.
- **Sí:** velocidad de la bola constante durante toda la partida. Simplifica el MVP.
- **No:** aceleración progresiva. Queda para una spec futura si se desea más dificultad.
- **Sí:** un único nivel fijo de 8×6 bloques, un color por fila (6 de los 7 colores del spritesheet).
- **No:** generación aleatoria o configurable de niveles. Fuera del alcance de un MVP.
- **Sí:** todos los bloques se rompen de un golpe y otorgan los mismos puntos.
- **No:** bloques duros (varios golpes). El color `gray`, sin usar en este MVP, queda reservado para esa spec futura.
- **Sí:** 3 vidas; perder la bola resta una vida y relanza pegada a la pala.
- **No:** game over directo al primer fallo. Menos jugable para un MVP.
- **Sí:** pantallas de inicio, game over y victoria dibujadas directamente en el canvas (texto + botón "clickable" detectado por coordenadas), sin overlays HTML separados. Mantiene todo el juego autocontenido en `assets/game.js`, coherente con que todo el código vive en ese archivo.
- **No:** overlays HTML/CSS para las pantallas. Añadiría complejidad de sincronización entre DOM y canvas sin necesidad real para un MVP.
- **Sí:** sonido y persistencia de high scores quedan fuera de esta spec, como se discutió.
- **No:** integrarlos ahora aunque los assets ya existan en el repo (`ball-bounce.mp3`, `break-sound.mp3`).
- **Sí:** todo el JS del juego en `assets/game.js` separado, enlazado desde `index.html`.
- **No:** JS inline en `index.html`. El usuario prefirió separación de archivos.
- **Sí:** canvas de 640×800px. El usuario consideró 480×640 demasiado pequeño.

---

## Riesgos

| Riesgo                                                                 | Mitigación                                                                                     |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Conflicto entre teclado y ratón moviendo la pala a la vez               | El último input usado en el frame actual gana; si hay `mousemove` reciente, prioriza ratón, si no, teclado. |
| La bola atraviesa la pala o un bloque a alta velocidad ("tunneling")    | Comprobar colisión también contra la posición anterior de la bola en el frame, no solo la actual. |
| Coordenadas de click no coinciden con el canvas si este se escala en CSS | Convertir coordenadas de click con `canvas.getBoundingClientRect()` antes de comparar con áreas de botón. |

---

## Qué **no** está en esta spec

- Sonido.
- Persistencia de puntuaciones (high scores).
- Múltiples niveles.
- Bloques duros / power-ups.
- Aceleración de la bola.
- Menú de pausa.

Cada uno de estos, si se implementa, irá en su propia spec.
