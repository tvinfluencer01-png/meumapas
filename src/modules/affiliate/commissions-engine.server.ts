// Motor avançado de comissões — FASE 4B / Módulo 5.
// Resolve a comissão devida ao afiliado a partir de:
//  1) Overrides específicos (affiliate + product, affiliate, product, global)
//  2) Regras escalonadas (tiers) por volume/contagem/receita no período
//  3) Regra do produto (affiliate_products.commission_rate)
//  4) Taxa padrão do afiliado / global (affiliate_settings.default_commission_rate)
//
// Retorna o valor em centavos + memo do cálculo para auditoria.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { writeLedger } from "./ledger.server";

export interface ResolveInput {
  affiliateId: string;
  productId?: string | null;
  orderAmountCents: number;
  isFirstPurchase?: boolean;
  isRecurring?: boolean;
  purchaseCountForCustomer?: number;
  orderRef?: string;
}

export interface ResolveResult {
  commissionCents: number;
  ratePercent: number | null;
  amountCents: number | null;
  source: string; // 'override' | 'tier' | 'product' | 'global'
  matchedId: string | null;
  memo: Record<string, unknown>;
}

function periodStart(period: string): Date {
  const now = new Date();
  const d = new Date(now);
  if (period === "month") d.setUTCDate(1);
  else if (period === "quarter") {
    const q = Math.floor(d.getUTCMonth() / 3) * 3;
    d.setUTCMonth(q, 1);
  } else if (period === "year") d.setUTCMonth(0, 1);
  else return new Date(0);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function volumeForPeriod(
  affiliateId: string,
  metric: "volume" | "count" | "revenue",
  period: string,
): Promise<number> {
  const since = periodStart(period).toISOString();
  const { data } = await supabaseAdmin
    .from("affiliate_orders" as any)
    .select("amount_cents, status, created_at")
    .eq("affiliate_id", affiliateId)
    .in("status", ["paid"])
    .gte("created_at", since);
  const rows = (data ?? []) as any[];
  if (metric === "count") return rows.length;
  return rows.reduce((s, r) => s + Number(r.amount_cents ?? 0), 0);
}

async function findOverride(input: ResolveInput) {
  const now = new Date().toISOString();
  const { data } = await supabaseAdmin
    .from("affiliate_commission_overrides" as any)
    .select("*")
    .eq("active", true)
    .or(
      `affiliate_id.eq.${input.affiliateId},affiliate_id.is.null`,
    )
    .order("priority", { ascending: false });
  const rows = (data ?? []) as any[];
  for (const r of rows) {
    if (r.starts_at && r.starts_at > now) continue;
    if (r.ends_at && r.ends_at < now) continue;
    if (r.product_id && r.product_id !== input.productId) continue;
    if (r.affiliate_id && r.affiliate_id !== input.affiliateId) continue;
    if (r.kind === "first_purchase" && !input.isFirstPurchase) continue;
    if (r.kind === "recurring" && !input.isRecurring) continue;
    if (r.recurrence_limit && (input.purchaseCountForCustomer ?? 0) > r.recurrence_limit)
      continue;
    return r;
  }
  return null;
}

async function findTier(input: ResolveInput) {
  const { data: rulesRaw } = await supabaseAdmin
    .from("affiliate_commission_rules" as any)
    .select("*")
    .eq("tier_enabled", true)
    .eq("active", true);
  const rules = (rulesRaw ?? []) as any[];
  for (const rule of rules) {
    if (rule.product_id && rule.product_id !== input.productId) continue;
    if (rule.affiliate_id && rule.affiliate_id !== input.affiliateId) continue;
    const metric = rule.tier_metric ?? "volume";
    const period = rule.tier_period ?? "month";
    const measured = await volumeForPeriod(input.affiliateId, metric, period);
    const { data: tiersRaw } = await supabaseAdmin
      .from("affiliate_commission_tiers" as any)
      .select("*")
      .eq("rule_id", rule.id)
      .eq("active", true)
      .order("priority", { ascending: false });
    const tiers = (tiersRaw ?? []) as any[];
    for (const t of tiers) {
      const bound = metric === "count" ? measured : measured;
      const minOk = metric === "count"
        ? bound >= (t.min_count ?? 0)
        : bound >= Number(t.min_volume_cents ?? 0);
      const maxOk = metric === "count"
        ? t.max_count == null || bound <= t.max_count
        : t.max_volume_cents == null || bound <= Number(t.max_volume_cents);
      if (minOk && maxOk) return { rule, tier: t, measured };
    }
  }
  return null;
}

async function findProduct(productId?: string | null) {
  if (!productId) return null;
  const { data } = await supabaseAdmin
    .from("affiliate_products" as any)
    .select("id, commission_rate, commission_amount_cents")
    .eq("id", productId)
    .maybeSingle();
  return data as any;
}

async function defaultRate(affiliateId: string): Promise<number> {
  const { data: prof } = await supabaseAdmin
    .from("affiliate_profiles" as any)
    .select("default_commission_rate")
    .eq("id", affiliateId)
    .maybeSingle();
  if ((prof as any)?.default_commission_rate != null)
    return Number((prof as any).default_commission_rate);
  const { data: s } = await supabaseAdmin
    .from("affiliate_settings" as any)
    .select("default_commission_rate")
    .eq("id", "global")
    .maybeSingle();
  return Number((s as any)?.default_commission_rate ?? 30);
}

export async function resolveCommission(input: ResolveInput): Promise<ResolveResult> {
  // 1) override
  const over = await findOverride(input);
  if (over) {
    const cents = over.amount_cents != null
      ? Number(over.amount_cents)
      : Math.round((input.orderAmountCents * Number(over.rate_percent ?? 0)) / 100);
    return {
      commissionCents: cents,
      ratePercent: over.rate_percent != null ? Number(over.rate_percent) : null,
      amountCents: over.amount_cents ?? null,
      source: "override",
      matchedId: over.id,
      memo: { kind: over.kind, scope: over.scope },
    };
  }
  // 2) tier
  const t = await findTier(input);
  if (t) {
    const cents = t.tier.amount_cents != null
      ? Number(t.tier.amount_cents)
      : Math.round((input.orderAmountCents * Number(t.tier.rate_percent ?? 0)) / 100);
    return {
      commissionCents: cents,
      ratePercent: t.tier.rate_percent != null ? Number(t.tier.rate_percent) : null,
      amountCents: t.tier.amount_cents ?? null,
      source: "tier",
      matchedId: t.tier.id,
      memo: { ruleId: t.rule.id, measured: t.measured, period: t.tier.period },
    };
  }
  // 3) product
  const p = await findProduct(input.productId ?? null);
  if (p && (p.commission_rate != null || p.commission_amount_cents != null)) {
    const cents = p.commission_amount_cents != null
      ? Number(p.commission_amount_cents)
      : Math.round((input.orderAmountCents * Number(p.commission_rate ?? 0)) / 100);
    return {
      commissionCents: cents,
      ratePercent: p.commission_rate != null ? Number(p.commission_rate) : null,
      amountCents: p.commission_amount_cents ?? null,
      source: "product",
      matchedId: p.id,
      memo: {},
    };
  }
  // 4) global / affiliate default
  const rate = await defaultRate(input.affiliateId);
  const cents = Math.round((input.orderAmountCents * rate) / 100);
  return {
    commissionCents: cents,
    ratePercent: rate,
    amountCents: null,
    source: "global",
    matchedId: null,
    memo: { rate },
  };
}

// Grava a comissão + credita o ledger do afiliado.
export async function recordCommissionAndLedger(params: {
  input: ResolveInput;
  orderId: string;
}) {
  const res = await resolveCommission(params.input);
  if (res.commissionCents <= 0) return { commissionId: null, ...res };
  const { data, error } = await supabaseAdmin
    .from("affiliate_commissions" as any)
    .insert({
      affiliate_id: params.input.affiliateId,
      order_id: params.orderId,
      amount_cents: res.commissionCents,
      rate: res.ratePercent ?? 0,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await writeLedger({
    affiliateId: params.input.affiliateId,
    type: "commission",
    direction: "credit",
    amountCents: res.commissionCents,
    referenceType: "commission",
    referenceId: (data as any).id,
    description: `Comissão pedido ${params.input.orderRef ?? params.orderId} (${res.source})`,
    metadata: res.memo,
  });
  try {
    const { dispatchEvent } = await import("./notifications.server");
    await dispatchEvent(supabaseAdmin, {
      event_key: "commission.created",
      affiliate_id: params.input.affiliateId,
      variables: {
        commission_id: (data as any).id,
        order_id: params.orderId,
        order_ref: params.input.orderRef ?? null,
        amount_cents: res.commissionCents,
        amount_brl: (res.commissionCents / 100).toFixed(2),
        source: res.source,
      },
    });
  } catch (e) { console.error("[commissions] dispatchEvent failed", e); }
  return { commissionId: (data as any).id, ...res };
}
