/**
 * Núcleo idempotente da ativação de leads do horóscopo grátis.
 * Usado tanto pelo webhook quanto pelo cron de polling — o UPDATE condicional
 * (WHERE status='pending_confirmation') + .select() garante que só o primeiro
 * caller receba a linha; o segundo vira no-op.
 */
export type ActivationPatch = {
  status: "active";
  activated_at: string;
  trial_starts_on: string;
  trial_ends_on: string;
  trial_days: number;
};

export function getWhatsAppJidCandidates(phoneE164: string): string[] {
  const digits = String(phoneE164 ?? "").replace(/\D+/g, "");
  const candidates = new Set<string>();

  if (digits) candidates.add(digits);

  // WhatsApp/Brazil can store mobile JIDs with or without the ninth digit
  // after country code + DDD. Query both forms so polling finds replies.
  if (digits.startsWith("55") && digits.length === 13 && digits[4] === "9") {
    candidates.add(digits.slice(0, 4) + digits.slice(5));
  }
  if (digits.startsWith("55") && digits.length === 12) {
    candidates.add(digits.slice(0, 4) + "9" + digits.slice(4));
  }

  return Array.from(candidates).map((d) => `${d}@s.whatsapp.net`);
}

export function phoneMatches(a: string, b: string): boolean {
  const ad = String(a ?? "").replace(/\D+/g, "");
  const bd = String(b ?? "").replace(/\D+/g, "");
  if (!ad || !bd) return false;
  if (ad === bd) return true;
  if (ad.endsWith(bd.slice(-8)) || bd.endsWith(ad.slice(-8))) return true;

  const normalizeBrazilNinthDigit = (digits: string) => {
    if (digits.startsWith("55") && digits.length === 13 && digits[4] === "9") {
      return digits.slice(0, 4) + digits.slice(5);
    }
    return digits;
  };

  return normalizeBrazilNinthDigit(ad) === normalizeBrazilNinthDigit(bd);
}

export function extractIncomingText(payload: any): string {
  const message = payload?.message ?? payload?.data?.message ?? {};
  const nested = message?.ephemeralMessage?.message ?? message?.viewOnceMessage?.message ?? {};
  const texts = [
    payload?.text,
    payload?.Body,
    payload?.body,
    payload?.message?.text,
    message?.conversation,
    message?.extendedTextMessage?.text,
    message?.imageMessage?.caption,
    message?.videoMessage?.caption,
    message?.buttonsResponseMessage?.selectedDisplayText,
    message?.buttonsResponseMessage?.selectedButtonId,
    message?.listResponseMessage?.title,
    message?.listResponseMessage?.singleSelectReply?.selectedRowId,
    message?.templateButtonReplyMessage?.selectedDisplayText,
    nested?.conversation,
    nested?.extendedTextMessage?.text,
  ];
  return texts.find((value) => typeof value === "string" && value.trim())?.toString() ?? "";
}

export function extractActivationCodes(text: string): string[] {
  return Array.from(
    new Set(String(text ?? "").toUpperCase().match(/[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}/g) ?? []),
  );
}

export function buildActivationPatch(trialDays: number, now = new Date()): ActivationPatch {
  const startsOn = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const endsOn = new Date(startsOn.getTime() + (trialDays - 1) * 24 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    status: "active",
    activated_at: now.toISOString(),
    trial_starts_on: iso(startsOn),
    trial_ends_on: iso(endsOn),
    trial_days: trialDays,
  };
}

/**
 * Tenta ativar o lead. Retorna true APENAS se este caller efetivamente mudou
 * a linha (ou seja, era quem estava com status='pending_confirmation').
 * Chamadas concorrentes com o mesmo id → apenas uma retorna true.
 */
export async function tryActivateLead(
  supabase: any,
  leadId: string,
  patch: ActivationPatch,
): Promise<boolean> {
  const { data } = await supabase
    .from("horoscope_free_leads")
    .update(patch)
    .eq("id", leadId)
    .eq("status", "pending_confirmation")
    .select("id");
  return Array.isArray(data) && data.length > 0;
}

/**
 * Reivindica atomicamente o direito de enviar UM retry para o lead.
 * Retorna true só para o primeiro caller — usa trava otimista em `retry_count`.
 */
