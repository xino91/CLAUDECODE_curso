---
name: spec
description: Diseña y desarrolla specs siguiendo el método spec-driven. Hace preguntas de clarificación antes de proponer la estructura, y construye la spec sección por sección. Úsalo al empezar una funcionalidad grande, antes de escribir código.
disable-model-invocation: true
argument-hint: 'descripción breve de la funcionalidad o requisito'
---

# /spec — Diseñador guiado de specs

Este skill te ayuda a producir una spec útil siguiendo el método spec-driven. **Aquí no se escribe código.** Tu trabajo es ayudar al usuario a clarificar qué quiere construir, hacer preguntas cuando algo no está suficientemente definido, y desarrollar la spec sección por sección hasta que esté lista para guardarse en `specs/`.

## Filosofía

Una spec no es documentación decorativa. Es el contrato que guía la ejecución posterior. Si la spec es vaga, el código improvisará. Por eso este flujo es **deliberadamente lento durante la fase de definición** y **rápido durante la fase de escritura**.

Lee `template.md` (en el mismo directorio que este skill) para ver la estructura completa que seguirá la spec. Apóyate en ella en cada paso.

## Flujo del comando

- Sigue las cuatro fases en orden. **No te saltes fases.** Si el usuario quiere ir más rápido, recuérdale que el coste de una mala spec se paga después en el código.
- Tus respuestas deben estar en el mismo idioma que el prompt inicial. P.ej.: si el prompt inicial está en español, tus respuestas deben estar en español; si está en inglés, tus respuestas deben estar en inglés.

### Fase 1 — Entender el contexto

Antes de preguntar sobre la funcionalidad, asegúrate de tener contexto del proyecto:

