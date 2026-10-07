import { test } from "node:test";
import assert from "node:assert/strict";
import { handleWebhook, handledEvents } from "../src/psp/webhooks.js";

test("un webhook duplicado no se procesa dos veces", () => {
  const event = { id: "evt_1", type: "charge.succeeded" as const, pspReference: "pagonet_1" };
  assert.equal(handleWebhook(event).processed, true);
  assert.equal(handleWebhook(event).processed, false);
  assert.equal(handledEvents().length, 1);
});
