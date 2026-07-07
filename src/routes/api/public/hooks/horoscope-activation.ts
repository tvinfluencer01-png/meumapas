/**
 * Webhook chamado pelo provedor WhatsApp (Evolution API / Twilio) quando um
 * lead da landing "Horóscopo Grátis" envia a mensagem de ativação.
 *
 * Público, mas exige `apikey` = SUPABASE_PUBLISHABLE_KEY OU um header
 * Bearer para o provedor externo. Aceita payloads no formato Evolution
 * (message.conversation) ou Twilio (Body/From) — extrai o telefone e a mensagem
 * e procura pelo `activation_code` no texto.
 *
 * Também aceita chamadas diretas (JSON `{ phone, text }`) para permitir
 * ativação manual/teste pelo admin.
 */
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/hooks/horoscope-activation")({
  server: {
    handlers: {
      POST: handler,
    },
  },
});

async function handler({ request }: { request: Request }) {
  const apikey = request.headers.get("apikey");
  const auth = request.headers.get("authorization") ?? "";
  const authorized =
    apikey === process.env.SUPABASE_PUBLISHABLE_KEY ||
    apikey === process.env.SUPABASE_ANON_KEY ||
    auth === `Bearer ${process.env.SUPABASE_PUBLISHABLE_KEY}` ||
    auth === `Bearer ${process.env.SUPABASE_ANON_KEY}`;
  if (!authorized) return new Response("Unauthorized", { status: 401 });

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    const form = await request.formData().catch(() => null);
    if (form) {
      body = {};
      for (const [k, v] of form.entries()) body[k] = String(v);
    }
  }
  if (!body) return Response.json({ ok: false, reason: "empty body" }, { status: 400 });

  // Log de todo webhook recebido — usado pelo botão de "Testar webhook" no admin.
  try {
    await (supabaseAdmin as any).from("app_logs").insert({
      event: "evo_webhook_received",
      payload: {
        event_type: body?.event ?? body?.type ?? null,
        instance: body?.instance ?? null,
        raw_from: body?.From ?? body?.data?.key?.remoteJid ?? body?.phone ?? null,
        raw_text: (body?.text ?? body?.Body ?? body?.data?.message?.conversation ?? body?.data?.message?.extendedTextMessage?.text ?? "").toString().slice(0, 300),
        received_at: new Date().toISOString(),
      },
    });
  } catch {}

  // Extrair telefone + texto de vários formatos
  const text: string =
    body.text ??
    body.Body ??
    body?.data?.message?.conversation ??
    body?.data?.message?.extendedTextMessage?.text ??
    body?.message?.text ??
    "";
  let phone: string =
    body.phone ??
    body.From ??
    body?.data?.key?.remoteJid ??
    body?.sender ??
    "";

  phone = String(phone).replace(/^whatsapp:/, "").replace(/@s\.whatsapp\.net$/, "");
  if (!phone.startsWith("+")) phone = "+" + phone.replace(/\D+/g, "");

  if (!text || phone.length < 8) {
    return Response.json({ ok: false, reason: "missing phone or text" });
  }

  // Extrai código de 6 chars (A-Z0-9 sem 0/O/1/I) do texto
  const codeMatch = String(text).toUpperCase().match(/[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}/);
  if (!codeMatch) {
    return Response.json({ ok: false, reason: "no activation code in text" });
  }
  const code = codeMatch[0];

  // Detecta comando SAIR/CANCELAR
  const wantsCancel = /\b(SAIR|CANCELAR|STOP|PARAR)\b/i.test(text);

  const { data: lead } = await (supabaseAdmin as any)
    .from("horoscope_free_leads")
    .select("*")
    .eq("activation_code", code)
    .maybeSingle();

  if (!lead) {
    return Response.json({ ok: false, reason: "code not found" });
  }

  // Segurança: telefone precisa bater
  const leadDigits = String(lead.phone_e164).replace(/\D+/g, "");
  const senderDigits = phone.replace(/\D+/g, "");
  if (!senderDigits.endsWith(leadDigits.slice(-8)) && !leadDigits.endsWith(senderDigits.slice(-8))) {
    return Response.json({ ok: false, reason: "phone mismatch" });
  }

  if (wantsCancel) {
    await (supabaseAdmin as any)
      .from("horoscope_free_leads")
      .update({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("id", lead.id);
    return Response.json({ ok: true, action: "unsubscribed", reply: "Cadastro cancelado. Você não receberá mais mensagens." });
  }

  const { data: settings } = await (supabaseAdmin as any)
    .from("horoscope_landing_settings")
    .select("trial_days, confirmation_reply")
    .eq("id", true)
    .maybeSingle();

  const trialDays = Number(settings?.trial_days ?? lead.trial_days ?? 7);
  const startsOn = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const endsOn = new Date(startsOn.getTime() + (trialDays - 1) * 24 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  // Idempotência: só ativa (e responde) se a linha ainda estiver pendente.
  // Se webhook e poll processarem a mesma mensagem, apenas o primeiro
  // update retornará linhas — o segundo vira no-op.
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

  if (!updated?.length) {
    return Response.json({ ok: true, action: "already_activated" });
  }

  const reply = settings?.confirmation_reply ??
    `✨ Cadastro confirmado! A partir de amanhã, você receberá seu horóscopo por ${trialDays} dias.`;

  // Envia a mensagem de confirmação imediatamente via Evolution ou Twilio
  await sendWhatsapp(lead.phone_e164, reply).catch(() => {});

  return Response.json({ ok: true, action: "activated", reply });
}

async function sendWhatsapp(phoneE164: string, message: string) {
  const { data: evo } = await (supabaseAdmin as any)
    .from("evolution_settings").select("*").eq("id", true).maybeSingle();
  if (evo?.enabled && evo.base_url && evo.global_api_key && evo.instance_name) {
    const base = String(evo.base_url).replace(/\/+$/, "");
    const url = `${base}/message/sendText/${encodeURIComponent(evo.instance_name)}`;
    await fetch(url, {
      method: "POST",
      headers: { apikey: evo.global_api_key, "Content-Type": "application/json" },
      body: JSON.stringify({ number: phoneE164.replace(/\D+/g, ""), text: message }),
    });
    return;
  }
  const { data: twilio } = await supabaseAdmin
    .from("twilio_settings").select("*").eq("id", true).maybeSingle();
  if (twilio?.enabled && twilio.account_sid && twilio.auth_token && twilio.whatsapp_from) {
    const form = new URLSearchParams();
    form.set("From", `whatsapp:${twilio.whatsapp_from}`);
    form.set("To", `whatsapp:${phoneE164}`);
    form.set("Body", message);
    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilio.account_sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${twilio.account_sid}:${twilio.auth_token}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );
  }
}
