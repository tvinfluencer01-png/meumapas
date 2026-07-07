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
