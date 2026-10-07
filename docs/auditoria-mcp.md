# Checklist · auditar un MCP server de terceros

Un MCP server es código que corre con **tus** permisos y cuyas descripciones lee el modelo. Antes de conectarlo, responde esto con evidencia.

**Server:** ______________________  **Versión revisada:** __________  **Fecha:** __________

## 1. Origen y mantenimiento
- [ ] ¿Quién lo publica? ¿Organización conocida o cuenta personal?
- [ ] ¿El código fuente es público? Enlace: ______________________
- [ ] ¿Tiene actividad reciente (commits, releases, issues atendidos)?
- [ ] ¿Hay reportes de seguridad abiertos o un SECURITY.md?

## 2. Versión y cadena de suministro
- [ ] ¿Lo vas a fijar a una versión exacta (`paquete@x.y.z`) en lugar de `latest`?
- [ ] ¿Cuántas dependencias trae? ¿Alguna desconocida?
- [ ] Si es un server remoto: ¿quién opera el endpoint y dónde corre?

## 3. Superficie expuesta
Corre `/mcp` en Claude Code o `npx @modelcontextprotocol/inspector` y lista lo que expone.

| Primitivo | Nombre | ¿Lee o escribe? | `readOnlyHint` / `destructiveHint` |
|---|---|---|---|
| tool | | | |
| tool | | | |
| resource | | | |
| prompt | | | |

- [ ] Lee las **descripciones** de cada tool: ¿alguna trae instrucciones para el modelo que no tienen que ver con la tool (tool poisoning)?
- [ ] ¿Alguna tool ejecuta comandos, borra datos o envía información fuera?

## 4. Datos y permisos
- [ ] ¿A qué carpetas, bases de datos o APIs accede?
- [ ] ¿Qué credenciales necesita? ¿Pueden ser de solo lectura o de alcance mínimo?
- [ ] ¿Dónde se guardan esas credenciales? (variables de entorno, nunca en el repo)
- [ ] ¿Respeta límites que configuras? **Verifícalo**, no lo supongas (ver `npm run demo:roots`).

## 5. Red y contenido externo
- [ ] ¿A qué hosts se conecta?
- [ ] ¿Trae contenido que escriben terceros (issues, páginas web, correos)? Si sí, hay riesgo de **prompt injection**.

## 6. Cambios futuros
- [ ] Si el server se actualiza, ¿cómo te enteras? (versión fija, changelog, revisión en PR)

## Decisión
- [ ] Aprobar
- [ ] Aprobar con restricciones (pega aquí las reglas de `settings.json`):
  ```json
  {
    "permissions": {
      "allow": [],
      "ask": [],
      "deny": []
    }
  }
  ```
- [ ] Rechazar · Motivo: ______________________
