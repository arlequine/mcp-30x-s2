import { ConflictError, NotFoundError, ValidationError } from "./errors.js";
import { roundToCents } from "./fees.js";
import { getPayment, type Payment } from "./payments.js";

/**
 * Reembolsa un cargo de forma total o parcial.
 * Sin `amount` se reembolsa el saldo pendiente.
 */
export function refund(paymentId: string, amount?: number): Payment {
  const payment = getPayment(paymentId);
  if (!payment) throw new NotFoundError(`No existe el cargo ${paymentId}`);

  const remaining = roundToCents(payment.amount - payment.refunded);
  if (remaining <= 0) throw new ConflictError("El cargo ya fue reembolsado por completo");

  const toRefund = amount ?? remaining;
  if (!Number.isFinite(toRefund) || toRefund <= 0) {
    throw new ValidationError("amount debe ser mayor a 0");
  }
  if (toRefund > remaining) {
    throw new ValidationError(`Sólo quedan ${remaining} MXN por reembolsar`);
  }
  payment.refunded = roundToCents(payment.refunded + toRefund);
  return payment;
}
