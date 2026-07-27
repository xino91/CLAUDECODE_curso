# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) cuando trabaja con el código de este repositorio.

## Ejecutar el juego

Es un clon de Arkanoid/Breakout que corre en el navegador sin paso de compilación. Abre `index.html` directamente en el navegador o sírvelo con cualquier servidor de archivos estático:

```
npx serve .
python -m http.server 8080
```

Sin dependencias que instalar. Sin paso de compilación.

## Arquitectura

Juego de una sola página HTML que usa la Canvas API. Todo el renderizado pasa por `assets/spritesheet.js`, el único archivo JS existente por ahora. El código del juego vivirá en `index.html` o junto a él como archivos `.js` adicionales.

**Sistema de spritesheet (`assets/spritesheet.js`):**
- `loadSpritesheet(cb)` — cargador asíncrono; llama a `cb` cuando el PNG está listo.
- `drawSprite(ctx, name, x, y, w, h)` — dibuja un sprite por nombre. Los sprites de bloques usan el prefijo `block_<color>` (p.ej. `block_red`, `block_cyan`).
- `drawFrame(ctx, frame, x, y, w, h)` — dibuja un frame crudo `{sx, sy, sw, sh}` del spritesheet.
- `SPRITES` — mapa de coordenadas para `paddle`, `ball` y `blocks` (gray, red, yellow, cyan, magenta, hotpink, green).
- `EXPLOSION_FRAMES` — frames de animación por color (4 frames cada uno, 150ms en total via `EXPLOSION_DURATION`).

**Assets:**
- `assets/spritesheet-breakout.png` — atlas de texturas único para todos los visuales.
- `assets/sounds/ball-bounce.mp3` y `break-sound.mp3` — los dos efectos de sonido.

## Flujo de trabajo basado en specs

Este proyecto usa un método de desarrollo spec-first con dos skills personalizados:

| Skill | Propósito |
|-------|-----------|
| `/spec <descripción>` | Diseñador guiado de specs — hace preguntas de clarificación, construye la spec sección por sección y la guarda en `specs/NN-slug.md` como **Borrador**. |
| `/spec-impl <NN-slug>` | Implementa una spec **Aprobada**: crea la rama `spec-NN-slug`, muestra el plan y luego implementa paso a paso con pausas para revisar los diffs. |

Ciclo de vida de una spec: `Borrador` → `Aprobado` (edición manual) → implementado via `/spec-impl` → `Implementado`.

Las specs viven en `specs/`. La configuración de creación de ramas está en `specs/.spec-config.yml` (`AutoCreateBranch: true` por defecto).

**Nunca escribas código de funcionalidad directamente.** Empieza con `/spec` para producir el archivo de spec, apruébalo manualmente y luego ejecuta `/spec-impl`.
