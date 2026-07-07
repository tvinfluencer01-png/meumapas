/**
 * Fallback ativo (a cada 1 min via pg_cron): varre leads pendentes
 * criados nas últimas 24h e consulta a Evolution API pelas mensagens
 * recebidas daquele telefone. Se encontrar o `activation_code` no texto,
 * ativa o lead — sem depender de webhook.
 *
 * Autenticação: apikey = SUPABASE_PUBLISHABLE_KEY.
 */
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/hooks/horoscope-poll")({
  server: { handlers: { POST: handler, GET: handler } },
});

async function handler({ request }: { request: Request }) {
  const apikey = request.headers.get("apikey");
  const authorized =
    apikey === process.env.SUPABASE_PUBLISHABLE_KEY ||
    apikey === process.env.SUPABASE_ANON_KEY;
  if (!authorized) return new Response("Unauthorized", { status: 401 });

  const { data: evo } = await (supabaseAdmin as any)
    .from("evolution_settings").select("*").eq("id", true).maybeSingle();
  if (!evo?.enabled || !evo?.base_url || !evo?.global_api_key || !evo?.instance_name) {
    return Response.json({ ok: false, reason: "evolution not configured" });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: leads } = await (supabaseAdmin as any)
    .from("horoscope_free_leads")
    .select("id, phone_e164, activation_code, trial_days, retry_count, last_retry_at, created_at")
    .eq("status", "pending_confirmation")
    .gte("created_at", since)
    .limit(50);
  if (!leads?.length) return Response.json({ ok: true, checked: 0, activated: 0, retried: 0 });

  const { data: settings } = await (supabaseAdmin as any)
    .from("horoscope_landing_settings")
    .select("trial_days, confirmation_reply, retry_after_minutes, max_retries, whatsapp_number_e164, activation_keyword")
    .eq("id", true).maybeSingle();

  const retryAfterMs = Math.max(1, Number(settings?.retry_after_minutes ?? 10)) * 60_000;
  const maxRetries = Math.max(0, Number(settings?.max_retries ?? 2));
  const keyword = String(settings?.activation_keyword ?? "ATIVAR").toUpperCase();

  const base = String(evo.base_url).replace(/\/+$/, "");
  const inst = encodeURIComponent(evo.instance_name);
  let activated = 0;
  let retried = 0;

  for (const lead of leads) {
    const digits = String(lead.phone_e164).replace(/\D+/g, "");
    const jid = `${digits}@s.whatsapp.net`;
    try {
      // Evolution v2: POST chat/findMessages/{instance}
      const r = await fetch(`${base}/chat/findMessages/${inst}`, {
        method: "POST",
        headers: { apikey: evo.global_api_key, "Content-Type": "application/json" },
        body: JSON.stringify({ where: { key: { remoteJid: jid } }, limit: 20 }),
      });
      if (!r.ok) continue;
      const json: any = await r.json().catch(() => null);
      const arr: any[] = Array.isArray(json) ? json : (json?.messages?.records ?? json?.records ?? json?.messages ?? []);
      const code = String(lead.activation_code).toUpperCase();
      const hit = arr.find((m) => {
        if (m?.key?.fromMe) return false;
        const t = (m?.message?.conversation ?? m?.message?.extendedTextMessage?.text ?? m?.body ?? "").toString().toUpperCase();
        return t.includes(code);
      });
      if (!hit) continue;

      const trialDays = Number(settings?.trial_days ?? lead.trial_days ?? 7);
      const { buildActivationPatch, tryActivateLead } = await import("@/lib/horoscope-activation.server");
      const didActivate = await tryActivateLead(supabaseAdmin, lead.id, buildActivationPatch(trialDays));
      if (!didActivate) continue; // já ativado por webhook concorrente


      const reply = settings?.confirmation_reply ??
        `✨ Cadastro confirmado! A partir de amanhã, você receberá seu horóscopo por ${trialDays} dias.`;
      await fetch(`${base}/message/sendText/${inst}`, {
        method: "POST",
        headers: { apikey: evo.global_api_key, "Content-Type": "application/json" },
        body: JSON.stringify({ number: digits, text: reply }),
      }).catch(() => {});

      activated++;
    } catch {
      // continue
    }

    // Retentativa: se ainda pendente e passou do intervalo, reenvia o código.
    try {
      if (maxRetries > 0 && (lead.retry_count ?? 0) < maxRetries) {
        const lastMs = lead.last_retry_at
          ? new Date(lead.last_retry_at).getTime()
          : new Date(lead.created_at).getTime();
        if (Date.now() - lastMs >= retryAfterMs) {
          const msg = `⏳ Ainda não recebemos sua confirmação. Envie *${keyword}-${lead.activation_code}* para ativar seu horóscopo grátis.`;
          const { data: bumped } = await (supabaseAdmin as any)
            .from("horoscope_free_leads")
            .update({
              retry_count: (lead.retry_count ?? 0) + 1,
              last_retry_at: new Date().toISOString(),
            })
            .eq("id", lead.id)
            .eq("status", "pending_confirmation")
            .eq("retry_count", lead.retry_count ?? 0) // trava otimista
            .select("id");
          if (bumped?.length) {
            await fetch(`${base}/message/sendText/${inst}`, {
              method: "POST",
              headers: { apikey: evo.global_api_key, "Content-Type": "application/json" },
              body: JSON.stringify({ number: digits, text: msg }),
            }).catch(() => {});
            retried++;
          }
        }
      }
    } catch {
      // continue
    }
  }

  return Response.json({ ok: true, checked: leads.length, activated, retried });
}
