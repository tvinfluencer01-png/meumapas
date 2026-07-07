import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Helpers to keep horoscope_paid_subscriptions and horoscope_subscriptions
 * (the delivery config used by the daily cron) in sync.
 *
 * Rule: horoscope_subscriptions.enabled = true only while the paid subscription
 * is active AND the current_period_end is still in the future.
 */

export async function activateHoroscopePaidSubscription(
  subId: string,
  paymentId: string,
) {
  const { data: hsub } = await supabaseAdmin
    .from("horoscope_paid_subscriptions")
    .select("*, plan:horoscope_plans(interval_months)")
    .eq("id", subId)
    .maybeSingle();
  if (!hsub) return { ok: false as const, reason: "not_found" };

  const now = new Date();
  const months = ((hsub as any).plan?.interval_months as number) ?? 1;

  // Renewal: if the sub is already active and still valid, extend from its
  // current end. Otherwise start a new period from now.
  const prevEnd = (hsub as any).current_period_end
    ? new Date((hsub as any).current_period_end as string)
    : null;
  const base = prevEnd && prevEnd.getTime() > now.getTime() ? prevEnd : now;
  const periodEnd = new Date(base);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + months);

  await supabaseAdmin
    .from("horoscope_paid_subscriptions")
    .update({
      status: "active",
      mp_payment_id: String(paymentId),
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      canceled_at: null,
      cancel_reason: null,
      cancel_at_period_end: false,
    })
    .eq("id", subId);

  // Re-enable delivery config if it exists.
  await (supabaseAdmin as any)
    .from("horoscope_subscriptions")
    .update({ enabled: true })
    .eq("user_id", (hsub as any).user_id)
    .is("client_profile_id", null);

  return { ok: true as const, renewed: !!(prevEnd && prevEnd.getTime() > now.getTime()) };
}

export async function cancelHoroscopePaidSubscription(
  subId: string,
  opts: { immediate?: boolean; reason?: string } = {},
) {
  const { data: hsub } = await supabaseAdmin
    .from("horoscope_paid_subscriptions")
    .select("id, user_id, current_period_end, status")
    .eq("id", subId)
    .maybeSingle();
  if (!hsub) return { ok: false as const, reason: "not_found" };

  const now = new Date();
  const periodEnd = (hsub as any).current_period_end
    ? new Date((hsub as any).current_period_end as string)
    : null;
  const stillValid = !opts.immediate && periodEnd && periodEnd.getTime() > now.getTime();

  if (stillValid) {
    // Soft cancel: keep sending until end of paid period, then expiry cron flips it.
    await supabaseAdmin
      .from("horoscope_paid_subscriptions")
      .update({
        cancel_at_period_end: true,
        canceled_at: now.toISOString(),
        cancel_reason: opts.reason ?? null,
      })
      .eq("id", subId);
    return { ok: true as const, mode: "at_period_end" as const, ends_at: periodEnd!.toISOString() };
  }

  // Hard cancel now.
  await supabaseAdmin
    .from("horoscope_paid_subscriptions")
    .update({
      status: "canceled",
      canceled_at: now.toISOString(),
      cancel_reason: opts.reason ?? null,
      cancel_at_period_end: false,
    })
    .eq("id", subId);

  await (supabaseAdmin as any)
    .from("horoscope_subscriptions")
    .update({ enabled: false })
    .eq("user_id", (hsub as any).user_id)
    .is("client_profile_id", null);

  return { ok: true as const, mode: "immediate" as const };
}

/**
 * Expire subscriptions whose current_period_end has passed. Disables the
 * delivery config so the daily-horoscope cron stops sending.
 */
export async function expireLapsedHoroscopeSubscriptions() {
  const nowIso = new Date().toISOString();
  const { data: lapsed } = await supabaseAdmin
    .from("horoscope_paid_subscriptions")
    .select("id, user_id, status, current_period_end, cancel_at_period_end")
    .in("status", ["active", "pending"])
    .lt("current_period_end", nowIso)
    .limit(1000);

  let expired = 0;
  for (const row of lapsed ?? []) {
    await supabaseAdmin
      .from("horoscope_paid_subscriptions")
      .update({
        status: "expired",
        cancel_at_period_end: false,
      })
      .eq("id", (row as any).id);

    await (supabaseAdmin as any)
      .from("horoscope_subscriptions")
      .update({ enabled: false })
      .eq("user_id", (row as any).user_id)
      .is("client_profile_id", null);

    expired += 1;
  }
  return { expired, scanned: (lapsed ?? []).length };
}
