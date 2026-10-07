import { test } from "node:test";
import assert from "node:assert/strict";
import { createPayment } from "../src/payments.js";
import { refund } from "../src/refunds.js";

test("reembolso parcial y luego el resto", async () => {
  const p = await createPayment(500, "spei", "cus_refund");
  assert.equal(refund(p.id, 200).refunded, 200);
  assert.equal(refund(p.id).refunded, 500);
  assert.throws(() => refund(p.id), /ya fue reembolsado/);
});

test("no permite reembolsar más del saldo", async () => {
  const p = await createPayment(100, "spei", "cus_refund_2");
  assert.throws(() => refund(p.id, 150), /Sólo quedan/);
});
