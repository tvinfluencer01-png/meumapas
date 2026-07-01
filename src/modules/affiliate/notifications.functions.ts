// FASE 4E — Server functions para notificações e webhooks outbound (Admin + Afiliado).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: any) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
}

async function getAffiliateId(ctx: any) {
  const { data } = await ctx.supabase
    .from("affiliate_profiles").select("id").eq("user_id", ctx.userId).maybeSingle();
  return data?.id as string | undefined;
}

// ═══════════════ Templates ═══════════════
export const listNotificationTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("affiliate_notification_templates").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

const templateSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1),
  name: z.string().min(1),
  channel: z.enum(["push", "email", "inapp", "webhook"]),
  subject: z.string().nullish(),
  body: z.string().min(1),
  icon_url: z.string().nullish(),
  action_url: z.string().nullish(),
  variables: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

export const upsertNotificationTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => templateSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("affiliate_notification_templates")
      .upsert({ ...data, variables: data.variables ?? [] })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteNotificationTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    await context.supabase.from("affiliate_notification_templates").delete().eq("id", data.id);
    return { ok: true };
  });

// ═══════════════ Rules ═══════════════
export const listNotificationRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("affiliate_notification_rules")
      .select("*, affiliate_notification_templates(name, channel)")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

const ruleSchema = z.object({
  id: z.string().uuid().optional(),
  event_key: z.string().min(1),
  template_id: z.string().uuid(),
  filters: z.record(z.any()).optional(),
  cooldown_seconds: z.number().int().nonnegative().optional(),
  enabled: z.boolean().optional(),
});

export const upsertNotificationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ruleSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("affiliate_notification_rules")
      .upsert({ ...data, filters: data.filters ?? {} })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteNotificationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    await context.supabase.from("affiliate_notification_rules").delete().eq("id", data.id);
    return { ok: true };
  });

// ═══════════════ Outbound Webhooks ═══════════════
export const listOutboundWebhooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("affiliate_outbound_webhooks").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

const webhookSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  target_url: z.string().url(),
  secret: z.string().min(8),
  events: z.array(z.string()).default([]),
  enabled: z.boolean().optional(),
  headers: z.record(z.string()).optional(),
});

export const upsertOutboundWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => webhookSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("affiliate_outbound_webhooks")
      .upsert({ ...data, headers: data.headers ?? {} })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteOutboundWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    await context.supabase.from("affiliate_outbound_webhooks").delete().eq("id", data.id);
    return { ok: true };
  });

// ═══════════════ Dispatches / Deliveries ═══════════════
export const listNotificationDispatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().max(200).optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows } = await context.supabase
      .from("affiliate_notification_dispatches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    return rows ?? [];
  });

export const listWebhookDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ webhook_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("affiliate_outbound_webhook_deliveries")
      .select("*").order("created_at", { ascending: false }).limit(100);
    if (data.webhook_id) q = q.eq("webhook_id", data.webhook_id);
    const { data: rows } = await q;
    return rows ?? [];
  });

// ═══════════════ Push subscriptions (Afiliado) ═══════════════
const pushSubSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string(),
  auth: z.string(),
  user_agent: z.string().optional(),
});

export const registerPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pushSubSchema.parse(d))
  .handler(async ({ context, data }) => {
    const affiliateId = await getAffiliateId(context);
    if (!affiliateId) throw new Error("Afiliado não encontrado");
    const { data: row, error } = await context.supabase
      .from("affiliate_push_subscriptions")
      .upsert({
        affiliate_id: affiliateId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.user_agent ?? null,
        enabled: true,
      }, { onConflict: "affiliate_id,endpoint" })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const unregisterPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ endpoint: z.string().url() }).parse(d))
  .handler(async ({ context, data }) => {
    const affiliateId = await getAffiliateId(context);
    if (!affiliateId) throw new Error("Afiliado não encontrado");
    await context.supabase
      .from("affiliate_push_subscriptions")
      .delete().eq("affiliate_id", affiliateId).eq("endpoint", data.endpoint);
    return { ok: true };
  });

// ═══════════════ Trigger de teste (admin) ═══════════════
export const testDispatchEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    event_key: z.string().min(1),
    affiliate_id: z.string().uuid().optional(),
    variables: z.record(z.any()).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { dispatchEvent } = await import("./notifications.server");
    return await dispatchEvent(context.supabase, {
      event_key: data.event_key,
      affiliate_id: data.affiliate_id ?? null,
      variables: data.variables ?? {},
    });
  });
