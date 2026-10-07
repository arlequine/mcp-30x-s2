# 30x-mcp-lab

Repo de práctica de la **sesión 2 de nivelación de 30X · AI for Developers**: MCP, Claude Code y Skills.

Trabajamos sobre `payments-api`, una API de pagos **ficticia** (empresa, PSP, usuarios y datos son inventados) con un historial de git real: tres releases (`v0.1.0`, `v0.2.0`, `v0.3.0`) y cambios sin publicar.

---

## 1. Requisitos

| Herramienta | Versión | Cómo verificar |
|---|---|---|
| Node.js | 20 o mayor | `node -v` |
| git | cualquiera reciente | `git --version` |
| Claude Code | instalado y con sesión iniciada | `claude --version` |

## 2. Preparación (hazlo en la pausa)

```bash
git clone <url-del-repo> 30x-mcp-lab   # clónalo con git: el ZIP de GitHub no trae los tags
cd 30x-mcp-lab
npm install
git tag                                  # deben aparecer v0.1.0, v0.2.0 y v0.3.0
npm run smoke                            # ✅ smoke test OK
```

> Corre `claude` siempre desde la raíz del repo: los servers usan rutas relativas.

## 3. Qué hay aquí

| Ruta | Para qué |
|---|---|
| `data/incidents/*.log` | Logs de la semana 40 de tres servicios: payments, auth y notifications |
| `data/tickets.csv` | Tickets de soporte de la misma semana |
| `reports/` | Aquí escribe Claude el reporte de la práctica 1 |
| `mcp-servers/incidents/` | Server MCP propio con los 3 primitivos: 2 tools, 1 resource y 1 prompt |
| `mcp-servers/weather/` | El ejemplo de la lámina "La misma tool, dos mundos" |
| `scripts/` | Demos: ciclo de vida de MCP, roots, status page y smoke test |
| `src/`, `test/` | La API de pagos (contexto para la práctica 2) |
| `docs/ejercicios.md` | Ejercicios extra A–F |
| `docs/auditoria-mcp.md` | Checklist para auditar un MCP server de terceros |

---

## 4. Demo en vivo · dale ojos al agente (7 min)

La hace el mentor en clase y tú puedes repetirla después. Claude Code no tiene navegador; con una línea le conectamos el MCP de Playwright (de Microsoft) y lo usamos al momento.

**1. Levanta la status page** (déjala corriendo en su propia terminal):

```bash
npm run status          # http://localhost:4321
```

**2. Agrega el MCP** en scope local (es una herramienta personal, no va al `.mcp.json` del equipo):

```bash
claude mcp add playwright -- npx -y @playwright/mcp@0.0.83
```

**3. Abre `claude`, escribe `/mcp`** y confirma que `playwright` está conectado.

**4. Pídele, uno por uno:**

```text
Usa playwright: abre http://localhost:4321 y dime qué servicio está en rojo y por qué.
```
```text
Entra al detalle de auth y guarda una captura en reports/auth.png.
```
```text
Abre un ticket: servicio auth, severidad alta, título "Rotación de llaves sin periodo de gracia".
```

Se abre una ventana de Chrome y el agente navega, toma la captura y llena el formulario. Recarga la página en tu navegador: el ticket `TCK-001` aparece en la tabla.

| Si… | Haz esto |
|---|---|
| No tienes Chrome | Agrega `--browser msedge` al final del comando del paso 2 |
| Windows nativo y no arranca | `claude mcp add playwright -- cmd /c npx -y @playwright/mcp@0.0.83` |
| Ya no lo vas a usar | `claude mcp remove playwright` (sus tools ocupan contexto en cada turno) |

---

## 5. Práctica 1 · MCP Filesystem → reporte (20 min)

**Objetivo:** conectar el MCP Filesystem, comprobar a qué carpetas tiene acceso de verdad y pedirle a Claude un reporte de incidentes en markdown.

**1. Registra el server en scope project, con versión fija** (crea `.mcp.json`):

```bash
claude mcp add -s project filesystem -- \
  npx -y @modelcontextprotocol/server-filesystem@2026.8.31 \
  ./data ./reports
```

En PowerShell o CMD escríbelo en una sola línea:

```text
claude mcp add -s project filesystem -- npx -y @modelcontextprotocol/server-filesystem@2026.8.31 ./data ./reports
```

**2. Verifica:**

```bash
cat .mcp.json
claude mcp list        # verás "Pending approval": el host todavía no lo aprueba
```

**3. Abre Claude Code y aprueba el server** del proyecto cuando te lo pregunte. Luego escribe `/mcp` y revisa las tools de `filesystem`.

**4. Pega este prompt:**

```text
Usa sólo las tools mcp__filesystem__*.
Lee los archivos de data/incidents/ y escribe
reports/incidentes.md con:
1. Resumen ejecutivo en 3 líneas
2. Tabla por servicio:
   servicio | errores | error más frecuente
3. Top 3 incidentes con hora y causa probable
4. Recomendaciones accionables
```

### Qué observar

1. **El host aprueba:** Claude pide permiso antes de `mcp__filesystem__write_file`.
2. **Verifica, no supongas:** pídele que llame `list_allowed_directories`. ¿Ve sólo `data/` y `reports/`, o todo el repo?
3. **Fuera de límites:** pídele leer un archivo de la carpeta padre (`../`). El server lo rechaza.
4. **Costo:** corre `/context`. Las tools MCP también ocupan contexto.

