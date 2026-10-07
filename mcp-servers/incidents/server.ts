/**
 * MCP server "incidents" · expone los tres primitivos de MCP en un solo server:
 *
 *   Tool      get_incident_stats   conteo de errores por servicio y código
 *   Tool      search_incidents     busca líneas de log con filtros
 *   Resource  incidents://summary  resumen semanal en markdown (solo lectura)
 *   Prompt    triage               plantilla para que el agente haga el triage de un servicio
 *
 * Correr:      npx tsx mcp-servers/incidents/server.ts
 * Registrar:   claude mcp add incidents -- npx tsx mcp-servers/incidents/server.ts
 * Inspeccionar: npm run inspector
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SERVICES, loadEntries, statsFor, summaryMarkdown } from "./logs.js";

const server = new McpServer({ name: "incidents", version: "1.0.0" });

// ---------- Tool: estadísticas ----------
server.registerTool(
  "get_incident_stats",
  {
    title: "Estadísticas de incidentes",
    description:
      "Cuenta los errores de la semana por servicio y por código de error. " +
      "Úsala para saber qué servicio falló más y cuál fue su error más frecuente.",
    inputSchema: {
      service: z.enum(SERVICES).optional().describe("Servicio a consultar. Si se omite, devuelve todos."),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ service }) => {
    const entries = loadEntries();
    const services = service ? [service] : [...SERVICES];
    const stats = services.map((s) => statsFor(entries, s));
    return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }] };
  },
);

// ---------- Tool: búsqueda ----------
server.registerTool(
  "search_incidents",
  {
    title: "Buscar en los logs",
    description:
      "Devuelve líneas de log que cumplen los filtros (servicio, nivel, código, rango de fechas ISO). " +
      "Úsala para ver el detalle de un incidente: horas, mensajes y causa probable.",
    inputSchema: {
      service: z.enum(SERVICES).optional(),
      level: z.enum(["INFO", "WARN", "ERROR"]).optional(),
      code: z.string().optional().describe("Código exacto, p. ej. TIMEOUT_PSP"),
      from: z.string().optional().describe("Fecha/hora ISO inicial, p. ej. 2026-09-29T14:00:00Z"),
      to: z.string().optional().describe("Fecha/hora ISO final"),
      limit: z.number().int().min(1).max(200).default(50),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ service, level, code, from, to, limit }) => {
    const matches = loadEntries().filter(
      (e) =>
        (!service || e.service === service) &&
        (!level || e.level === level) &&
        (!code || e.code === code) &&
        (!from || e.timestamp >= from) &&
        (!to || e.timestamp <= to),
    );
    const shown = matches.slice(0, limit);
    const header = `${matches.length} coincidencias${matches.length > shown.length ? ` (mostrando ${shown.length})` : ""}`;
    return { content: [{ type: "text", text: [header, ...shown.map((e) => e.raw)].join("\n") }] };
  },
);

// ---------- Resource: resumen ----------
server.registerResource(
  "weekly-summary",
  "incidents://summary",
  {
    title: "Resumen semanal de incidentes",
    description: "Tabla de errores por servicio de la semana 40. Dato de solo lectura para adjuntar al contexto.",
    mimeType: "text/markdown",
  },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "text/markdown", text: summaryMarkdown(loadEntries()) }],
  }),
);

// ---------- Prompt: triage ----------
server.registerPrompt(
  "triage",
  {
    title: "Triage de un servicio",
    description: "Plantilla para que el agente haga el triage de incidentes de un servicio.",
    argsSchema: { service: z.enum(SERVICES) },
  },
  ({ service }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text:
            `Eres la persona de guardia (SRE) del servicio ${service}.\n` +
            "1. Usa get_incident_stats para ver el panorama.\n" +
            "2. Usa search_incidents para revisar el incidente más grave (horas y mensajes).\n" +
            "3. Entrega: impacto, causa probable, evidencia (2-3 líneas de log) y la siguiente acción.\n" +
            "No inventes datos: si algo no está en los logs, dilo.",
        },
      },
    ],
  }),
);

await server.connect(new StdioServerTransport());
// Importante: en stdio, stdout es el canal del protocolo. Los logs van a stderr.
console.error("[incidents] MCP server listo (stdio)");
