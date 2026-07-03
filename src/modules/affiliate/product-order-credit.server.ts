// Credita o afiliado quando um product_order é marcado como pago.
// Idempotente: se já existe comissão para o pedido, não duplica.
//
// Estratégia de atribuição:
// 1) Procura affiliate_conversions.reference = orderId (type in checkout/signup/registration).
// 2) Fallback: procura conversion com reference = "/p/<slug>" da landing (mais recente até 24h antes).
// 3) Se nenhum afiliado encontrado, retorna sem erro.
//
// Chamado por: updateOrderStatus (aprovação manual) e webhook Mercado Pago.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordCommissionAndLedger } from "./commissions-engine.server";

export async function creditAffiliateForProductOrder(orderId: string): Promise<{
  ok: boolean;
  reason?: string;
  affiliateId?: string;
  commissionId?: string | null;
}> {
  try {
    const { data: order } = await supabaseAdmin
      .from("product_orders")
      .select("id, amount_cents, landing_id, status, user_id, created_at, customer_data")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return { ok: false, reason: "order_not_found" };
    if ((order as any).status !== "paid") {
      return { ok: false, reason: "not_paid" };
    }

    // 1) tenta por referência exata do orderId
    const { data: byRef } = await supabaseAdmin
      .from("affiliate_conversions" as any)
      .select("affiliate_id, session_id, reference, occurred_at")
      .eq("reference", orderId)
      .order("occurred_at", { ascending: false })
      .limit(1);

    let affiliateId: string | null = (byRef as any)?.[0]?.affiliate_id ?? null;
    let sessionId: string | null = (byRef as any)?.[0]?.session_id ?? null;

    // 2) fallback por landing slug
    if (!affiliateId) {
      const { data: landing } = await supabaseAdmin
        .from("product_landings")
        .select("slug")
        .eq("id", (order as any).landing_id)
        .maybeSingle();
      if (landing) {
        const landingRef = `/p/${(landing as any).slug}`;
        const createdAt = new Date((order as any).created_at ?? Date.now());
        const windowStart = new Date(createdAt.getTime() - 24 * 3600 * 1000).toISOString();
        const windowEnd = new Date(createdAt.getTime() + 10 * 60 * 1000).toISOString();
        const { data: byLanding } = await supabaseAdmin
          .from("affiliate_conversions" as any)
          .select("affiliate_id, session_id, occurred_at")
          .eq("reference", landingRef)
          .gte("occurred_at", windowStart)
          .lte("occurred_at", windowEnd)
          .order("occurred_at", { ascending: false })
          .limit(1);
        affiliateId = (byLanding as any)?.[0]?.affiliate_id ?? null;
        sessionId = (byLanding as any)?.[0]?.session_id ?? null;
      }
    }

    // 3) fallback last-click: procura o clique mais recente antes do pedido (janela 30 dias)
    if (!affiliateId) {
      const createdAt = new Date((order as any).created_at ?? Date.now());
      const windowStart = new Date(createdAt.getTime() - 30 * 24 * 3600 * 1000).toISOString();
      const windowEnd = new Date(createdAt.getTime() + 10 * 60 * 1000).toISOString();
      const { data: byClick } = await supabaseAdmin
        .from("affiliate_clicks" as any)
        .select("affiliate_id, session_token, landed_at")
        .gte("landed_at", windowStart)
        .lte("landed_at", windowEnd)
        .order("landed_at", { ascending: false })
        .limit(1);
      affiliateId = (byClick as any)?.[0]?.affiliate_id ?? null;
      sessionId = (byClick as any)?.[0]?.session_token ?? null;
    }

    if (!affiliateId) return { ok: false, reason: "no_affiliate" };

    // Resolve landing metadata (slug + title) to persist on the affiliate_order.
    let landingSlug: string | null = null;
    let landingTitle: string | null = null;
    try {
      const { data: landing } = await supabaseAdmin
        .from("product_landings")
        .select("slug, title")
        .eq("id", (order as any).landing_id)
        .maybeSingle();
      landingSlug = (landing as any)?.slug ?? null;
      landingTitle = (landing as any)?.title ?? null;
    } catch { /* noop */ }

    const customerName =
      (order as any).customer_data?.full_name ??
      (order as any).customer_data?.name ??
      null;

    const orderMetadata = {
      landing_id: (order as any).landing_id ?? null,
      landing_slug: landingSlug,
      landing_url: landingSlug ? `/p/${landingSlug}` : null,
      product_title: landingTitle,
      customer_name: customerName,
    };

    // Upsert affiliate_orders (unique: affiliate_id + order_ref)
    const { data: affOrder, error: aoErr } = await supabaseAdmin
      .from("affiliate_orders" as any)
      .upsert(
        {
          affiliate_id: affiliateId,
          session_id: sessionId,
          order_ref: orderId,
          amount_cents: (order as any).amount_cents ?? 0,
          status: "paid",
          metadata: orderMetadata,
        },
        { onConflict: "affiliate_id,order_ref" },
      )
      .select("id")
      .single();
    if (aoErr) throw new Error(aoErr.message);

    const affOrderId = (affOrder as any).id as string;

    // Idempotência: se já existe uma comissão para este affiliate_order, não cria outra.
    const { data: existing } = await supabaseAdmin
      .from("affiliate_commissions" as any)
      .select("id")
      .eq("order_id", affOrderId)
      .limit(1);
    if (existing && (existing as any).length > 0) {
      return { ok: true, affiliateId, commissionId: (existing as any)[0].id };
    }

    // Resolve product_id (affiliate_products) reusing already-fetched landing slug
    let productId: string | null = null;
    if (landingSlug) {
      try {
        const { data: prod } = await supabaseAdmin
          .from("affiliate_products" as any)
          .select("id")
          .eq("slug", landingSlug)
          .maybeSingle();
        productId = (prod as any)?.id ?? null;
      } catch { /* noop */ }
    }

    const result = await recordCommissionAndLedger({
      input: {
        affiliateId,
        productId,
        orderAmountCents: (order as any).amount_cents ?? 0,
        isFirstPurchase: true,
        orderRef: orderId,
      },
      orderId: affOrderId,
    });

    return { ok: true, affiliateId, commissionId: result.commissionId };
  } catch (e: any) {
    console.error("[creditAffiliateForProductOrder] failed", e?.message ?? e);
    return { ok: false, reason: e?.message ?? "error" };
  }
}
