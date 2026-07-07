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