**Cómo sabes que terminaste:** `reports/incidentes.md` existe y su tabla dice payments 42, auth 17 y notifications 9.

### ¿Por qué el punto 2 sorprende?

Claude Code anuncia la capacidad **roots** de MCP y le dice al server "mi raíz es el proyecto". El filesystem server reemplaza las carpetas de sus argumentos por esos roots. Compruébalo sin Claude:

```bash
npm run demo:roots
```

| | allowed | leer `src/server.ts` | leer `../` |
|---|---|---|---|
| A · cliente sin roots | `data`, `reports` | ❌ | ❌ |
| B · cliente con roots (como Claude Code) | el repo completo | ✅ | ❌ |

La configuración declara una intención; el menor privilegio **se verifica**. Para restringir de verdad, usa reglas `deny`/`ask` (ejercicio A).

---

## 6. Práctica 2 · Skill de changelog desde git log (20 min)

**Objetivo:** empaquetar "hacer el changelog" como un Skill reutilizable por todo el equipo.

**1.** Crea `.claude/skills/changelog/SKILL.md` con este contenido:

```markdown
---
name: changelog
description: >
  Genera o actualiza CHANGELOG.md desde git log.
  Úsalo cuando pidan changelog o release notes.
argument-hint: "[rango, ej. v0.2.0..v0.3.0]"
allowed-tools: Bash(git log *) Bash(git tag *) Read Edit Write
disable-model-invocation: true
---
## Contexto
Tags: !`git tag --sort=-creatordate`

## Instrucciones
1. Rango: $ARGUMENTS. Si está vacío, usa <último tag>..HEAD.
   Si el rango no termina en un tag, la sección es [Unreleased].
2. Lee los commits con git log --oneline.
3. Agrupa por Conventional Commits:
   feat → Agregado · fix → Corregido
   perf/refactor → Cambiado · docs/chore/test → omitir
4. Una línea por cambio, en español, con hash corto.
5. Inserta la versión arriba en CHANGELOG.md
   (formato Keep a Changelog, fecha del tag).
6. No hagas commit: muestra el diff y espera.
```

**2.** En Claude Code: `/reload-skills` y luego `/skills` para confirmar que aparece.

**3.** Ejecútalo:

```text
/changelog v0.2.0..v0.3.0
```

**4.** Ahora sin argumentos: `/changelog`. Debe agregar una sección `[Unreleased]` con lo que está en `main` y todavía no tiene release.

### Qué observar

1. **Carga progresiva:** la descripción ya estaba en contexto; el cuerpo entró sólo al invocar `/changelog`.
2. **Datos reales:** la línea `` !`git tag` `` corre antes de que el modelo lea el skill. Por eso no inventa versiones.
3. **Sin prompts repetidos:** `allowed-tools` pre-aprueba `git log`, `git tag` y la edición del archivo.
4. **El humano cierra:** el skill se detiene antes del commit. La decisión sigue siendo tuya.

**Cómo sabes que terminaste:** `CHANGELOG.md` tiene `[0.3.0] - 2026-09-25` con 2 entradas en Agregado, 2 en Corregido y 1 en Cambiado, y una sección `[Unreleased]`.

---

## 7. Ejercicios extra

Seis ejercicios de básico a avanzado en [docs/ejercicios.md](docs/ejercicios.md). Las soluciones están en la rama `solutions`: inténtalo primero.

## 8. Demos útiles

| Comando | Qué muestra |
|---|---|
| `npm run demo:lifecycle` | Cada mensaje JSON-RPC: `initialize` → `tools/list` → `tools/call` |
| `npm run demo:roots` | El filesystem server con y sin roots |
| `npm run status` | Status page de los servicios en http://localhost:4321 (la de la demo en vivo) |
| `npm run inspector` | MCP Inspector (UI web) conectado al server `incidents` |
| `npm run smoke` | Verifica que los servers del repo responden |
| `npm test` | Pruebas de la API de pagos |

## 9. Problemas comunes

| Síntoma | Solución |
|---|---|
| `claude mcp list` dice "Pending approval" | Abre `claude` en la raíz del repo y aprueba el server del `.mcp.json` |
| La primera conexión tarda | `npx` está descargando el paquete. Espera unos segundos y revisa `/mcp` |
| Windows nativo: un server con `npx` no arranca | Prueba con `cmd /c npx …` en lugar de `npx …`, o trabaja en WSL |
| Claude usa sus tools Read/Write en vez de las MCP | Pídeselo explícitamente: "usa sólo las tools mcp__filesystem__*" |
| `/changelog` no aparece | Corre `/reload-skills`; si la carpeta `.claude/skills` no existía al abrir la sesión, hace falta |
| `Shell command permission check failed` al invocar el skill | Al skill le falta `Bash(git tag *)` en `allowed-tools` |
| `git tag` no muestra nada | Descargaste el ZIP. Clona el repo con `git clone` |

---

## Contexto: la API de pagos

```bash
npm start   # http://localhost:3000
npm test
```

`POST /sessions` → token · `POST /payments` (tarjeta, SPEI u OXXO) · `POST /refunds` (total o parcial) · `GET /reports/reconciliation?day=YYYY-MM-DD` (sin release todavía). Detalle de reembolsos en [docs/refunds.md](docs/refunds.md).
