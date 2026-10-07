export type PaymentMethod = "card" | "spei" | "oxxo";

/** Comisión porcentual por método de pago. */
const RATES: Record<PaymentMethod, number> = {
  card: 0.029,
  spei: 0.005,
  oxxo: 0.035,
};

/** Comisión fija en MXN por transacción. */
const FIXED_FEE_MXN: Record<PaymentMethod, number> = {
  card: 3,
  spei: 0,
  oxxo: 10,
};

/** Redondea a centavos (2 decimales) sin arrastrar errores de punto flotante. */
export function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calcFee(amount: number, method: PaymentMethod): number {
  return roundToCents(amount * RATES[method] + FIXED_FEE_MXN[method]);
}
