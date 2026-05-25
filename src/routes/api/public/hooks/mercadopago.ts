import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { CREDIT_PACKAGES, SUBSCRIPTION_ADDONS } from "@/lib/addons.catalog";

/**
 * Mercado Pago webhook handler.
 * Configure this URL in MP:
 *   https://meumapas.lovable.app/api/public/hooks/mercadopago
 *
 * On payment.approved, this endpoint:
 *  - matches the order via metadata.order_id (external_reference)
 *  - credits the user's balance (kind=credits) OR
 *  - upserts user_subscriptions with status=active and current_period_end = now()+1mo (kind=subscription)
 *  - marks the payment_order row as paid
 */
export const Route = createFileRoute("/api/public/hooks/mercadopago")({
  server: {
    handlers: {
      POST: handler,
      GET: async () => new Response("ok"),
    },
  },
});

async function handler({ request }: { request: Request }) {
  const url = new URL(request.url);
  let payload: any = null;
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  // MP may send type=payment data.id, OR query param topic=payment id=...
  const paymentId =
    payload?.data?.id ??
    payload?.resource ??
    url.searchParams.get("data.id") ??
    url.searchParams.get("id");
  const type =
    payload?.type ?? payload?.action ?? url.searchParams.get("type") ?? url.searchParams.get("topic");

  if (!paymentId || (type && !String(type).includes("payment"))) {
    return Response.json({ ignored: true, reason: "not a payment event" });
  }

  const { data: mp } = await supabaseAdmin
    .from("mercado_pago_settings")
    .select("access_token, enabled, webhook_secret")
    .eq("id", true)
    .maybeSingle();
  if (!mp?.enabled || !mp.access_token) {
    return new Response("Payments disabled", { status: 503 });
  }

  // Optional webhook secret check (MP supports x-signature header — soft-validate).
  if (mp.webhook_secret) {
    const provided = request.headers.get("x-webhook-secret");
    if (provided && provided !== mp.webhook_secret) {
      return new Response("Invalid secret", { status: 401 });
    }
  }

  // Fetch payment from MP API to verify status
  let pay: any = null;
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mp.access_token}` },
    });
    pay = await res.json();
  } catch (e) {
    return new Response("MP fetch failed", { status: 502 });
  }

  if (!pay || pay.status !== "approved") {
    return Response.json({ ok: true, status: pay?.status ?? "unknown" });
  }

  const orderId: string | undefined =
    pay?.metadata?.order_id ?? pay?.external_reference ?? undefined;
  if (!orderId) {
    return Response.json({ ok: false, reason: "no order_id" });
  }

  const { data: order } = await supabaseAdmin
    .from("payment_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return Response.json({ ok: false, reason: "order not found" });
  if (order.status === "paid") {
    return Response.json({ ok: true, idempotent: true });
  }

  if (order.product_kind === "credits") {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === order.product_id);
    if (pkg) {
      await supabaseAdmin.rpc("adjust_credits", {
        _user_id: order.user_id,
        _amount: pkg.credits,
        _kind: "purchase",
        _reference: `MP payment ${paymentId} · ${pkg.name}`,
      });
    }
  } else if (order.product_kind === "subscription") {
    const sub = SUBSCRIPTION_ADDONS.find((s) => s.id === order.product_id);
    if (sub) {
      const periodEnd = new Date();
      periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
      // Upsert by (user_id, addon_id) — extend or activate
      const { data: existing } = await supabaseAdmin
        .from("user_subscriptions")
        .select("id, current_period_end")
        .eq("user_id", order.user_id)
        .eq("addon_id", sub.id)
        .maybeSingle();
      if (existing) {
        await supabaseAdmin
          .from("user_subscriptions")
          .update({
            status: "active",
            current_period_end: periodEnd.toISOString(),
            mp_preapproval_id: String(paymentId),
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("user_subscriptions").insert({
          user_id: order.user_id,
          addon_id: sub.id,
          status: "active",
          current_period_end: periodEnd.toISOString(),
          mp_preapproval_id: String(paymentId),
        });
      }

      // Auto-seed horoscope subscription with email + phone defaults when activating daily horoscope.
      if (sub.id === "sub_daily_horoscope") {
        const { data: existingSub } = await supabaseAdmin
          .from("horoscope_subscriptions")
          .select("user_id")
          .eq("user_id", order.user_id)
          .maybeSingle();
        if (!existingSub) {
          const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
          const { data: prof } = await supabaseAdmin
            .from("profiles")
            .select("phone")
            .eq("id", order.user_id)
            .maybeSingle();
          await supabaseAdmin.from("horoscope_subscriptions").insert({
            user_id: order.user_id,
            enabled: true,
            channel_email: true,
            channel_whatsapp: !!prof?.phone,
            email: user?.email ?? null,
            phone_e164: prof?.phone ?? null,
            send_hour_utc: 10,
          });
        }
      }
    }
  }

  await supabaseAdmin
    .from("payment_orders")
    .update({ status: "paid", mp_payment_id: String(paymentId) })
    .eq("id", order.id);

  return Response.json({ ok: true });
}
