export interface PspEvent {
  id: string;
  type: "charge.succeeded" | "charge.failed" | "refund.succeeded";
  pspReference: string;
}

const handled: PspEvent[] = [];
const seenEventIds = new Set<string>();

/**
 * Procesa un webhook del PSP de forma idempotente: el PSP reintenta los
 * webhooks, así que un mismo evento puede llegar más de una vez.
 */
export function handleWebhook(event: PspEvent): { processed: boolean } {
  if (seenEventIds.has(event.id)) {
    return { processed: false };
  }
  seenEventIds.add(event.id);
  handled.push(event);
  return { processed: true };
}

export function handledEvents(): readonly PspEvent[] {
  return handled;
}
