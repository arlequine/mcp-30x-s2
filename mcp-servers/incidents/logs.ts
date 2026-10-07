import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Carpeta de logs: data/incidents en la raíz del repo (o INCIDENTS_DIR si se define). */
export const INCIDENTS_DIR =
  process.env.INCIDENTS_DIR ?? resolve(dirname(fileURLToPath(import.meta.url)), "../../data/incidents");

export const SERVICES = ["payments", "auth", "notifications"] as const;
export type Service = (typeof SERVICES)[number];

export interface LogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  service: Service;
  code: string;
  raw: string;
}

const LINE = /^(\S+)\s+(INFO|WARN|ERROR)\s+\[(\w+)\]\s+code=(\S+)/;

export function loadEntries(dir = INCIDENTS_DIR): LogEntry[] {
  const entries: LogEntry[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".log"))) {
    for (const raw of readFileSync(join(dir, file), "utf8").split("\n")) {
      const m = LINE.exec(raw);
      if (!m) continue;
      entries.push({ timestamp: m[1], level: m[2] as LogEntry["level"], service: m[3] as Service, code: m[4], raw });
    }
  }
  return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export interface ServiceStats {
  service: Service;
  errors: number;
  warnings: number;
  byCode: Record<string, number>;
  mostFrequent: string | null;
  firstError: string | null;
  lastError: string | null;
}

export function statsFor(entries: LogEntry[], service: Service): ServiceStats {
  const mine = entries.filter((e) => e.service === service);
  const errors = mine.filter((e) => e.level === "ERROR");
  const byCode: Record<string, number> = {};
  for (const e of errors) byCode[e.code] = (byCode[e.code] ?? 0) + 1;
  const mostFrequent = Object.entries(byCode).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return {
    service,
    errors: errors.length,
    warnings: mine.filter((e) => e.level === "WARN").length,
    byCode,
    mostFrequent,
    firstError: errors[0]?.timestamp ?? null,
    lastError: errors.at(-1)?.timestamp ?? null,
  };
}

export function summaryMarkdown(entries: LogEntry[]): string {
  const rows = SERVICES.map((s) => statsFor(entries, s));
  const total = rows.reduce((acc, r) => acc + r.errors, 0);
  return [
    "# Resumen de incidentes · semana 40 (2026-09-28 a 2026-10-04)",
    "",
    `Total de errores: **${total}**`,
    "",
    "| Servicio | Errores | Warnings | Error más frecuente |",
    "|---|---|---|---|",
    ...rows.map((r) => `| ${r.service} | ${r.errors} | ${r.warnings} | ${r.mostFrequent ?? "-"} |`),
    "",
    "Fuente: archivos *.log de data/incidents. Para el detalle usa la tool search_incidents.",
  ].join("\n");
}
