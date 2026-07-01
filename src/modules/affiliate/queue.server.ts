/**
 * Event queue assíncrona (backed pelo Postgres) para o Affiliate Center.
 * enqueue: adiciona job; drain: processa em lote (chamado pelo cron).
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type QueueEventType =
  | "tracking.session.upsert"
  | "tracking.event.record"
  | "tracking.touchpoint.record"
  | "order.commission.compute"
  | "order.commission.release"
  | "fraud.evaluate"
  | "notification.dispatch";

export interface EnqueueOptions {
  priority?: number;
  scheduledFor?: Date;
  correlationId?: string;
  source?: string;
  maxAttempts?: number;
}

export async function enqueueEvent(
  eventType: QueueEventType,
  payload: Record<string, unknown>,
  opts: EnqueueOptions = {},
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("affiliate_event_queue")
    .insert({
      event_type: eventType,
      payload: payload as never,
      priority: opts.priority ?? 5,
      scheduled_for: (opts.scheduledFor ?? new Date()).toISOString(),
      correlation_id: opts.correlationId ?? null,
      source: opts.source ?? null,
      max_attempts: opts.maxAttempts ?? 5,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

type Handler = (payload: Record<string, unknown>) => Promise<void>;

const handlers: Partial<Record<QueueEventType, Handler>> = {};

export function registerHandler(eventType: QueueEventType, handler: Handler): void {
  handlers[eventType] = handler;
}

export interface DrainResult {
  processed: number;
  failed: number;
  deadLettered: number;
}

export async function drainQueue(batchSize = 25): Promise<DrainResult> {
  const result: DrainResult = { processed: 0, failed: 0, deadLettered: 0 };
  const nowIso = new Date().toISOString();

  const { data: jobs } = await supabaseAdmin
    .from("affiliate_event_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", nowIso)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (!jobs?.length) return result;

  for (const job of jobs) {
    // claim
    const { data: claimed } = await supabaseAdmin
      .from("affiliate_event_queue")
      .update({ status: "processing", attempts: (job.attempts ?? 0) + 1 })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const handler = handlers[job.event_type as QueueEventType];
    if (!handler) {
      await supabaseAdmin
        .from("affiliate_event_queue")
        .update({ status: "failed", last_error: `no handler for ${job.event_type}` })
        .eq("id", job.id);
      result.failed += 1;
      continue;
    }

    try {
      await handler((job.payload ?? {}) as Record<string, unknown>);
      await supabaseAdmin
        .from("affiliate_event_queue")
        .update({ status: "completed", processed_at: new Date().toISOString(), last_error: null })
        .eq("id", job.id);
      result.processed += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const attempts = (job.attempts ?? 0) + 1;
      const dead = attempts >= (job.max_attempts ?? 5);
      const backoffMs = Math.min(60_000 * Math.pow(2, attempts), 3_600_000);
      await supabaseAdmin
        .from("affiliate_event_queue")
        .update({
          status: dead ? "dead_letter" : "pending",
          last_error: msg,
          scheduled_for: new Date(Date.now() + backoffMs).toISOString(),
        })
        .eq("id", job.id);
      if (dead) result.deadLettered += 1;
      else result.failed += 1;
    }
  }
  return result;
}
