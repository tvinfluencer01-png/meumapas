// FASE 4E — Motor de notificações e webhooks outbound.
// Server-only helpers.

type Db = any;

type NotifyContext = {
  event_key: string;
  affiliate_id?: string | null;
  variables?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

function renderTemplate(text: string | null | undefined, vars: Record<string, unknown>): string {
  if (!text) return "";
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const parts = key.split(".");
    let cur: any = vars;
    for (const p of parts) cur = cur?.[p];
    return cur == null ? "" : String(cur);
  });
}

async function sendPush(
  supabase: Db,
  affiliateId: string,
  title: string,
  body: string,
  actionUrl?: string,
  iconUrl?: string,
) {
  const { data: subs } = await supabase
    .from("affiliate_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("affiliate_id", affiliateId)
    .eq("enabled", true);
  if (!subs?.length) return { delivered: 0 };

  // Nota: envio VAPID/Web Push completo exige biblioteca web-push (Node-only).
  // Estratégia edge-safe: registrar payload em `affiliate_notification_dispatches`
  // e usar Service Worker do lado do cliente (via realtime) para exibir.
  // Aqui apenas armazenamos o payload para consumo pelo SW/UI.
  return { delivered: subs.length, title, body, actionUrl, iconUrl };
}

async function sendInApp(
  supabase: Db,
  affiliateId: string,
  title: string,
  body: string,
  actionUrl?: string,
) {
  await supabase.from("affiliate_notifications").insert({
    affiliate_id: affiliateId,
    title,
    body,
    action_url: actionUrl ?? null,
    kind: "info",
  });
  return { delivered: 1 };
}

async function sendEmail(
  supabase: Db,
  affiliateId: string,
  subject: string,
  body: string,
) {
  // Reaproveita SMTP configurado do sistema — apenas registra o dispatch.
  // Envio real (nodemailer) roda a partir do worker de e-mail existente.
  const { data: profile } = await supabase
    .from("affiliate_profiles")
    .select("user_id")
    .eq("id", affiliateId)
    .maybeSingle();
  if (!profile?.user_id) return { delivered: 0, error: "no_user" };
  return { delivered: 1, subject, body, userId: profile.user_id };
}

async function sendWebhook(
  supabase: Db,
  eventKey: string,
  payload: Record<string, unknown>,
) {
  const { data: hooks } = await supabase
    .from("affiliate_outbound_webhooks")
    .select("id, target_url, secret, headers, events")
    .eq("enabled", true);
  if (!hooks?.length) return { delivered: 0 };

  let delivered = 0;
  for (const hook of hooks) {
    const events = (hook.events as string[]) ?? [];
    if (events.length && !events.includes(eventKey) && !events.includes("*")) continue;
    const body = JSON.stringify({ event: eventKey, data: payload, ts: Date.now() });
    try {
      // HMAC-SHA256
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw", encoder.encode(hook.secret),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
      );
      const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
      const sig = Array.from(new Uint8Array(sigBuf))
        .map((b) => b.toString(16).padStart(2, "0")).join("");

      const headers: Record<string, string> = {
        "content-type": "application/json",
        "x-affiliate-signature": `sha256=${sig}`,
        "x-affiliate-event": eventKey,
        ...(hook.headers as Record<string, string> ?? {}),
      };
      const res = await fetch(hook.target_url, { method: "POST", headers, body });
      const text = await res.text().catch(() => "");
      await supabase.from("affiliate_outbound_webhook_deliveries").insert({
        webhook_id: hook.id, event_key: eventKey, payload,
        status_code: res.status, response_body: text.slice(0, 2000),
      });
      if (res.ok) {
        delivered++;
        await supabase.from("affiliate_outbound_webhooks")
          .update({ last_success_at: new Date().toISOString(), last_error: null })
          .eq("id", hook.id);
      } else {
        await supabase.from("affiliate_outbound_webhooks")
          .update({ last_error: `HTTP ${res.status}` }).eq("id", hook.id);
      }
    } catch (err: any) {
      await supabase.from("affiliate_outbound_webhook_deliveries").insert({
        webhook_id: hook.id, event_key: eventKey, payload, error: String(err?.message ?? err),
      });
      await supabase.from("affiliate_outbound_webhooks")
        .update({ last_error: String(err?.message ?? err) }).eq("id", hook.id);
    }
  }
  return { delivered };
}

/**
 * Dispara notificações para um evento aplicando todas as regras casadas.
 * Respeita cooldown por (afiliado, template).
 */
export async function dispatchEvent(supabase: Db, ctx: NotifyContext) {
  const { data: rules } = await supabase
    .from("affiliate_notification_rules")
    .select("id, template_id, filters, cooldown_seconds, enabled, affiliate_notification_templates!inner(*)")
    .eq("event_key", ctx.event_key)
    .eq("enabled", true);
  if (!rules?.length) return { dispatched: 0 };

  const vars = { ...(ctx.variables ?? {}), ...(ctx.payload ?? {}) };
  let dispatched = 0;

  for (const rule of rules) {
    const tmpl = (rule as any).affiliate_notification_templates;
    if (!tmpl?.enabled) continue;

    // Cooldown
    if (rule.cooldown_seconds > 0 && ctx.affiliate_id) {
      const since = new Date(Date.now() - rule.cooldown_seconds * 1000).toISOString();
      const { data: recent } = await supabase
        .from("affiliate_notification_dispatches")
        .select("id")
        .eq("template_id", tmpl.id)
        .eq("affiliate_id", ctx.affiliate_id)
        .gte("created_at", since)
        .limit(1);
      if (recent?.length) continue;
    }

    const subject = renderTemplate(tmpl.subject, vars);
    const body = renderTemplate(tmpl.body, vars);
    const actionUrl = renderTemplate(tmpl.action_url, vars);

    let result: any = { delivered: 0 };
    try {
      if (tmpl.channel === "push" && ctx.affiliate_id) {
        result = await sendPush(supabase, ctx.affiliate_id, subject || tmpl.name, body, actionUrl, tmpl.icon_url ?? undefined);
      } else if (tmpl.channel === "inapp" && ctx.affiliate_id) {
        result = await sendInApp(supabase, ctx.affiliate_id, subject || tmpl.name, body, actionUrl);
      } else if (tmpl.channel === "email" && ctx.affiliate_id) {
        result = await sendEmail(supabase, ctx.affiliate_id, subject || tmpl.name, body);
      } else if (tmpl.channel === "webhook") {
        result = await sendWebhook(supabase, ctx.event_key, { subject, body, ...vars });
      }
      await supabase.from("affiliate_notification_dispatches").insert({
        affiliate_id: ctx.affiliate_id ?? null,
        event_key: ctx.event_key,
        channel: tmpl.channel,
        template_id: tmpl.id,
        status: result.delivered > 0 ? "sent" : "skipped",
        payload: { subject, body, vars },
        response: result,
        sent_at: result.delivered > 0 ? new Date().toISOString() : null,
      });
      if (result.delivered > 0) dispatched++;
    } catch (err: any) {
      await supabase.from("affiliate_notification_dispatches").insert({
        affiliate_id: ctx.affiliate_id ?? null,
        event_key: ctx.event_key,
        channel: tmpl.channel,
        template_id: tmpl.id,
        status: "failed",
        payload: { subject, body, vars },
        error: String(err?.message ?? err),
      });
    }
  }

  // Sempre dispara webhooks outbound genéricos (mesmo sem template)
  try { await sendWebhook(supabase, ctx.event_key, { ...vars }); } catch { /* silent */ }

  return { dispatched };
}
