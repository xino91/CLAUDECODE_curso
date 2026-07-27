---
name: spec-impl
description: Implementa una spec aprobada. Valida que el estado signifique "Aprobado" (en cualquier idioma), crea una rama git con el nombre de la spec, cambia a ella e inicia la implementación paso a paso con pausas para revisar los diffs.
disable-model-invocation: true
argument-hint: <NN-nombre-spec>
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl — Implementador de specs aprobadas

## Contexto de la sesión

Estado actual del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles en esta carpeta:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe"`

Configuración de creación de ramas:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (por defecto, sin archivo de configuración)"`

---

## Instrucciones

Sigue estas cuatro fases en orden estricto. **No avances a la siguiente fase si la anterior no se completó correctamente.**

---

### Fase 1 — Identificar la spec

El argumento recibido es: `$ARGUMENTS`

Si `$ARGUMENTS` está vacío:

- Lista los archivos disponibles en `specs/` (ya los tienes arriba).
- Pide al usuario que especifique el nombre exacto de la spec.
- Detente y espera una respuesta. No continúes.

Si `$ARGUMENTS` tiene un valor:

- Busca el archivo en `specs/`. El usuario puede haber escrito el nombre completo (`01-mvp-arkanoid`), solo el número (`01`) o solo el slug (`mvp-arkanoid`). Intenta encontrar el archivo correcto en cualquiera de esos casos.
- Si no encuentras el archivo, muestra las specs disponibles y pide al usuario que corrija el nombre.
- Si lo encuentras, continúa a la Fase 2.

---

### Fase 2 — Validar el estado de la spec

Lee el archivo de la spec que localizaste en la Fase 1 usando la herramienta Read o `cat`.

En el contenido del archivo, busca la línea que contiene el estado de la spec. La etiqueta del encabezado suele ser `**Status:**` (inglés) o `**Estado:**` (español), pero puede estar en cualquier idioma. Identifícala por posición (línea de estado cerca del inicio de la spec) y por la máquina de estados del entorno, no por la etiqueta exacta.

**Regla absoluta:** Solo puedes continuar si el estado **significa "Aprobado"** — sin importar el idioma usado.

Trata cualquiera de los siguientes (y sus equivalentes en otros idiomas) como el estado **Aprobado** y continúa:

- Español: `Aprobado`
- Inglés: `Approved`
- Portugués: `Aprovado`
- Francés: `Approuvé`
- Alemán: `Genehmigt`
- Italiano: `Approvato`
- …o cualquier otra palabra en otro idioma que claramente signifique "aprobado"

Cualquier otra cosa (Draft / Borrador, In review / En revisión, Implemented / Implementado, Obsolete / Obsoleto, o cualquier valor no reconocido) significa **detenerse** y mostrar el mensaje de error de abajo.

| Categoría de estado                         | Ejemplos (cualquier idioma)                        | Acción                                                                          |
| -------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| Aprobado                                     | `Approved`, `Aprobado`, `Aprovado`, `Approuvé`, … | Continuar a la Fase 3.                                                            |
| Borrador                                     | `Draft`, `Borrador`, …                             | Detenerse. Mostrar el mensaje de error de abajo.                                 |
| En revisión                                  | `In review`, `En revisión`, …                     | Detenerse. Mostrar el mensaje de error de abajo.                                 |
| Implementado                                 | `Implemented`, `Implementado`, …                   | Detenerse. Mostrar el mensaje de error de abajo.                                 |
| Obsoleto                                     | `Obsolete`, `Obsoleto`, …                          | Detenerse. Mostrar el mensaje de error de abajo.                                 |
| Línea de estado no encontrada / valor no reconocido | —                                            | Detenerse. El archivo no sigue el formato esperado. Comunícaselo al usuario.     |

Si no estás seguro de si un valor significa "aprobado", **no asumas**. Detente y pide al usuario que lo aclare o que actualice la spec con la redacción canónica.

**Mensaje de error estándar cuando el estado no significa Aprobado:**

```
❌ No puedo implementar esta spec.

Estado actual: [ESTADO ENCONTRADO]
Solo trabajo con specs cuyo estado signifique "Aprobado" (p.ej. `Approved`, `Aprobado`,
o el equivalente en otro idioma).

Para continuar tienes dos opciones:
  1. Si la spec está lista para implementarse, ábrela y cambia el estado
     a "Aprobado" (o el término equivalente que use tu equipo) manualmente.
     Ese cambio lo hace el humano, no el agente.
  2. Si la spec todavía necesita trabajo, usa /spec [nombre] para retomarla.
```

No ofrezcas alternativas, no sugieras "puedo empezar igualmente si quieres". El bloqueo es intencional.

---

### Fase 3 — Crear la rama git y cambiar a ella

Una vez confirmado que el estado significa `Aprobado`:

1. Deriva el nombre de la rama a partir del nombre completo del archivo de la spec, sin la extensión. Formato: `spec-NN-slug`. Ejemplos:

   - `01-mvp-arkanoid.md` → rama `spec-01-mvp-arkanoid`
   - `02-powerups.md` → rama `spec-02-powerups`

