import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  CREDIT_PACKAGES,
  SUBSCRIPTION_ADDONS,
} from "./addons.catalog";

export const getAddonsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const [{ data: credits }, { data: subs }, { data: mp }] = await Promise.all([
      supabaseAdmin
        .from("user_credits")
        .select("balance, updated_at")
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("user_subscriptions")
        .select("addon_id, status, current_period_end")
        .eq("user_id", userId)
        .in("status", ["active", "pending"]),
      supabaseAdmin
        .from("mercado_pago_settings")
        .select("enabled")
        .eq("id", true)
        .maybeSingle(),
    ]);

    return {
      balance: credits?.balance ?? 0,
      balance_updated_at: credits?.updated_at ?? null,
      subscriptions: (subs ?? []).map((s) => ({
        addon_id: s.addon_id,
        status: s.status,
        current_period_end: s.current_period_end,
      })),
      payments_enabled: !!mp?.enabled,
    };
  });

const CheckoutSchema = z.object({
  kind: z.enum(["credits", "subscription", "landing_package"]),
  product_id: z.string().min(1).max(64),
});

export const createMercadoPagoCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CheckoutSchema.parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    const { data: mp, error: mpErr } = await supabaseAdmin
      .from("mercado_pago_settings")
      .select("access_token, enabled, environment")
      .eq("id", true)
      .maybeSingle();
    if (mpErr) throw new Error(mpErr.message);
    if (!mp?.enabled || !mp.access_token) {
      throw new Error(
        "A integração de pagamentos não está ativa. Tente novamente em instantes ou contate o suporte.",
      );
    }

    // Lookup product in catalog
    let title = "";
    let amount_cents = 0;
    if (data.kind === "credits") {
      const pkg = CREDIT_PACKAGES.find((p) => p.id === data.product_id);
      if (!pkg) throw new Error("Pacote de créditos inválido.");
      title = `${pkg.name} — ${pkg.credits} créditos`;
      amount_cents = pkg.price_cents;
    } else if (data.kind === "subscription") {
      const sub = SUBSCRIPTION_ADDONS.find((s) => s.id === data.product_id);
      if (!sub) throw new Error("Assinatura inválida.");
      const { getEffectiveAddon } = await import("./addon-settings.functions");
      const eff = await getEffectiveAddon(data.product_id);
      if (eff && !eff.enabled) {
        throw new Error("Esta assinatura está temporariamente indisponível.");
      }
      title = `${eff?.name ?? sub.name} — assinatura mensal`;
      amount_cents = eff?.price_cents ?? sub.price_cents;
    } else if (data.kind === "landing_package") {
      const { data: pkg, error } = await supabaseAdmin
        .from("landing_packages")
        .select("*")
        .eq("slug", data.product_id)
        .single();
      if (error || !pkg) throw new Error("Pacote não encontrado.");
      title = `${pkg.name} — plano de ascensão`;
      amount_cents = pkg.price_cents;
    }

    // Persist pending order
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("payment_orders")
      .insert({
        user_id: userId,
        product_kind: data.kind,
        product_id: data.product_id,
        amount_cents,
        currency: "BRL",
        status: "pending",
      })
      .select("id")
      .single();
    if (orderErr) throw new Error(orderErr.message);

    // Build Mercado Pago preference
    const origin = process.env.PUBLIC_APP_URL || "https://cosmic-whispers-ai-94.lovable.app";
    const prefBody = {
      items: [
        {
          id: data.product_id,
          title,
          quantity: 1,
          currency_id: "BRL",
          unit_price: amount_cents / 100,
        },
      ],
      external_reference: order.id,
      metadata: {
        order_id: order.id,
        user_id: userId,
        kind: data.kind,
        product_id: data.product_id,
      },
      back_urls: data.kind === "landing_package"
        ? {
            success: `${origin}/ativacao?status=success`,
            pending: `${origin}/ativacao?status=pending`,
            failure: `${origin}/ativacao?status=failure`,
          }
        : {
            success: `${origin}/addons?status=success`,
            pending: `${origin}/addons?status=pending`,
            failure: `${origin}/addons?status=failure`,
          },
      auto_return: "approved",
      // Webhook notification URL for Mercado Pago
      notification_url: `${origin}/api/public/hooks/mercadopago`,
    };

    let res: Response;
    try {
      res = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mp.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prefBody),
      });
    } catch {
      throw new Error("Não foi possível contatar o Mercado Pago. Tente novamente.");
    }
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      init_point?: string;
      sandbox_init_point?: string;
      message?: string;
    };
    if (!res.ok) {
      throw new Error(`Falha ao criar checkout: ${json?.message ?? `HTTP ${res.status}`}`);
    }
    const checkoutUrl =
      mp.environment === "production"
        ? json.init_point
        : json.sandbox_init_point ?? json.init_point;
    if (!checkoutUrl || !json.id) {
      throw new Error("Resposta inesperada do Mercado Pago.");
    }

    await supabaseAdmin
      .from("payment_orders")
      .update({
        mp_preference_id: json.id,
        init_point: checkoutUrl,
      })
      .eq("id", order.id);

    return { checkout_url: checkoutUrl, order_id: order.id };
  });
