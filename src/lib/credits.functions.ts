import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Fallback defaults — used only if DB row missing
export const CREDIT_COSTS_DEFAULTS = {
  oracle_message: 1,
  report_personality: 5,
  report_love: 5,
  report_career: 5,
  report_spiritual: 5,
  tarot_reading: 2,
  astro_chart: 3,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS_DEFAULTS | string;

/** Read configurable cost for an action from the credit_costs table. */
export async function getCreditCost(action: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("credit_costs")
    .select("amount")
    .eq("action", action)
    .maybeSingle();
  if (data && typeof data.amount === "number") return data.amount;
  return (CREDIT_COSTS_DEFAULTS as Record<string, number>)[action] ?? 0;
}

/**
 * Server-side helper: consume credits atomically. Returns true if charged,
 * false if balance insufficient. Bypasses subscriptions check (callers should
 * skip this when an active addon grants unlimited usage).
 */
export async function consumeCredits(
  userId: string,
  action: CreditAction,
  reference?: string,
): Promise<boolean> {
  const amount = await getCreditCost(action);
  if (amount <= 0) return true; // free action
  const { data, error } = await supabaseAdmin.rpc("consume_credits", {
    _user_id: userId,
    _amount: amount,
    _kind: action,
    _reference: reference,
  });
  if (error) {
    console.error("[credits] consume error", error);
    throw new Error("Falha ao debitar créditos.");
  }
  return data === true;
}

/**
 * Refund credits back to the user. Use when a charged action fails
 * (e.g. PDF/map generation error, upstream timeout) or when the user
 * cancels mid-flight. The transaction is recorded as `refund_<action>`
 * with a reference containing the reason and the actor who triggered it.
 *
 * Returns the amount that was credited back. If `amount` is omitted,
 * it defaults to the configured cost of the action.
 */
export async function refundCredits(
  userId: string,
  action: CreditAction,
  opts: {
    reason: string;
    actorUserId?: string | null;
    actorLabel?: string;
    amount?: number;
    originalReference?: string;
  },
): Promise<number> {
  const amount =
    typeof opts.amount === "number" ? opts.amount : await getCreditCost(action);
  if (amount <= 0) return 0;
  const actor =
    opts.actorLabel ??
    (opts.actorUserId ? `system[${opts.actorUserId}]` : "system");
  const ref = [
    `[refund:${action}]`,
    `actor=${actor}`,
    opts.originalReference ? `origin=${opts.originalReference}` : null,
    `reason=${opts.reason}`,
  ]
    .filter(Boolean)
    .join(" ");
  const { data, error } = await supabaseAdmin.rpc("adjust_credits", {
    _user_id: userId,
    _amount: amount,
    _kind: `refund_${action}`,
    _reference: ref,
  });
  if (error) {
    console.error("[credits] refund error", error);
    throw new Error("Falha ao estornar créditos.");
  }
  return amount;
}

/**
 * Check if user has an active subscription that bypasses credit cost
 * for the given action.
 */
export async function hasUnlimitedAccess(
  userId: string,
  action: CreditAction,
): Promise<boolean> {
  const addonId = action.startsWith("report_")
    ? "sub_unlimited_reports"
    : action === "oracle_message"
      ? "sub_oracle_premium"
      : null;
  if (!addonId) return false;
  const { data } = await supabaseAdmin
    .from("user_subscriptions")
    .select("status")
    .eq("user_id", userId)
    .eq("addon_id", addonId)
    .eq("status", "active")
    .maybeSingle();
  return !!data;
}

/** Get user's current balance (own). */
export const getMyCredits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("user_credits")
      .select("balance, updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { balance: data?.balance ?? 0, updated_at: data?.updated_at ?? null };
  });

/** Recent transactions (own). */
export const listMyCreditTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ limit: z.number().int().min(1).max(100).default(30) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows } = await supabaseAdmin
      .from("credit_transactions")
      .select("id, amount, kind, action, reference, balance_before, balance_after, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    return { transactions: rows ?? [] };
  });

/** Detailed credit history (own) with filters. */
const HistoryFilterSchema = z.object({
  action: z.string().trim().max(64).optional().nullable(),
  from: z.string().datetime().optional().nullable(),
  to: z.string().datetime().optional().nullable(),
  limit: z.number().int().min(1).max(500).default(100),
});

export const listMyCreditHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => HistoryFilterSchema.parse(d))
  .handler(async ({ data, context }) => {
    let q = supabaseAdmin
      .from("credit_transactions")
      .select(
        "id, amount, kind, action, reference, balance_before, balance_after, created_at",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.action) q = q.eq("action", data.action);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { transactions: rows ?? [] };
  });

// =========== Admin operations ===========

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

const AdjustSchema = z.object({
  user_id: z.string().uuid(),
  amount: z
    .number()
    .int()
    .min(-10000)
    .max(10000)
    .refine((n) => n !== 0, "Valor não pode ser zero"),
  reason: z.string().trim().min(1, "Informe um motivo").max(240),
});

export const adminAdjustCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => AdjustSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const amount: number = data.amount;
    const kind = amount > 0 ? "admin_grant" : "admin_revoke";
    const reference: string = `[admin:${context.userId}] ${data.reason}`;
    const { data: newBalance, error } = await supabaseAdmin.rpc("adjust_credits", {
      _user_id: data.user_id,
      _amount: amount,
      _kind: kind,
      _reference: reference,
    });
    if (error) throw new Error(error.message);
    return { balance: (newBalance as number) ?? 0 };
  });

export const adminGetUserCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const [{ data: credits }, { data: txs }] = await Promise.all([
      supabaseAdmin
        .from("user_credits")
        .select("balance, updated_at")
        .eq("user_id", data.user_id)
        .maybeSingle(),
      supabaseAdmin
        .from("credit_transactions")
        .select("id, amount, kind, action, reference, balance_before, balance_after, created_at")
        .eq("user_id", data.user_id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    return {
      balance: credits?.balance ?? 0,
      updated_at: credits?.updated_at ?? null,
      transactions: txs ?? [],
    };
  });

const AdminHistorySchema = z.object({
  user_id: z.string().uuid(),
  action: z.string().trim().max(64).optional().nullable(),
  from: z.string().datetime().optional().nullable(),
  to: z.string().datetime().optional().nullable(),
  limit: z.number().int().min(1).max(500).default(100),
});

export const adminListCreditHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => AdminHistorySchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("credit_transactions")
      .select(
        "id, amount, kind, action, reference, balance_before, balance_after, created_at",
      )
      .eq("user_id", data.user_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.action) q = q.eq("action", data.action);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { transactions: rows ?? [] };
  });

// =========== Credit cost configuration ===========

export const adminListCreditCosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("credit_costs")
      .select("action, amount, label, description, updated_at")
      .order("action", { ascending: true });
    if (error) throw new Error(error.message);
    return { costs: data ?? [] };
  });

const UpsertCostSchema = z.object({
  action: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/i, "Use apenas letras, números e underline"),
  amount: z.number().int().min(0).max(10000),
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
});

export const adminUpsertCreditCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpsertCostSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("credit_costs")
      .upsert(
        {
          action: data.action,
          amount: data.amount,
          label: data.label,
          description: data.description ?? null,
          updated_by: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "action" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCreditCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ action: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("credit_costs")
      .delete()
      .eq("action", data.action);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
