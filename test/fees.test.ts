import { test } from "node:test";
import assert from "node:assert/strict";
import { calcFee, roundToCents } from "../src/fees.js";

test("tarjeta: 2.9% + 3 MXN", () => {
  assert.equal(calcFee(100, "card"), 5.9);
});

test("SPEI: 0.5% sin comisión fija", () => {
  assert.equal(calcFee(1000, "spei"), 5);
});

test("OXXO: 3.5% + 10 MXN", () => {
  assert.equal(calcFee(200, "oxxo"), 17);
});

test("redondea a centavos", () => {
  assert.equal(calcFee(333.33, "card"), 12.67);
  assert.equal(roundToCents(1.005), 1.01);
});
