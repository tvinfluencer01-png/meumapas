// ServerFns públicos do módulo de monetização (FASE 4B).
// Chamados pelo painel admin e por componentes autenticados.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(context: any) {
  const { data } = await context.supabase.rpc("has_affiliate_role", {
    _user_id: context.userId,
    _role: "affiliate_admin",
  });
  if (data !== true) {
    const { data: isAppAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAppAdmin !== true) throw new Error("Acesso restrito.");
  }
}

// ── Providers de checkout ────────────────────────────────────
export const listCheckoutProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("affiliate_checkout_providers" as any)
      .select("*")
      .order("provider");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertCheckoutProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        provider: z.enum(["mercadopago", "paypal"]),
        label: z.string().min(1),
        enabled: z.boolean(),
        sandbox: z.boolean(),
        credentials: z.record(z.any()).default({}),
        fee_percent: z.number().default(0),
        fee_fixed_cents: z.number().int().default(0),
        currency: z.string().default("BRL"),
        webhook_secret: z.string().optional().nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("affiliate_checkout_providers" as any)
      .upsert({ ...data }, { onConflict: "provider" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Overrides de comissão ────────────────────────────────────
export const listCommissionOverrides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("affiliate_commission_overrides" as any)
      .select("*")
      .order("priority", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertCommissionOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        scope: z.enum(["affiliate", "product", "affiliate_product", "global"]),
        affiliate_id: z.string().uuid().optional().nullable(),
        product_id: z.string().uuid().optional().nullable(),
        kind: z.enum(["first_purchase", "recurring", "lifetime", "one_time", "tiered"]),
        rate_percent: z.number().optional().nullable(),
        amount_cents: z.number().int().optional().nullable(),
        recurrence_limit: z.number().int().optional().nullable(),
        starts_at: z.string().optional().nullable(),
        ends_at: z.string().optional().nullable(),
        priority: z.number().int().default(100),
        active: z.boolean().default(true),
        notes: z.string().optional().nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("affiliate_commission_overrides" as any)
      .upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCommissionOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("affiliate_commission_overrides" as any)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Tiers escalonadas ────────────────────────────────────────
export const listCommissionTiers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("affiliate_commission_tiers" as any)
      .select("*")
      .order("priority", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertCommissionTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        rule_id: z.string().uuid().optional().nullable(),
        affiliate_id: z.string().uuid().optional().nullable(),
        product_id: z.string().uuid().optional().nullable(),
        min_volume_cents: z.number().int().default(0),
        max_volume_cents: z.number().int().optional().nullable(),
        min_count: z.number().int().optional().nullable(),
        max_count: z.number().int().optional().nullable(),
        rate_percent: z.number().optional().nullable(),
        amount_cents: z.number().int().optional().nullable(),
        period: z.enum(["month", "quarter", "year", "lifetime"]).default("month"),
        priority: z.number().int().default(0),
        active: z.boolean().default(true),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("affiliate_commission_tiers" as any)
      .upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Payout batches ───────────────────────────────────────────
export const listPayoutBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("affiliate_payout_batches" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPayoutBatchFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        method: z.enum(["pix", "ted", "manual"]),
        withdrawIds: z.array(z.string().uuid()).optional(),
        notes: z.string().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { createPayoutBatch } = await import("./payouts.server");
    return createPayoutBatch({
      method: data.method,
      withdrawIds: data.withdrawIds,
      createdBy: context.userId,
      notes: data.notes,
    });
  });

export const markBatchItemPaidFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        itemId: z.string().uuid(),
        externalRef: z.string().optional(),
        receiptUrl: z.string().url().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { markBatchItemPaid } = await import("./payouts.server");
    return markBatchItemPaid(data.itemId, data.externalRef, data.receiptUrl);
  });

export const closeBatchFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ batchId: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { closeBatch } = await import("./payouts.server");
    return closeBatch(data.batchId);
  });

// ── Ledger (extrato) ─────────────────────────────────────────
export const getAffiliateLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ affiliateId: z.string().uuid().optional(), limit: z.number().int().default(200) }).parse(raw),
  )
  .handler(async ({ context, data }) => {
    // Admin vê qualquer afiliado; usuário afiliado vê apenas o seu.
    const { data: profile } = await context.supabase
      .from("affiliate_profiles" as any)
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    const ownId = (profile as any)?.id ?? null;
    const targetId = data.affiliateId ?? ownId;
    if (!targetId) throw new Error("Afiliado não encontrado.");
    if (data.affiliateId && data.affiliateId !== ownId) {
      await ensureAdmin(context);
    }
    const { data: rows, error } = await context.supabase
      .from("affiliate_ledger" as any)
      .select("*")
      .eq("affiliate_id", targetId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
