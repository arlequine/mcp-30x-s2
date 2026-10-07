/**
 * Cliente del PSP (proveedor de pagos). En este proyecto de práctica es un
 * simulador: en producción haría una llamada HTTP a la API del proveedor.
 */
export interface ChargeResult {
  pspReference: string;
  status: "approved" | "declined";
}

export const PSP_TIMEOUT_MS = 30_000;

export async function charge(amount: number, method: string): Promise<ChargeResult> {
  await new Promise((resolve) => setTimeout(resolve, 5));
  const declined = method === "card" && amount > 50_000;
  return {
    pspReference: `pagonet_${Math.random().toString(36).slice(2, 10)}`,
    status: declined ? "declined" : "approved",
  };
}
