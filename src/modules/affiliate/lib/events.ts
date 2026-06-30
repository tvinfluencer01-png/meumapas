// Simple in-process event bus for the affiliate module.
// Handlers run sequentially; failures are isolated (logged, never throw).

export type AffiliateEventName =
  | "affiliate.registered"
  | "affiliate.approved"
  | "affiliate.rejected"
  | "click.registered"
  | "conversion.recorded"
  | "order.recorded"
  | "commission.created"
  | "withdraw.requested";

type Handler<P = unknown> = (payload: P) => Promise<void> | void;

const handlers = new Map<string, Handler[]>();

export function on<P = unknown>(name: AffiliateEventName, handler: Handler<P>) {
  const arr = handlers.get(name) ?? [];
  arr.push(handler as Handler);
  handlers.set(name, arr);
}

export async function emit<P = unknown>(name: AffiliateEventName, payload: P) {
  const arr = handlers.get(name) ?? [];
  for (const h of arr) {
    try {
      await h(payload);
    } catch (e) {
      console.error(`[affiliate-events] handler failed for ${name}:`, e);
    }
  }
}
