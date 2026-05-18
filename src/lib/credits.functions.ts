import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Centralized credit cost per action
export const CREDIT_COSTS = {
  oracle_message: 1,
  report_personality: 5,
  report_love: 5,
  report_career: 5,
  report_spiritual: 5,
  tarot_reading: 2,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

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
  const amount = CREDIT_COSTS[action];
  const { data, error } = await supabaseAdmin.rpc("consume_credits", {
    _user_id: userId,
    _amount: amount,
    _kind: action,
    _reference: reference ?? null,
  });
  if (error) {
    console.error("[credits] consume error", error);
    throw new Error("Falha ao debitar créditos.");
  }
  return data === true;
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
      .select("id, amount, kind, reference, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
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
  amount: z.number().int().refine((n) => n !== 0, "Valor não pode ser zero").min(-10000).max(10000),
  reason: z.string().trim().min(1, "Informe um motivo").max(240),
});

export const adminAdjustCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => AdjustSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const kind = data.amount > 0 ? "admin_grant" : "admin_revoke";
    const { data: newBalance, error } = await supabaseAdmin.rpc("adjust_credits", {
      _user_id: data.user_id,
      _amount: data.amount,
      _kind: kind,
      _reference: `[admin:${context.userId}] ${data.reason}`,
    });
    if (error) throw new Error(error.message);
    return { balance: newBalance as number };
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
        .select("id, amount, kind, reference, created_at")
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
