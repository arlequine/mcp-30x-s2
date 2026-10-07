/**
 * Status page de payments-api (semana 40) para la demo en vivo con Playwright MCP.
 *
 *   npm run status   →   http://localhost:4321
 *
 * Páginas:
 *   /                    resumen: estado por servicio, errores por día y formulario de tickets
 *   /service/<nombre>    detalle de un servicio: errores por código y línea de tiempo
 *   POST /tickets        crea un ticket (se guarda en memoria mientras corre el server)
 */
import { createServer, type ServerResponse } from "node:http";
import { SERVICES, loadEntries, statsFor, type LogEntry, type Service } from "../mcp-servers/incidents/logs.js";

const PORT = Number(process.env.STATUS_PORT ?? 4321);
const DAYS = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"];
const DAY_LABEL = ["lun 28", "mar 29", "mié 30", "jue 1", "vie 2", "sáb 3", "dom 4"];
const COLOR: Record<Service, string> = { payments: "#c8e64d", auth: "#7cc4fa", notifications: "#f0a35c" };

interface Ticket { id: string; service: Service; severity: string; title: string; createdAt: string }
const tickets: Ticket[] = [];

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function status(errors: number): { label: string; cls: string } {
  if (errors >= 30) return { label: "Incidente mayor", cls: "red" };
  if (errors >= 15) return { label: "Degradado", cls: "amber" };
  return { label: "Fallas menores", cls: "green" };
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><link rel="icon" href="data:,">
<style>
  :root { --bg:#0d0d0d; --card:#1a1a1a; --line:#2e2e2e; --text:#f2f2f2; --muted:#a6a6a6; --lime:#c8e64d; --red:#f0645c; --amber:#f2b84b; --green:#6fd08c; }
  * { box-sizing:border-box } body { margin:0; background:var(--bg); color:var(--text); font:16px/1.45 system-ui,-apple-system,"Segoe UI",Arial,sans-serif }
  header { border-top:6px solid var(--lime); padding:20px 32px; display:flex; align-items:baseline; gap:16px; flex-wrap:wrap }
  header h1 { margin:0; font-size:26px } header span { color:var(--muted) }
  nav { padding:0 32px; display:flex; gap:8px; flex-wrap:wrap } nav a { color:var(--text); text-decoration:none; padding:8px 14px; border:1px solid var(--line); border-radius:999px }
  nav a.active { background:var(--lime); color:#0d0d0d; border-color:var(--lime); font-weight:700 }
  main { padding:24px 32px 48px; display:grid; gap:24px; max-width:1200px }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:16px }
  .card { background:var(--card); border-radius:12px; padding:18px 20px }
  .card h2 { margin:0 0 6px; font-size:20px } .big { font-size:44px; font-weight:800; line-height:1 } .muted { color:var(--muted) }
  .badge { display:inline-block; padding:3px 10px; border-radius:999px; font-size:13px; font-weight:700; color:#0d0d0d }
  .badge.red { background:var(--red) } .badge.amber { background:var(--amber) } .badge.green { background:var(--green) }
  h3 { margin:0 0 12px; font-size:18px } table { width:100%; border-collapse:collapse; font-size:14px }
  th,td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:top } th { color:var(--muted); font-weight:600 }
  code { font-family:ui-monospace,Consolas,monospace; color:var(--lime) }
  .bar { height:22px; background:var(--lime); border-radius:4px } .legend { display:flex; gap:16px; font-size:14px; color:var(--muted) }
  .legend i { display:inline-block; width:12px; height:12px; border-radius:3px; margin-right:6px; vertical-align:-1px }
  form { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; align-items:end }
  .field { display:grid; gap:6px } label { font-size:14px; color:var(--muted) }
  input,select { background:#111; color:var(--text); border:1px solid var(--line); border-radius:8px; padding:10px; font-size:15px }
  button { background:var(--lime); color:#0d0d0d; border:0; border-radius:8px; padding:11px 16px; font-weight:800; font-size:15px; cursor:pointer }
  .flash { background:#1e2410; border:1px solid var(--lime); color:var(--lime); padding:10px 14px; border-radius:8px }
</style></head><body>
<header><h1>payments-api · Estado de servicios</h1><span>Semana 40 · 28 sep – 4 oct 2026 · datos de data/incidents</span></header>
<nav aria-label="Secciones">
  <a href="/" class="${title === "Resumen" ? "active" : ""}">Resumen</a>
  ${SERVICES.map((s) => `<a href="/service/${s}" class="${title === s ? "active" : ""}">${s}</a>`).join("\n  ")}
</nav>
<main>${body}</main></body></html>`;
}

function errorsByDay(entries: LogEntry[]): string {
  const counts = DAYS.map((d) => SERVICES.map((s) => entries.filter((e) => e.level === "ERROR" && e.service === s && e.timestamp.startsWith(d)).length));
  const max = Math.max(...counts.map((c) => c.reduce((a, b) => a + b, 0)));
  const W = 760, H = 240, pad = 30, bw = 60, gap = (W - pad * 2 - bw * DAYS.length) / (DAYS.length - 1);
  const bars = counts.map((c, i) => {
    const x = pad + i * (bw + gap);
    let y = H - pad;
    const segs = c.map((n, k) => {
      const h = (n / max) * (H - pad * 2);
      y -= h;
      return n ? `<rect x="${x}" y="${y.toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" fill="${COLOR[SERVICES[k]]}"><title>${SERVICES[k]}: ${n}</title></rect>` : "";
    }).join("");
    const total = c.reduce((a, b) => a + b, 0);
    return `${segs}<text x="${x + bw / 2}" y="${(y - 6).toFixed(1)}" fill="#f2f2f2" font-size="13" text-anchor="middle">${total}</text>
      <text x="${x + bw / 2}" y="${H - 8}" fill="#a6a6a6" font-size="13" text-anchor="middle">${DAY_LABEL[i]}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Errores por día y servicio">${bars}</svg>
  <div class="legend">${SERVICES.map((s) => `<span><i style="background:${COLOR[s]}"></i>${s}</span>`).join("")}</div>`;
}

function overview(flash?: string): string {
  const entries = loadEntries();
  const cards = SERVICES.map((s) => {
    const st = statsFor(entries, s);
    const b = status(st.errors);
    return `<section class="card" aria-label="Servicio ${s}">
      <h2>${s}</h2>
      <p><span class="badge ${b.cls}">${b.label}</span></p>
      <div class="big">${st.errors}</div><div class="muted">errores en la semana</div>
      <p>Error más frecuente: <code>${st.mostFrequent ?? "-"}</code></p>
      <a href="/service/${s}" style="color:var(--lime)">Ver detalle de ${s} →</a>
    </section>`;
  }).join("");
  const rows = tickets.map((t) => `<tr><td>${t.id}</td><td>${t.service}</td><td>${esc(t.severity)}</td><td>${esc(t.title)}</td><td>${t.createdAt}</td></tr>`).join("");
  return page("Resumen", `
    ${flash ? `<div class="flash" role="status">${esc(flash)}</div>` : ""}
    <div class="cards">${cards}</div>
    <section class="card"><h3>Errores por día</h3>${errorsByDay(entries)}</section>
    <section class="card" id="tickets"><h3>Abrir ticket de incidente</h3>
      <form method="post" action="/tickets">
        <div class="field"><label for="service">Servicio</label><select name="service" id="service">${SERVICES.map((s) => `<option>${s}</option>`).join("")}</select></div>
        <div class="field"><label for="severity">Severidad</label><select name="severity" id="severity"><option>baja</option><option>media</option><option>alta</option></select></div>
        <div class="field" style="grid-column:span 2"><label for="title">Título</label><input name="title" id="title" required placeholder="Describe el incidente en una línea"></div>
        <button type="submit">Abrir ticket</button>
      </form>
      <h3 style="margin-top:20px">Tickets abiertos en esta sesión (${tickets.length})</h3>
      ${tickets.length ? `<table><thead><tr><th>ID</th><th>Servicio</th><th>Severidad</th><th>Título</th><th>Creado</th></tr></thead><tbody>${rows}</tbody></table>` : `<p class="muted">Todavía no hay tickets.</p>`}
    </section>`);
}

function detail(service: Service): string {
  const entries = loadEntries();
  const st = statsFor(entries, service);
  const b = status(st.errors);
  const max = Math.max(1, ...Object.values(st.byCode));
  const codes = Object.entries(st.byCode).sort((a, b) => b[1] - a[1]).map(([code, n]) =>
    `<tr><td><code>${code}</code></td><td style="width:60%"><div class="bar" style="width:${(n / max) * 100}%"></div></td><td>${n}</td></tr>`).join("");
  const timeline = entries.filter((e) => e.service === service && e.level !== "INFO")
    .map((e) => {
      const msg = /msg="([^"]*)"/.exec(e.raw)?.[1] ?? e.raw.split(`code=${e.code}`)[1]?.trim() ?? "";
      return `<tr><td>${e.timestamp.replace("T", " ").slice(0, 19)} UTC</td><td>${e.level}</td><td><code>${e.code}</code></td><td>${esc(msg)}</td></tr>`;
    }).join("");
  return page(service, `
    <div class="cards">
      <section class="card"><h2>${service}</h2><p><span class="badge ${b.cls}">${b.label}</span></p>
        <div class="big">${st.errors}</div><div class="muted">errores · ${st.warnings} warnings</div></section>
      <section class="card" style="grid-column:span 2"><h3>Errores por código</h3><table><tbody>${codes}</tbody></table></section>
    </div>
    <section class="card"><h3>Línea de tiempo (WARN y ERROR)</h3>
      <table><thead><tr><th>Hora</th><th>Nivel</th><th>Código</th><th>Mensaje</th></tr></thead><tbody>${timeline}</tbody></table>
    </section>`);
}

function send(res: ServerResponse, status: number, html: string, headers: Record<string, string> = {}): void {
  res.writeHead(status, { "content-type": "text/html; charset=utf-8", ...headers });
  res.end(html);
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  if (req.method === "GET" && url.pathname === "/") return send(res, 200, overview(url.searchParams.get("ok") ?? undefined));
  const m = /^\/service\/(\w+)$/.exec(url.pathname);
  if (req.method === "GET" && m && (SERVICES as readonly string[]).includes(m[1])) return send(res, 200, detail(m[1] as Service));
  if (req.method === "POST" && url.pathname === "/tickets") {
    let body = "";
    for await (const chunk of req) body += chunk;
    const form = new URLSearchParams(body);
    const service = form.get("service") as Service;
    const title = (form.get("title") ?? "").trim();
    if (!(SERVICES as readonly string[]).includes(service) || !title) return send(res, 400, page("Error", "<p>Faltan datos del ticket.</p>"));
    const ticket: Ticket = {
      id: `TCK-${String(tickets.length + 1).padStart(3, "0")}`,
      service,
      severity: form.get("severity") ?? "media",
      title,
      createdAt: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
    };
    tickets.push(ticket);
    console.log(`[status] ticket ${ticket.id} creado: ${service} · ${ticket.severity} · ${title}`);
    return send(res, 303, "", { location: `/?ok=${encodeURIComponent(`Ticket ${ticket.id} creado`)}#tickets` });
  }
  send(res, 404, page("No encontrado", "<p>Página no encontrada.</p>"));
}).listen(PORT, () => console.log(`Status page en http://localhost:${PORT}  (Ctrl+C para detener)`));
