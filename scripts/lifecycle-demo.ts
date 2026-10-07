/**
 * Demo del ciclo de vida de MCP: imprime cada mensaje JSON-RPC entre un cliente
 * y el server "incidents":  initialize → initialized → tools/list → tools/call
 *
 *   npm run demo:lifecycle
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const color = { out: "\x1b[38;5;191m", in: "\x1b[38;5;250m", dim: "\x1b[2m", reset: "\x1b[0m", bold: "\x1b[1m" };

/** Recorta strings y arreglos largos para que el mensaje quepa en pantalla. */
function compact(value: unknown): unknown {
  if (typeof value === "string") return value.length > 140 ? `${value.slice(0, 140)}… (${value.length} chars)` : value;
  if (Array.isArray(value)) {
    const head = value.slice(0, 4).map(compact);
    return value.length > 4 ? [...head, `… +${value.length - 4} más`] : head;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, compact(v)]));
  }
  return value;
}

function print(direction: "→" | "←", msg: JSONRPCMessage): void {
  const m = msg as { method?: string; id?: number };
  const label = m.method ?? `respuesta a id ${m.id}`;
  const c = direction === "→" ? color.out : color.in;
  console.log(`\n${c}${color.bold}${direction} ${label}${color.reset}`);
  console.log(c + JSON.stringify(compact(msg), null, 2) + color.reset);
}

function step(title: string): void {
  console.log(`\n${color.dim}──────── ${title} ────────${color.reset}`);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["--import", "tsx", resolve(ROOT, "mcp-servers/incidents/server.ts")],
  cwd: ROOT,
  stderr: "ignore",
});

// Intercepta lo que sale (send) y lo que entra (onmessage) sin tocar el SDK.
const send = transport.send.bind(transport);
transport.send = async (msg) => {
  print("→", msg);
  return send(msg);
};
let inner: ((m: JSONRPCMessage) => void) | undefined;
Object.defineProperty(transport, "onmessage", {
  configurable: true,
  get: () => (inner ? (m: JSONRPCMessage) => (print("←", m), inner!(m)) : undefined),
  set: (fn) => (inner = fn),
});

const client = new Client({ name: "lifecycle-demo", version: "1.0.0" });

step("1 · initialize + notifications/initialized (handshake)");
await client.connect(transport);

step("2 · tools/list (descubrimiento)");
await client.listTools();

step("3 · tools/call (ejecución)");
await client.callTool({ name: "get_incident_stats", arguments: { service: "payments" } });

await client.close();
console.log(`\n${color.dim}Listo. Esto mismo hace Claude Code por ti con cada server que registras.${color.reset}\n`);
