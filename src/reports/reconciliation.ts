import type { Payment } from "../payments.js";

/**
 * Genera el CSV de conciliación diaria que pide el equipo de finanzas.
 * Una fila por cargo creado en `day` (YYYY-MM-DD, UTC).
 */
export function reconciliationCsv(payments: Payment[], day: string): string {
  const header = "payment_id,created_at,method,amount_mxn,fee_mxn,refunded_mxn,net_mxn,psp_reference";
  const rows = payments
    .filter((p) => p.createdAt.startsWith(day))
    .map((p) => {
      const net = (p.amount - p.fee - p.refunded).toFixed(2);
      return [p.id, p.createdAt, p.method, p.amount.toFixed(2), p.fee.toFixed(2), p.refunded.toFixed(2), net, p.pspReference].join(",");
    });
  return [header, ...rows].join("\n") + "\n";
}