2. Lee el flag `AutoCreateBranch` de la **configuración de creación de ramas** mostrada en el contexto de la sesión arriba.

   - Si el archivo de configuración no existe, el valor falta, o el valor no es reconocido → trátalo como `true` (el valor por defecto).
   - Solo un `false` explícito (en cualquier capitalización) desactiva la creación automática de ramas.

   **Si `AutoCreateBranch` es `true` (por defecto):** procede sin preguntar.

   - Si la rama **no existe**: créala con `git checkout -b spec-NN-slug`.
   - Si **ya existe**: informa al usuario de que la rama ya existía (puede significar que se está retomando trabajo previo).
   - En ambos casos: cambia a la rama con `git checkout spec-NN-slug` y confirma que el cambio fue exitoso antes de continuar.

   **Si `AutoCreateBranch` es `false`:** pregunta antes de tocar git. Muestra:

   ```
   AutoCreateBranch está en false.
   ¿Crear y cambiar a la rama spec-NN-slug? [y/N]
   ```

   - Si el usuario responde **sí**: crea/cambia a la rama exactamente como en el caso `true` de arriba.
   - Si el usuario responde **no** o deja vacío: **no crees ninguna rama.** Dile al usuario que implementarás en la rama actual (la mostrada en el contexto de la sesión arriba) y pide confirmación explícita para continuar ahí. No improvises — espera la respuesta.

3. Confirma visualmente al usuario que la spec está lista y qué rama está activa:

   ```
   ✅ Lista para implementar.

   Spec:   specs/NN-slug.md
   Rama:   spec-NN-slug  (activa)   (← o la rama actual, si no se creó una rama nueva)
   Estado: Aprobado   (← repite el valor real encontrado en la spec)
   ```

4. **No empieces a implementar todavía.** Primero muestra el resumen de la spec al usuario para que lo tenga fresco. Extrae y muestra:
   - El **objetivo** (la línea después de `**Objective:**` / `**Objetivo:**` / etiqueta equivalente).
   - El **alcance** (la sección `## Scope` / `## Alcance` / equivalente).
   - El **plan de implementación** (la sección con los pasos numerados — `## Implementation plan` / `## Plan de implementación` / equivalente).
   - Los **criterios de aceptación** (el checklist — `## Acceptance criteria` / `## Criterios de aceptación` / equivalente).

Identifica los encabezados de sección por significado, no por redacción exacta — la spec puede estar escrita en cualquier idioma.

---

### Fase 4 — Implementar paso a paso

Después de mostrar el resumen de la spec, dile al usuario:

```
Voy a implementar la spec siguiendo el plan de implementación exactamente.
Haré una pausa después de cada paso para que puedas revisar el diff.

¿Empezamos con el Paso 1?
```

Espera confirmación explícita ("sí", "adelante", "vamos", o equivalente). No empieces sin ella.

Una vez confirmado, sigue estas reglas durante toda la implementación:

**Una regla por encima de todas:** implementa lo que dice la spec. Si algo de la spec te parece subóptimo, menciónalo como observación pero implementa lo acordado. Los cambios a la spec van en la spec, no en el código por sorpresa.

**Ritmo de trabajo:**

- Implementa un paso del plan.
- Muestra un resumen de qué archivos tocaste y qué hiciste.
- Di: `Paso N completado. ¿Podrías revisar el diff y decirme si continúo con el Paso N+1?`
- Espera confirmación antes de continuar.

**Si durante la implementación encuentras una ambigüedad** que la spec no resuelve:

- Detente.
- Describe la ambigüedad exactamente.
- Presenta dos o tres opciones concretas.
- Espera la decisión del usuario.
- No improvises.

**Si el usuario pide algo que está fuera del alcance de la spec:**

- Recuérdale que está fuera del alcance de esta spec.
- Sugiere anotarlo para la siguiente spec.
- No lo implementes en esta rama.

**Al terminar el último paso:**

```
✅ Todos los pasos del plan están implementados.

Siguiente paso: verificar los criterios de aceptación de la spec uno por uno.
Si todos se cumplen, actualiza el estado de la spec a "Implementado" (o el equivalente
en el idioma de tu repositorio) y haz el commit final antes de fusionar esta rama.
```

---

## Resumen del comportamiento esperado

```
/impl-spec 01-mvp-arkanoid

  Fase 1  →  Encuentra specs/01-mvp-arkanoid.md
  Fase 2  →  Lee el estado → "Aprobado" (o "Approved", etc.) → ✅ continúa
  Fase 3  →  git checkout -b spec-01-mvp-arkanoid → git checkout spec-01-mvp-arkanoid
              Muestra objetivo, alcance, plan y criterios
  Fase 4  →  Implementa paso a paso con pausas
              Termina recordando verificar los criterios de aceptación

/impl-spec 02-powerups  (estado: Draft / Borrador)

  Fase 1  →  Encuentra specs/02-powerups.md
  Fase 2  →  Lee el estado → "Borrador" → ❌ se detiene
              Muestra el mensaje de error estándar
              No crea rama, no toca código
```

**La creación de ramas se controla con el flag `AutoCreateBranch`** en `specs/.spec-config.yml`. Por defecto es `true` (crea la rama automáticamente, como se muestra arriba). Ponlo en `false` para que la Fase 3 pregunte `[y/N]` antes de crear la rama.
