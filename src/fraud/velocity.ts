/**
 * Regla de fraude por velocidad: alerta cuando un cliente hace demasiados
 * cargos en una ventana corta de tiempo.
 */
export const WINDOW_MS = 10 * 60 * 1000;
export const MAX_TX_PER_WINDOW = 5;

const history = new Map<string, number[]>();

export function registerAndCheck(customerId: string, now = Date.now()): { alert: boolean; count: number } {
  const recent = (history.get(customerId) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  history.set(customerId, recent);
  return { alert: recent.length > MAX_TX_PER_WINDOW, count: recent.length };
}

export function resetVelocity(): void {
  history.clear();
}