1. Lee el archivo de memoria del proyecto, si existe. Prueba en orden y detente en el primer acierto: `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `README.md`. Esto adapta el skill al agente que lo esté ejecutando (Claude Code, Codex, Gemini CLI, etc.).
2. Lista el contenido de `specs/` para ver qué specs ya existen y cómo están numeradas.
3. Si existen specs previas, lee al menos las dos más recientes para captar las convenciones del proyecto.

Si el argumento `$ARGUMENTS` llega vacío, pide al usuario una descripción inicial de **una sola frase** de lo que quiere construir. Si la descripción no cabe en una frase, esa es la primera señal de que la funcionalidad es demasiado grande — sugiere dividirla antes de continuar.

### Fase 2 — Clarificar mediante preguntas

Esta es la fase más importante del comando. Tu trabajo aquí es **detectar ambigüedades y preguntar**, no asumir.

Haz preguntas en bloques de 3 a 5 a la vez (no una sola pregunta seguida de otra sola pregunta — eso es agotador). Después de cada bloque, espera una respuesta antes de continuar.

**Categorías de preguntas que siempre debes considerar:**

- **Alcance:** ¿Qué entra y qué NO? ¿Qué partes de la funcionalidad se difieren a otra spec?
- **Datos:** ¿Qué estructuras nuevas se introducen? ¿Cómo se llaman? ¿Dónde viven?
- **Integración:** ¿Esta funcionalidad depende de specs anteriores? ¿Modifica algo existente o solo añade?
- **Persistencia:** ¿Se guarda algo entre sesiones? ¿Dónde? ¿Con qué versionado?
- **UX y estados:** ¿Cómo se ve cuando funciona? ¿Cómo se ve cuando falla? ¿Hay estados intermedios?
- **Riesgos:** ¿Qué puede romper esto? ¿Qué pasa en el caso degradado?
- **Decisiones cerradas:** ¿Hay alguna decisión que el usuario ya haya tomado y no quiera reabrir?

**Cómo formular las preguntas:**

- Usa preguntas concretas, no abiertas. ❌ "¿Cómo imaginas la persistencia?" → ✅ "¿La persistencia es localStorage, IndexedDB o un archivo JSON en disco?"
- Cuando ofrezcas opciones, da entre 2 y 4, marca cuál es tu recomendación y por qué.
- Si detectas una respuesta que abriría la caja de Pandora (p.ej. "y también queremos multijugador"), señala que merece su propia spec y pregunta si la dejamos fuera del alcance de esta.

**Cuándo dejar de preguntar:**

Detente cuando puedas responder estas tres preguntas sin asumir nada:

1. ¿Qué archivos aparecerán o cambiarán?
2. ¿Cuál es el primer paso ejecutable y cuál es el último?
3. ¿Cómo verifico que la funcionalidad está terminada?

Si todavía no puedes responder alguna, sigue preguntando.

### Fase 3 — Desarrollar la spec sección por sección

Una vez que tengas claridad, **no generes la spec completa de una sola vez**. Desarrollarás las secciones de la plantilla **una por una**, mostrando cada sección al usuario y esperando confirmación antes de pasar a la siguiente.

Orden estricto:

1. **Encabezado** (estado, dependencias, fecha, objetivo en una frase). El objetivo en una frase es crítico — si no cabe en una frase, vuelve a la Fase 2.
2. **Alcance** (qué entra y qué NO). El "qué no entra" debe ser explícito.
3. **Modelo de datos** (estructuras concretas con nombres reales). Si la funcionalidad no introduce datos nuevos, omite esta sección y dilo explícitamente.
4. **Plan de implementación** (pasos numerados, cada uno dejando el sistema funcional).
5. **Criterios de aceptación** (checklist booleano, no aspiracional).
6. **Decisiones tomadas y descartadas** (con justificación breve).
7. **Riesgos identificados** (solo si aplica — si no hay riesgos relevantes, omítela).

**Después de cada sección:**

- Muéstrala formateada en markdown.
- Pregunta: "¿Esta sección se queda así o quieres ajustar algo?"
- Si el usuario pide cambios, aplícalos y muéstrala de nuevo.
- Solo pasa a la siguiente sección una vez que el usuario confirme.

**Errores comunes que evitar:**

- Generar criterios de aceptación que no son verificables ("que funcione bien").
- Meter en el plan de implementación cosas que no están en el alcance.
- Asumir nombres de archivos o estructuras que el usuario no confirmó.
- Saltarse la sección de decisiones — esa sección es la de mayor valor a largo plazo.

### Fase 4 — Guardar la spec

Cuando todas las secciones estén confirmadas:

1. Determina el siguiente número secuencial mirando `specs/`. Si la última es `02-powerups.md`, esta será `03-`.
2. Genera un slug corto a partir del objetivo (p.ej. `levels-and-highscores`).
3. Pregunta al usuario si el nombre de archivo propuesto le parece bien antes de escribirlo.
4. Crea el archivo en `specs/NN-slug.md` con todas las secciones aprobadas.
5. Marca el estado como `Borrador` por defecto. **No lo marques como `Aprobado` automáticamente** — eso lo hace el usuario cuando lo haya releído.
6. **Genera el archivo de configuración si no existe.** Comprueba si existe `specs/.spec-config.yml`. Si **falta**, créalo con el contenido por defecto de abajo. Si **ya existe, no lo toques** — nunca sobrescribas la configuración del usuario.

   ```yaml
   # configuración del flujo de trabajo de specs
   #
   # AutoCreateBranch — controla si /spec-impl crea la rama git automáticamente.
   #   true  (por defecto) → /spec-impl crea y cambia a spec-NN-slug sin preguntar
   #   false               → /spec-impl pide confirmación [y/N] antes de crear la rama
   AutoCreateBranch: true
   ```

7. Confirma al usuario:
   - Ruta del archivo creado.
   - Recordatorio: la spec está en estado `Borrador`. Cámbiala a `Aprobado` una vez que la hayas releído.
   - Si acabas de crear `specs/.spec-config.yml`, menciona que existe y que `AutoCreateBranch` es `true` por defecto (ponlo en `false` para controlar tú mismo la creación de ramas).
   - Siguiente paso: una vez revisada y aprobada, ejecuta `/spec-impl NN-slug` para implementarla.
   - **Detente aquí.** No propongas implementar la spec, escribir código, ni tomar ninguna acción adicional más allá de esta confirmación.

## Reglas duras

- **Nunca escribas código durante este comando.** Solo el archivo `.md` de la spec al final.
- **Nunca propongas implementar la spec después de guardarla.** Tu trabajo termina cuando el archivo está escrito. El usuario ejecuta `/spec-impl` cuando esté listo.
- **Nunca asumas decisiones que el usuario no confirmó.** Si te falta información, pregunta.
- **Nunca generes la spec completa en una sola respuesta.** Sección por sección, con confirmación.
- **Si el usuario quiere acelerar y saltarse la Fase 2**, recuérdale: "Las preguntas ahora ahorran horas después. ¿Seguro que quieres saltártelas?". Si insiste, respeta su decisión pero regístralo en la sección de decisiones de la spec ("Definición rápida sin clarificación detallada").
- **Si la funcionalidad es demasiado grande** (no cabe en una frase, toca más de tres áreas del sistema, requiere decisiones en cuatro o más dominios), propón dividirla en dos o más specs antes de continuar.

## Tono al preguntar

Sé directo y específico. No te disculpes por preguntar. No uses frases como "si no te importa..." o "¿podrías tal vez...?". El usuario invocó este skill precisamente porque quiere que preguntes. Usa preguntas concretas, una por línea cuando haya varias, y numéralas para que sean fáciles de responder.

Ejemplo de un bloque bien formado:

> Antes de escribir el modelo de datos necesito aclarar tres cosas:
>
> 1. **Persistencia.** ¿localStorage, IndexedDB o un archivo JSON en disco? Recomendación: localStorage si los datos caben en <5MB y no necesitan consultas.
> 2. **Versionado del esquema.** ¿Qué pasa cuando cambia el formato? Opciones: (a) prefijo de versión en la clave, (b) ignorar y reconstruir, (c) migrar al cargar.
> 3. **Privacidad.** ¿Son sensibles los datos? Si es así, ¿están cifrados? ¿Se borran al cerrar sesión?

## Argumentos

Si el usuario invocó `/spec levels-and-highscores`, usa `levels-and-highscores` como sugerencia inicial de slug, pero confírmalo con el usuario antes de escribir el archivo.

Si invocó `/spec` sin argumentos, empieza pidiendo la descripción en una sola frase.
