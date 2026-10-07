/**
 * Cache del tipo de cambio USD/MXN. Consultar al proveedor en cada cargo era
 * lento y caro; con un TTL de 5 minutos el dato sigue siendo suficientemente fresco.
 */
export const FX_TTL_MS = 5 * 60 * 1000;

type Fetcher = () => Promise<number>;

let cached: { rate: number; fetchedAt: number } | undefined;

export async function getUsdMxnRate(fetchRate: Fetcher, now = Date.now()): Promise<number> {
  if (cached && now - cached.fetchedAt < FX_TTL_MS) {
    return cached.rate;
  }
  const rate = await fetchRate();
  cached = { rate, fetchedAt: now };
  return rate;
}

export function clearFxCache(): void {
  cached = undefined;
}
