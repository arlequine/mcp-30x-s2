/**
 * Demo "verifica, no supongas": el filesystem server con y sin la capacidad roots.
 *
 * Arranca el server oficial con `./data ./reports` dos veces:
 *   A) un cliente SIN roots           → el server respeta los argumentos
 *   B) un cliente CON roots = el repo → el server reemplaza los argumentos por los roots
 *      (así se comporta Claude Code, que anuncia roots con el directorio del proyecto)
 *
 *   npm run demo:roots
 */
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ListRootsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const FS_SERVER = resolve(dirname(require.resolve("@modelcontextprotocol/server-filesystem/package.json")), "dist/index.js");

type Outcome = { allowed: string; insideRepo: string; outsideRepo: string };

function text(result: unknown): string {
  const r = result as { content?: { type: string; text?: string }[]; isError?: boolean };
  const t = r.content?.map((c) => c.text ?? "").join(" ").trim() ?? "";
  return r.isError ? `❌ ${t.split("\n")[0].slice(0, 70)}` : t;
}

async function run(withRoots: boolean): Promise<Outcome> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [FS_SERVER, "./data", "./reports"],
    cwd: ROOT,
    stderr: "ignore",
  });
  const client = new Client(
    { name: withRoots ? "cliente-con-roots" : "cliente-sin-roots", version: "1.0.0" },
    { capabilities: withRoots ? { roots: { listChanged: true } } : {} },
  );
  if (withRoots) {
    client.setRequestHandler(ListRootsRequestSchema, async () => ({
      roots: [{ uri: pathToFileURL(ROOT).href, name: "30x-mcp-lab" }],
    }));
  }
  await client.connect(transport);
  await new Promise((r) => setTimeout(r, 1000)); // el server pide roots/list justo después del handshake

  const allowed = text(await client.callTool({ name: "list_allowed_directories", arguments: {} }))
    .replace(/^Allowed directories:\s*/i, "")
    .split(/\s+/)
    .map((d) => d.replace(ROOT, "<repo>"))
    .join("  ");
  const inside = await client.callTool({ name: "get_file_info", arguments: { path: resolve(ROOT, "src/server.ts") } });
  const outside = await client.callTool({ name: "get_file_info", arguments: { path: resolve(ROOT, "..") } });
  await client.close();
  return {
    allowed,
    insideRepo: (inside as { isError?: boolean }).isError ? "❌ denegado" : "✅ permitido",
    outsideRepo: (outside as { isError?: boolean }).isError ? "❌ denegado" : "✅ permitido",
  };
}

const a = await run(false);
const b = await run(true);

console.log("\nFilesystem server registrado con:  ./data ./reports\n");
console.table({
  "A · cliente sin roots": a,
  "B · cliente con roots (como Claude Code)": b,
});
console.log(
  "\nallowed     → lo que responde list_allowed_directories" +
    "\ninsideRepo  → leer src/server.ts (dentro del repo, fuera de data/ y reports/)" +
    "\noutsideRepo → leer la carpeta padre del repo\n" +
    "\nLección: la configuración declara una intención; el menor privilegio se VERIFICA.\n",
);
