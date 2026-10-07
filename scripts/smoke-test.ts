/**
 * Verifica que los servers MCP del repo funcionan antes de la clase.
 *   npm run smoke
 */
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function connect(serverPath: string): Promise<Client> {
  const client = new Client({ name: "smoke-test", version: "1.0.0" });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: ["--import", "tsx", resolve(ROOT, serverPath)],
      cwd: ROOT,
      stderr: "ignore",
    }),
  );
  return client;
}

function firstText(result: unknown): string {
  return (result as { content: { text: string }[] }).content[0].text;
}

// incidents
const incidents = await connect("mcp-servers/incidents/server.ts");
const tools = (await incidents.listTools()).tools.map((t) => t.name).sort();
assert.deepEqual(tools, ["get_incident_stats", "search_incidents"]);

const stats = JSON.parse(firstText(await incidents.callTool({ name: "get_incident_stats", arguments: {} })));
const byService = Object.fromEntries(stats.map((s: { service: string }) => [s.service, s]));
assert.equal(byService.payments.errors, 42);
assert.equal(byService.payments.mostFrequent, "TIMEOUT_PSP");
assert.equal(byService.auth.errors, 17);
assert.equal(byService.auth.mostFrequent, "TOKEN_EXPIRED");
assert.equal(byService.notifications.errors, 9);
assert.equal(byService.notifications.mostFrequent, "SMTP_REJECTED");

const search = firstText(
  await incidents.callTool({ name: "search_incidents", arguments: { code: "TIMEOUT_PSP", from: "2026-09-29T14:00:00Z", to: "2026-09-29T14:30:00Z" } }),
);
assert.match(search, /^20 coincidencias/);

const resource = await incidents.readResource({ uri: "incidents://summary" });
assert.match((resource.contents[0] as { text: string }).text, /\| payments \| 42 \|/);

const prompt = await incidents.getPrompt({ name: "triage", arguments: { service: "auth" } });
assert.match((prompt.messages[0].content as { text: string }).text, /servicio auth/);
await incidents.close();

// weather
const weather = await connect("mcp-servers/weather/server.ts");
assert.match(firstText(await weather.callTool({ name: "get_weather", arguments: { city: "Monterrey" } })), /29 °C/);
await weather.close();

console.log("✅ smoke test OK: incidents (2 tools, 1 resource, 1 prompt) y weather responden como se espera");
