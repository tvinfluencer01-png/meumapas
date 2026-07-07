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

export const Route = createFileRoute("/api/public/hooks/horoscope-activation")({
  server: {
    handlers: {
      POST: handler,
    },
  },
});

async function handler({ request }: { request: Request }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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

  const {
    buildActivationPatch,
    extractActivationCodes,
    extractIncomingText,
    phoneMatches,
    sendConfirmationIfNeeded,
    tryActivateLead,
  } = await import("@/lib/horoscope-activation.server");

  // Log de todo webhook recebido — usado pelo botão de "Testar webhook" no admin.
  try {
    await (supabaseAdmin as any).from("app_logs").insert({
      event: "evo_webhook_received",
      payload: {
        event_type: body?.event ?? body?.type ?? null,
        instance: body?.instance ?? null,
        raw_from: body?.From ?? body?.data?.key?.remoteJid ?? body?.phone ?? null,
        raw_text: extractIncomingText(body).slice(0, 300),
        received_at: new Date().toISOString(),
      },
    });
  } catch {}

  // Extrair telefone + texto de vários formatos
  const text = extractIncomingText(body);
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
  const codes = extractActivationCodes(text);
  if (!codes.length) {
    return Response.json({ ok: false, reason: "no activation code in text" });
  }

  // Detecta comando SAIR/CANCELAR
  const wantsCancel = /\b(SAIR|CANCELAR|STOP|PARAR)\b/i.test(text);

  const { data: leads } = await (supabaseAdmin as any)
    .from("horoscope_free_leads")
    .select("*")
    .in("activation_code", codes)
    .order("created_at", { ascending: false })
    .limit(10);

  const lead = (leads ?? []).find((row: any) => phoneMatches(phone, row.phone_e164));

  if (!lead) {
    return Response.json({ ok: false, reason: "code not found or phone mismatch" });
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
  const patch = buildActivationPatch(trialDays);

  // Idempotência: só ativa (e responde) se a linha ainda estiver pendente.
  const didActivate = await tryActivateLead(supabaseAdmin, lead.id, patch);
  const reply = settings?.confirmation_reply ??
    `✨ Cadastro confirmado! A partir de amanhã, você receberá seu horóscopo por ${trialDays} dias.`;

  const confirmationLead = {
    ...lead,
    status: didActivate ? "active" : lead.status,
    confirmation_attempts: lead.confirmation_attempts ?? 0,
    confirmation_sent_at: lead.confirmation_sent_at ?? null,
  };
  const confirmation = await sendConfirmationIfNeeded(supabaseAdmin, confirmationLead, reply);

  try {
    await (supabaseAdmin as any).from("app_logs").insert({
      event: "horoscope_confirmation_attempt",
      payload: {
        lead_id: lead.id,
        action: didActivate ? "activated" : "already_active",
        claimed: confirmation.claimed,
        ok: confirmation.result?.ok ?? null,
        provider: confirmation.result?.provider ?? null,
        status: confirmation.result?.status ?? null,
        error: confirmation.result?.error ?? null,
        at: new Date().toISOString(),
      },
    });
  } catch {}

  return Response.json({
    ok: true,
    action: didActivate ? "activated" : "already_activated",
    confirmationSent: confirmation.result?.ok ?? false,
    confirmationError: confirmation.result?.error ?? null,
    reply,
  });
}