export async function tryClaimRetry(
  supabase: any,
  leadId: string,
  currentRetryCount: number,
): Promise<boolean> {
  const { data } = await supabase
    .from("horoscope_free_leads")
    .update({
      retry_count: currentRetryCount + 1,
      last_retry_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("status", "pending_confirmation")
    .eq("retry_count", currentRetryCount)
    .select("id");
  return Array.isArray(data) && data.length > 0;
}

/**
 * Reivindica atomicamente o direito de enviar o lembrete final de expiração.
 * Retorna true só para o primeiro caller — usa trava em `expiry_reminder_sent_at IS NULL`.
 */
export async function tryClaimExpiryReminder(
  supabase: any,
  leadId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("horoscope_free_leads")
    .update({ expiry_reminder_sent_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("status", "pending_confirmation")
    .is("expiry_reminder_sent_at", null)
    .select("id");
  return Array.isArray(data) && data.length > 0;
}

export type WhatsappSendResult = {
  ok: boolean;
  provider?: "evolution" | "twilio";
  status?: number;
  id?: string;
  error?: string;
};

function truncateError(value: unknown): string {
  return String(value ?? "Erro desconhecido").slice(0, 500);
}

async function responseText(response: Response): Promise<string> {
  return (await response.text().catch(() => "")).slice(0, 500);
}

export async function sendWhatsappText(
  supabase: any,
  phoneE164: string,
  message: string,
): Promise<WhatsappSendResult> {
  const digits = String(phoneE164 ?? "").replace(/\D+/g, "");
  if (!digits || !message.trim()) {
    return { ok: false, error: "Telefone ou mensagem inválidos" };
  }

  const { data: evo } = await supabase
    .from("evolution_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  let evolutionError: string | null = null;
  if (evo?.enabled && evo.base_url && evo.global_api_key && evo.instance_name) {
    try {
      const base = String(evo.base_url).replace(/\/+$/, "");
      const url = `${base}/message/sendText/${encodeURIComponent(evo.instance_name)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { apikey: evo.global_api_key, "Content-Type": "application/json" },
        body: JSON.stringify({ number: digits, text: message }),
      });
      const body = await responseText(response);
      let parsed: any = null;
      try { parsed = body ? JSON.parse(body) : null; } catch {}
      if (response.ok) {
        return {
          ok: true,
          provider: "evolution",
          status: response.status,
          id: String(parsed?.key?.id ?? parsed?.messageId ?? parsed?.id ?? "ok"),
        };
      }
      evolutionError = `Evolution HTTP ${response.status}: ${body}`;
    } catch (error: any) {
      evolutionError = `Evolution: ${truncateError(error?.message ?? error)}`;
    }
  }

  const { data: twilio } = await supabase
    .from("twilio_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  if (twilio?.enabled && twilio.account_sid && twilio.auth_token && twilio.whatsapp_from) {
    try {
      const form = new URLSearchParams();
      form.set("From", `whatsapp:${twilio.whatsapp_from}`);
      form.set("To", `whatsapp:${phoneE164}`);
      form.set("Body", message);
      const response = await fetch(
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
      const body = await responseText(response);
      let parsed: any = null;
      try { parsed = body ? JSON.parse(body) : null; } catch {}
      if (response.ok) {
        return {
          ok: true,
          provider: "twilio",
          status: response.status,
          id: String(parsed?.sid ?? parsed?.id ?? "ok"),
        };
      }
      return { ok: false, provider: "twilio", status: response.status, error: `Twilio HTTP ${response.status}: ${body}` };
    } catch (error: any) {
      return { ok: false, provider: "twilio", error: `Twilio: ${truncateError(error?.message ?? error)}` };
    }
  }

  return {
    ok: false,
    provider: evolutionError ? "evolution" : undefined,
    error: evolutionError ?? "Nenhum provedor de WhatsApp configurado",
  };
}

export async function tryClaimConfirmationSend(
  supabase: any,
  leadId: string,
  currentAttempts: number,
): Promise<boolean> {
  const { data } = await supabase
    .from("horoscope_free_leads")
    .update({
      confirmation_attempts: currentAttempts + 1,
      last_confirmation_attempt_at: new Date().toISOString(),
      confirmation_error: null,
    })
    .eq("id", leadId)
    .eq("status", "active")
    .eq("confirmation_attempts", currentAttempts)
    .is("confirmation_sent_at", null)
    .select("id");
  return Array.isArray(data) && data.length > 0;
}

export async function finishConfirmationSend(
  supabase: any,
  leadId: string,
  result: WhatsappSendResult,
): Promise<void> {
  if (result.ok) {
    await supabase
      .from("horoscope_free_leads")
      .update({
        confirmation_sent_at: new Date().toISOString(),
        confirmation_error: null,
      })
      .eq("id", leadId);
    return;
  }

  await supabase
    .from("horoscope_free_leads")
    .update({ confirmation_error: truncateError(result.error) })
    .eq("id", leadId);
}

export async function sendConfirmationIfNeeded(
  supabase: any,
  lead: any,
  reply: string,
): Promise<{ claimed: boolean; result?: WhatsappSendResult }> {
  if (lead?.confirmation_sent_at) return { claimed: false };
  const currentAttempts = Number(lead?.confirmation_attempts ?? 0);
  const claimed = await tryClaimConfirmationSend(supabase, lead.id, currentAttempts);
  if (!claimed) return { claimed: false };

  const result = await sendWhatsappText(supabase, lead.phone_e164, reply);
  await finishConfirmationSend(supabase, lead.id, result);
  return { claimed: true, result };
}
