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
    .select("id, phone_e164, activation_code, trial_days")
    .eq("status", "pending_confirmation")
    .gte("created_at", since)
    .limit(50);
  if (!leads?.length) return Response.json({ ok: true, checked: 0, activated: 0 });

  const { data: settings } = await (supabaseAdmin as any)
    .from("horoscope_landing_settings")
    .select("trial_days, confirmation_reply")
    .eq("id", true).maybeSingle();

  const base = String(evo.base_url).replace(/\/+$/, "");
  const inst = encodeURIComponent(evo.instance_name);
  let activated = 0;

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
      const startsOn = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endsOn = new Date(startsOn.getTime() + (trialDays - 1) * 24 * 60 * 60 * 1000);
      const iso = (d: Date) => d.toISOString().slice(0, 10);

      const { data: updated } = await (supabaseAdmin as any)
        .from("horoscope_free_leads")
        .update({
          status: "active",
          activated_at: new Date().toISOString(),
          trial_starts_on: iso(startsOn),
          trial_ends_on: iso(endsOn),
          trial_days: trialDays,
        })
        .eq("id", lead.id)
        .eq("status", "pending_confirmation")
        .select("id");

      if (!updated?.length) continue; // já ativado por webhook concorrente

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
  }

  return Response.json({ ok: true, checked: leads.length, activated });
}
