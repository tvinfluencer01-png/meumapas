// Adapter universal de checkouts — FASE 4B / Módulo 1.
// Suporta Mercado Pago e PayPal (habilitados via `affiliate_checkout_providers`).
// Cria uma sessão de checkout persistida e devolve a URL de pagamento.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { randomUUID } from "crypto";

export interface CreateCheckoutInput {
  provider: "mercadopago" | "paypal";
  amountCents: number;
  currency?: string;
  affiliateCode?: string;
  productId?: string;
  couponId?: string;
  customer: { email: string; name?: string };
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, unknown>;
  utm?: Record<string, unknown>;
}

async function loadProvider(provider: string) {
  const { data, error } = await supabaseAdmin
    .from("affiliate_checkout_providers" as any)
    .select("*")
    .eq("provider", provider)
    .eq("enabled", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Gateway ${provider} não configurado ou desabilitado.`);
  return data as any;
}

async function resolveAffiliateId(code?: string): Promise<string | null> {
  if (!code) return null;
  const { data } = await supabaseAdmin
    .from("affiliate_profiles" as any)
    .select("id, status")
    .eq("affiliate_code", code)
    .maybeSingle();
  if (!data || (data as any).status !== "approved") return null;
  return (data as any).id;
}

async function createMercadoPagoPreference(cfg: any, input: CreateCheckoutInput, sessionId: string) {
  const token = cfg.credentials?.access_token as string;
  if (!token) throw new Error("Mercado Pago sem access_token configurado.");
  const body = {
    items: [
      {
        title: (input.metadata?.title as string) ?? "Produto",
        quantity: 1,
        currency_id: input.currency ?? "BRL",
        unit_price: input.amountCents / 100,
      },
    ],
    payer: { email: input.customer.email, name: input.customer.name ?? undefined },
    external_reference: sessionId,
    back_urls: { success: input.successUrl, failure: input.cancelUrl, pending: input.cancelUrl },
    auto_return: "approved",
    notification_url:
      (input.metadata?.notification_url as string) ??
      undefined,
    metadata: { session_id: sessionId, kind: "affiliate_checkout" },
  };
  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(json?.message ?? "Falha ao criar preferência MP");
  return {
    providerRef: json.id as string,
    url: (cfg.sandbox ? json.sandbox_init_point : json.init_point) as string,
  };
}

async function createPayPalOrder(cfg: any, input: CreateCheckoutInput, sessionId: string) {
  const clientId = cfg.credentials?.client_id as string;
  const secret = cfg.credentials?.client_secret as string;
  if (!clientId || !secret) throw new Error("PayPal sem credenciais configuradas.");
  const base = cfg.sandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
  // OAuth
  const tokRes = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const tokJson = (await tokRes.json()) as any;
  if (!tokRes.ok) throw new Error(tokJson?.error_description ?? "PayPal auth failed");
  const accessToken = tokJson.access_token as string;

  const currency = (input.currency ?? "BRL").toUpperCase();
  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": sessionId,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: sessionId,
          amount: { currency_code: currency, value: (input.amountCents / 100).toFixed(2) },
        },
      ],
      application_context: {
        return_url: input.successUrl,
        cancel_url: input.cancelUrl,
        user_action: "PAY_NOW",
      },
    }),
  });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(json?.message ?? "Falha ao criar ordem PayPal");
  const approve = (json.links ?? []).find((l: any) => l.rel === "approve");
  return { providerRef: json.id as string, url: approve?.href as string };
}

export async function createCheckout(input: CreateCheckoutInput) {
  const cfg = await loadProvider(input.provider);
  const affiliateId = await resolveAffiliateId(input.affiliateCode);
  const sessionId = randomUUID();
  const sessionToken = randomUUID().replace(/-/g, "");

  let providerRef = "";
  let url = "";
  if (input.provider === "mercadopago") {
    const r = await createMercadoPagoPreference(cfg, input, sessionId);
    providerRef = r.providerRef;
    url = r.url;
  } else {
    const r = await createPayPalOrder(cfg, input, sessionId);
    providerRef = r.providerRef;
    url = r.url;
  }

  const { error } = await supabaseAdmin.from("affiliate_checkout_sessions" as any).insert({
    id: sessionId,
    provider: input.provider,
    provider_ref: providerRef,
    affiliate_id: affiliateId,
    product_id: input.productId ?? null,
    coupon_id: input.couponId ?? null,
    customer_email: input.customer.email,
    customer_name: input.customer.name ?? null,
    amount_cents: input.amountCents,
    currency: input.currency ?? "BRL",
    status: "pending",
    checkout_url: url,
    session_token: sessionToken,
    utm: input.utm ?? {},
    metadata: input.metadata ?? {},
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) throw new Error(error.message);
  return { sessionId, sessionToken, url, providerRef };
}

// Marca uma sessão de checkout como paga (chamado pelos webhooks).
// Retorna { sessionId, affiliateId, productId, amountCents } se transitou.
export async function markCheckoutPaid(params: {
  provider: string;
  providerRef: string;
}) {
  const { data: sess } = await supabaseAdmin
    .from("affiliate_checkout_sessions" as any)
    .select("*")
    .eq("provider", params.provider)
    .eq("provider_ref", params.providerRef)
    .maybeSingle();
  if (!sess) return null;
  if ((sess as any).status === "paid") return sess as any;
  await supabaseAdmin
    .from("affiliate_checkout_sessions" as any)
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", (sess as any).id);
  return sess as any;
}
