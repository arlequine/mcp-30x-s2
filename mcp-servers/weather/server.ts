/**
 * MCP server "weather" · el ejemplo de la lámina "La misma tool, dos mundos".
 * Los datos son simulados (no llama a ninguna API) para que funcione sin red.
 *
 * Registrar: claude mcp add weather -- npx tsx mcp-servers/weather/server.ts
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const FAKE_WEATHER: Record<string, { tempC: number; sky: string }> = {
  "ciudad de mexico": { tempC: 19, sky: "nublado con lluvia por la tarde" },
  guadalajara: { tempC: 23, sky: "parcialmente nublado" },
  monterrey: { tempC: 29, sky: "soleado" },
  merida: { tempC: 33, sky: "caluroso y húmedo" },
};

async function getWeather(city: string): Promise<string> {
  const key = city.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const w = FAKE_WEATHER[key];
  return w ? `${city}: ${w.tempC} °C, ${w.sky} (dato simulado)` : `No tengo datos simulados para ${city}`;
}

const server = new McpServer({ name: "weather", version: "1.0.0" });

server.registerTool(
  "get_weather",
  {
    description: "Clima por ciudad",
    inputSchema: { city: z.string() },
    annotations: { readOnlyHint: true },
  },
  async ({ city }) => ({
    content: [{ type: "text", text: await getWeather(city) }],
  }),
);

await server.connect(new StdioServerTransport());
console.error("[weather] MCP server listo (stdio)");
