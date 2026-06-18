# CLAUDE.md

Este archivo brinda guía a Claude Code (claude.ai/code) al trabajar con código en este repositorio.

## Qué es esto

Un clon del juego arcade clásico **Asteroids**, hecho con JavaScript vanilla (ES6+) y HTML5 Canvas. Sin frameworks, sin bundler, sin dependencias, sin package.json.

## Cómo correr el proyecto

No hay paso de build. Puedes:
- Abrir `index.html` directamente en el navegador, o
- Servirlo localmente: `npx serve .` y luego visitar `http://localhost:3000`

No hay comandos ni configuración de lint o tests en este repo — no existe una suite de pruebas automatizada.

## Arquitectura

Todo vive en un solo archivo, `game.js` (~420 líneas), cargado por `index.html` en un `<canvas>` de 800x600. La estructura, de arriba a abajo:

1. **Manejo de input** — dos mapas alimentados por listeners de `keydown`/`keyup`: `keys` (tecla mantenida) y `justPressed` (flanco de subida, consumido vía `pressed(code)`).
2. **Utils** — `wrap(v, max)` implementa el espacio toroidal (los objetos que salen por un borde reaparecen en el borde opuesto); `dist`, `rand`, `randInt` son helpers compartidos.
3. **Clases de entidades** (`Bullet`, `Asteroid`, `Ship`, `Particle`) — cada una tiene su propio `update(dt)` y `draw()`. No hay clase base compartida ni sistema de componentes; el game loop simplemente llama a estos métodos sobre los arrays que contienen las entidades vivas.
   - El tamaño/velocidad/puntaje de `Asteroid` están definidos por arrays paralelos indexados por tamaño: `RADII`, `SPEEDS`, `POINTS` (tamaños 1-3). `Asteroid.split()` devuelve dos asteroides más pequeños al destruirse uno (tamaño 1 no devuelve nada).
   - `Ship` maneja rotación, propulsión con desaceleración por fricción (drag), cooldown de disparo, y un timer de invencibilidad temporal (usado tanto al iniciar el juego como al reaparecer) que controla el efecto de parpadeo en `draw()`.
4. **Estado global mutable** — `ship`, `bullets`, `asteroids`, `particles`, `score`, `lives`, `level`, y un string `state` (`'playing' | 'dead' | 'gameover'`) son la única fuente de verdad; no hay un objeto que encapsule el juego. `initGame()` reinicia todo para una partida nueva, `nextLevel()` reinicia las entidades del nivel y genera más asteroides, `killShip()` maneja la pérdida de vidas y las transiciones de `state`.
5. **`update(dt)`** es una pequeña máquina de estados que ramifica según `state`: `gameover` espera Espacio para reiniciar, `dead` corre un timer de reaparición, `playing` avanza todas las entidades y ejecuta los chequeos de colisión (bala↔asteroide y nave↔asteroide, ambos vía chequeos simples de radio con `dist()`) y dispara `nextLevel()` cuando `asteroids` queda vacío.
6. **El dibujado** es igualmente plano: `draw()` limpia el canvas, renderiza partículas → asteroides → balas → nave (este orden importa para el layering visual), luego `drawHUD()` y, si aplica, el overlay de game over.
7. **El loop principal** usa `requestAnimationFrame` con un clamp de delta-time (`Math.min(..., 0.05)`) para evitar saltos grandes en la simulación cuando la pestaña pierde el foco.

Al agregar nuevos tipos de entidad o estados de juego, sigue el patrón existente: una clase con `update(dt)`/`draw()`, un array en el estado global, y filtrado explícito de entidades `.dead` en cada frame (no se usa pooling ni ninguna abstracción de limpieza en ningún lado).

## Discrepancia conocida

El `README.md` anuncia "power-ups especiales y tipos de asteroides únicos como la estrella fugaz", pero esos mecanismos no existen en `game.js` — solo están implementados los asteroides normales de 3 niveles. No asumas que estas features existen; si te lo piden, hay que implementarlas o corregir el README.
