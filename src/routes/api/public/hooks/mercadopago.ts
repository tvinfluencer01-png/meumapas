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

  // Verifica se é um pedido de produto avulso (product_orders)
  const metadataKind = pay?.metadata?.kind;

  // ─── Assinatura do Horóscopo Diário (planos pagos) ───
  if (metadataKind === "horoscope_plan" || String(pay?.external_reference ?? "").startsWith("horoscope_plan:")) {
    const subId: string | undefined =
      pay?.metadata?.subscription_id ??
      (String(pay?.external_reference ?? "").startsWith("horoscope_plan:")
        ? String(pay.external_reference).split(":")[1]
        : undefined);
    if (!subId) return Response.json({ ok: false, reason: "no horoscope subscription id" });

    const { data: hsub } = await supabaseAdmin
      .from("horoscope_paid_subscriptions")
      .select("*, plan:horoscope_plans(interval_months)")
      .eq("id", subId)
      .maybeSingle();
    if (!hsub) return Response.json({ ok: false, reason: "horoscope subscription not found" });
    if (hsub.status === "active") return Response.json({ ok: true, idempotent: true });

    const now = new Date();
    const months = (hsub as any).plan?.interval_months ?? 1;
    const periodEnd = new Date(now);
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + months);

    await supabaseAdmin
      .from("horoscope_paid_subscriptions")
      .update({
        status: "active",
        mp_payment_id: String(paymentId),
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .eq("id", subId);

    // Seed horoscope_subscriptions (canal WhatsApp) com defaults se ainda não existir
    const userId = (hsub as any).user_id;
    const { data: existingHS } = await supabaseAdmin
      .from("horoscope_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .is("client_profile_id", null)
      .maybeSingle();
    if (!existingHS) {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
      const { data: prof } = await supabaseAdmin
        .from("profiles").select("phone").eq("id", userId).maybeSingle();
      await supabaseAdmin.from("horoscope_subscriptions").insert({
        user_id: userId,
        enabled: true,
        channel_email: !!(user?.email),
        channel_whatsapp: !!(prof?.phone),
        email: user?.email ?? null,
        phone_e164: prof?.phone ?? null,
        frequency: "daily",
        send_local_hour: 8,
        send_local_minute: 30,
      });
    }

    return Response.json({ ok: true, kind: "horoscope_plan", subscription_id: subId });
  }

  if (metadataKind === "product_order") {
    const { data: prodOrder } = await supabaseAdmin
      .from("product_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (!prodOrder) return Response.json({ ok: false, reason: "product order not found" });
    if (prodOrder.status !== "pending_payment") {
      return Response.json({ ok: true, idempotent: true });
    }

    // Provision user account if this was a guest checkout
    let resolvedUserId: string | null = (prodOrder as any).user_id ?? null;
    const guestEmail: string | null =
      (prodOrder as any).guest_email ??
      ((prodOrder.customer_data as any)?.email ?? null);

    if (!resolvedUserId && guestEmail) {
      try {
        // Look up existing user by email (paginate small set)
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const found = list?.users?.find(
          (u) => (u.email ?? "").toLowerCase() === guestEmail.toLowerCase(),
        );
        if (found) {
          resolvedUserId = found.id;
        } else {
          const cd = (prodOrder.customer_data ?? {}) as any;
          const tempPassword = `${crypto.randomUUID()}A!1`;
          const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
            email: guestEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: cd.full_name ?? cd.name ?? null,
              source: "direct_sale",
            },
          });
          if (cErr) {
            console.error("createUser failed:", cErr.message);
          } else if (created?.user) {
            resolvedUserId = created.user.id;
            // Não enviamos e-mail de "definir senha" automaticamente.
            // O admin pode disparar manualmente pelo painel de Pedidos.
          }
        }
      } catch (e) {
        console.error("guest provisioning failed", e);
      }
    }

    await supabaseAdmin
      .from("product_orders")
      .update({
        status: "paid",
        mp_payment_id: String(paymentId),
        viewed_by_admin: false,
        ...(resolvedUserId ? { user_id: resolvedUserId } : {}),
      })
      .eq("id", prodOrder.id);

    // Mark CRM lead as converted
    const leadId = (prodOrder as any).lead_id;
    if (leadId) {
      await supabaseAdmin.from("crm_leads").update({
        status: "converted",
        converted_order_id: prodOrder.id,
        converted_user_id: resolvedUserId,
      }).eq("id", leadId);
    }

    // Credita comissão do afiliado (idempotente).
    try {
      const { creditAffiliateForProductOrder } = await import(
        "@/modules/affiliate/product-order-credit.server"
      );
      await creditAffiliateForProductOrder(prodOrder.id);
    } catch (e) {
      console.error("[mp webhook] affiliate credit failed", e);
    }

    return Response.json({ ok: true, kind: "product_order", user_id: resolvedUserId });
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
  } else if (order.product_kind === "landing_package") {
    const { data: pkg } = await supabaseAdmin
      .from("landing_packages")
      .select("*")
      .eq("slug", order.product_id)
      .single();
    if (pkg) {
      const periodEnd = new Date();
      periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
      // Activate each addon included in the package
      const addons = Array.isArray(pkg.included_addons) ? (pkg.included_addons as string[]) : [];
      for (const addonId of addons) {
        const { data: existing } = await supabaseAdmin
          .from("user_subscriptions")
          .select("id")
          .eq("user_id", order.user_id)
          .eq("addon_id", addonId)
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
            addon_id: addonId,
            status: "active",
            current_period_end: periodEnd.toISOString(),
            mp_preapproval_id: String(paymentId),
          });
        }
      }
      // Credita os créditos mensais do pacote, se houver
      const creditsPerMonth = (pkg as any).credits_per_month ?? 0;
      if (creditsPerMonth > 0) {
        await supabaseAdmin.rpc("adjust_credits", {
          _user_id: order.user_id,
          _amount: creditsPerMonth,
          _kind: "purchase",
          _reference: `MP payment ${paymentId} · ${pkg.name}`,
        });
      }
    }
  }

  await supabaseAdmin
    .from("payment_orders")
    .update({ status: "paid", mp_payment_id: String(paymentId) })
    .eq("id", order.id);

  return Response.json({ ok: true });
}
