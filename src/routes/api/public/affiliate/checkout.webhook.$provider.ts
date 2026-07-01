// Webhooks dos gateways de checkout (Mercado Pago / PayPal) — FASE 4B.
// Diferente do webhook.$provider.ts (externo/HMAC genérico), este endpoint
// integra com as sessões criadas via /api/public/affiliate/checkout/create.
//
// URL: /api/public/affiliate/checkout/webhook/:provider

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/affiliate/checkout/webhook/$provider")({
  server: {
    handlers: {
      POST: handler,
      GET: async () => new Response("ok"),
    },
  },
});

async function handler({ request, params }: { request: Request; params: { provider: string } }) {
  const provider = params.provider;
  if (provider !== "mercadopago" && provider !== "paypal") {
    return new Response("Unknown provider", { status: 404 });
  }

  const url = new URL(request.url);
  let body: any = null;
  try { body = await request.json(); } catch { body = {}; }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: cfg } = await supabaseAdmin
    .from("affiliate_checkout_providers" as any)
    .select("*")
    .eq("provider", provider)
    .maybeSingle();
  if (!cfg || !(cfg as any).enabled) return new Response("Provider disabled", { status: 503 });

  let providerRef: string | null = null;
  let paid = false;

  if (provider === "mercadopago") {
    const paymentId =
      body?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");
    if (!paymentId) return Response.json({ ok: true, ignored: true });
    const token = (cfg as any).credentials?.access_token;
    try {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const pay = await res.json();
      if (pay?.status !== "approved") return Response.json({ ok: true, status: pay?.status });
      providerRef = pay.external_reference ?? pay?.metadata?.session_id ?? null;
      paid = true;
    } catch {
      return new Response("MP fetch failed", { status: 502 });
    }
  } else {
    // PayPal — event types: PAYMENT.CAPTURE.COMPLETED / CHECKOUT.ORDER.APPROVED
    const et = body?.event_type as string | undefined;
    const resource = body?.resource ?? {};
    if (et === "CHECKOUT.ORDER.APPROVED" || et === "PAYMENT.CAPTURE.COMPLETED") {
      providerRef =
        resource?.supplementary_data?.related_ids?.order_id ??
        resource?.id ??
        resource?.purchase_units?.[0]?.reference_id ??
        null;
      paid = true;
    }
  }

  if (!paid || !providerRef) return Response.json({ ok: true, skipped: true });

  const { markCheckoutPaid } = await import("@/modules/affiliate/checkout.server");
  const session = await markCheckoutPaid({ provider, providerRef });
  if (!session) return Response.json({ ok: true, unknown: true });

  // Registra pedido + calcula/credita comissão via motor avançado.
  if (session.affiliate_id) {
    const { data: order } = await supabaseAdmin
      .from("affiliate_orders" as any)
      .upsert(
        {
          affiliate_id: session.affiliate_id,
          order_ref: `chk_${session.id}`,
          amount_cents: session.amount_cents,
          status: "paid",
          customer_ref: session.customer_email,
          metadata: { provider, session_id: session.id },
        },
        { onConflict: "affiliate_id,order_ref" },
      )
      .select("id")
      .single();
    const { recordCommissionAndLedger } = await import(
      "@/modules/affiliate/commissions-engine.server"
    );
    try {
      await recordCommissionAndLedger({
        input: {
          affiliateId: session.affiliate_id,
          productId: session.product_id ?? null,
          orderAmountCents: session.amount_cents,
          orderRef: `chk_${session.id}`,
          isFirstPurchase: true,
        },
        orderId: (order as any).id,
      });
    } catch (e) {
      console.error("[checkout webhook] commission error", e);
    }
  }

  return Response.json({ ok: true, sessionId: session.id });
}
