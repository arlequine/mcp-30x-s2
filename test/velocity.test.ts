import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { MAX_TX_PER_WINDOW, WINDOW_MS, registerAndCheck, resetVelocity } from "../src/fraud/velocity.js";

beforeEach(() => resetVelocity());

test("no alerta por debajo del límite", () => {
  let result = { alert: false, count: 0 };
  for (let i = 0; i < MAX_TX_PER_WINDOW; i++) result = registerAndCheck("cus_1", 1_000 + i);
  assert.equal(result.alert, false);
});

test("alerta al superar el límite dentro de la ventana", () => {
  let result = { alert: false, count: 0 };
  for (let i = 0; i <= MAX_TX_PER_WINDOW; i++) result = registerAndCheck("cus_2", 1_000 + i);
  assert.equal(result.alert, true);
});

test("la ventana expira", () => {
  for (let i = 0; i < MAX_TX_PER_WINDOW; i++) registerAndCheck("cus_3", 1_000 + i);
  const result = registerAndCheck("cus_3", 1_000 + WINDOW_MS + 10);
  assert.equal(result.count, 1);
});
