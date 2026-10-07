# Ejercicios extra · A–F

Para cuando sobre tiempo en clase o como tarea. Las soluciones están en la rama `solutions` (`git checkout solutions`), en `docs/soluciones.md`. Inténtalo primero.

| | Ejercicio | Nivel | Tema |
|---|---|---|---|
| A | Filesystem read-only | Básico | Permisos `deny` |
| B | Scopes en conflicto | Básico | local vs project vs user |
| C | Resource vs Tool | Intermedio | Primitivos de MCP |
| D | Skill con argumentos | Intermedio | `$0`, `$1`, `arguments` |
| E | Del prompt al Skill | Intermedio | Skills con archivos de soporte |
| F | Audita un server | Avanzado | Seguridad y supply chain |

---

## A · Filesystem read-only · Básico

**Objetivo:** que el MCP Filesystem pueda leer, pero no escribir ni mover archivos.

1. Crea `.claude/settings.local.json` (es personal, no va a git) con reglas `deny` para las tools de escritura del server `filesystem`.
2. Repite la práctica 1.

**Pista:** el nombre de una tool MCP es `mcp__<server>__<tool>`. Las tools de escritura del filesystem server son `write_file`, `edit_file`, `move_file` y `create_directory`.

**Preguntas:**
- ¿Qué responde Claude cuando intenta escribir el reporte?
- ¿Intenta escribirlo con su propia tool `Write`? ¿Qué te dice eso sobre el alcance de una regla `deny`?

**Terminaste cuando:** Claude no puede escribir con `mcp__filesystem__write_file` y tú puedes explicar por qué.

---

## B · Scopes en conflicto · Básico

**Objetivo:** entender qué pasa cuando el mismo server está registrado en dos scopes.

1. Con el `filesystem` de la práctica 1 ya en scope `project`, regístralo otra vez en scope `local`, pero sólo con `./data`.
2. Corre `claude mcp list` y `claude mcp get filesystem`.
3. Abre Claude y pídele `list_allowed_directories`.

**Preguntas:** ¿cuál de las dos configuraciones gana? ¿Dónde quedó guardada cada una?

**Terminaste cuando:** puedes decir en qué archivo vive cada scope y cuál tiene prioridad. Limpia con `claude mcp remove filesystem -s local`.

---

## C · Resource vs Tool · Intermedio

**Objetivo:** ver los tres primitivos de MCP en un mismo server.

1. Registra el server del repo:
   ```bash
   claude mcp add -s project incidents -- node --import tsx mcp-servers/incidents/server.ts
   ```
2. En Claude Code, adjunta el resource escribiendo `@incidents:incidents://summary` y pregunta: "¿qué servicio falló más?".
3. En una sesión nueva, pregunta lo mismo pero pidiendo: "usa la tool get_incident_stats".
4. Prueba el prompt del server: `/mcp__incidents__triage` con el argumento `payments`.

**Preguntas:**
- ¿Cuál de los dos caminos pidió permiso? ¿Por qué?
- ¿Quién decidió usar el dato en cada caso: tú, la app o el modelo?

**Terminaste cuando:** usaste resource, tool y prompt, y puedes explicar quién controla cada uno.

> Para ver los mensajes JSON-RPC de este server: `npm run demo:lifecycle`. Para explorarlo con UI: `npm run inspector`.

---

## D · Skill con argumentos · Intermedio

**Objetivo:** convertir el `[Unreleased]` del changelog en un release con versión y fecha.

1. Crea un skill nuevo, `release-notes`, que reciba dos argumentos: la versión y la fecha.
   ```text
   /release-notes v0.4.0 2026-10-14
   ```
2. El skill debe renombrar la sección `[Unreleased]` de `CHANGELOG.md` a `[0.4.0] - 2026-10-14`.

**Pista:** los argumentos llegan como `$0` y `$1`, o con nombre si declaras `arguments: [version, date]` en el frontmatter y usas `$version` y `$date`.

**Terminaste cuando:** `CHANGELOG.md` tiene la sección `[0.4.0] - 2026-10-14` y ya no tiene `[Unreleased]`. Sin commit: eso lo decides tú.

---

## E · Del prompt al Skill · Intermedio

**Objetivo:** que el reporte de la práctica 1 salga siempre con la misma estructura.

1. Crea el skill `incident-report` en `.claude/skills/incident-report/`.
2. Pon la estructura del reporte en un archivo de soporte, `template.md`, y enlázalo desde el `SKILL.md`.
3. Invócalo dos veces: `/incident-report reports/v1.md` y `/incident-report reports/v2.md`.

**Preguntas:** ¿los dos reportes tienen las mismas secciones? ¿Cuándo leyó Claude el `template.md`?

**Terminaste cuando:** dos ejecuciones producen reportes con la misma estructura y cifras correctas (42 / 17 / 9).

---

## F · Audita un server · Avanzado

**Objetivo:** decidir con evidencia si un MCP server de terceros entra a tu equipo.

1. Elige un server: el filesystem de la práctica 1 o uno del [registro oficial](https://registry.modelcontextprotocol.io).
2. Llena el checklist de [auditoria-mcp.md](auditoria-mcp.md).
3. Termina con una decisión: aprobar, aprobar con restricciones o rechazar.

**Terminaste cuando:** tu decisión cita evidencia concreta (versión, tools, permisos, red) y, si apruebas con restricciones, incluye las reglas de `settings.json` que aplicarías.
