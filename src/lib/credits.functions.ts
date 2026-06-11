import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Canonical catalog of cobráveis actions.
 * Single source of truth for label + description + default amount.
 * The DB table `credit_costs` overrides amount/label/description if a row
 * exists for the given action key (managed via Super Admin).
 */
export const CREDIT_COST_CATALOG = {
  oracle_message: {
    amount: 1,
    label: "Oráculo — Pergunta Respondida",
    description: "Custo por cada pergunta que a IA responde no chat (modelo atual).",
  },
  oracle_consultation: {
    amount: 0,
    label: "Oráculo — Nova Consulta",
    description: "Custo para iniciar uma nova sessão/conversa com o Oráculo.",
  },
  oracle_question: {
    amount: 0,
    label: "Oráculo — Pergunta Enviada",
    description: "Custo cobrado no momento que o usuário envia uma pergunta.",
  },
  oracle_answer: {
    amount: 0,
    label: "Oráculo — Resposta Gerada",
    description: "Custo cobrado para cada resposta gerada pela IA.",
  },
  astro_chart: {
    amount: 3,
    label: "Mapa Astral",
    description: "Cálculo completo do mapa natal via Swiss Ephemeris.",
  },
  report_personality: {
    amount: 5,
    label: "Relatório PDF — Personalidade",
    description: "Geração do PDF completo do Mapa da Personalidade.",
  },
  report_love: {
    amount: 5,
    label: "Relatório PDF — Amor & Relacionamentos",
    description: "Geração do PDF completo de amor e relacionamentos.",
  },
  report_career: {
    amount: 5,
    label: "Relatório PDF — Carreira & Propósito",
    description: "Geração do PDF completo de carreira e propósito.",
  },
  report_spiritual: {
    amount: 5,
    label: "Relatório PDF — Caminho Espiritual",
    description: "Geração do PDF completo do caminho espiritual.",
  },
  report_finance: {
    amount: 5,
    label: "Relatório PDF — Questões Financeiras",
    description: "Análise profunda de prosperidade, padrões financeiros e direção monetária baseada no mapa e numerologia.",
  },
  report_family: {
    amount: 5,
    label: "Relatório PDF — Vida Familiar",
    description: "Dinâmicas familiares, padrões ancestrais e caminhos de harmonização no lar.",
  },
  report_health: {
    amount: 5,
    label: "Relatório PDF — Saúde",
    description: "Tendências de vitalidade corpo-mente-espírito e práticas de cuidado baseadas no mapa e numerologia.",
  },
  report_friendships: {
    amount: 5,
    label: "Relatório PDF — Amizades",
    description: "Padrões sociais, vínculos de amizade e como cultivar círculos verdadeiros.",
  },
  report_business: {
    amount: 8,
    label: "Relatório PDF — Mapa Empresarial",
    description: "Análise profunda da empresa: arquétipo, sócios, dinâmicas entre sócios e previsões anuais.",
  },
  tarot_reading: {
    amount: 2,
    label: "Leitura de Tarot",
    description: "Tiragem de tarot interpretada por IA.",
  },
  tarot_card_day: {
    amount: 1,
    label: "Tarot — Carta do Dia",
    description: "Sorteio e leitura curta de 1 carta.",
  },
  tarot_three: {
    amount: 2,
    label: "Tarot — 3 Cartas (Passado · Presente · Futuro)",
    description: "Tiragem de 3 cartas com interpretação IA contextualizada.",
  },
  tarot_celtic: {
    amount: 5,
    label: "Tarot — Cruz Celta (10 cartas)",
    description: "Leitura completa de 10 cartas com interpretação aprofundada.",
  },
  tarot_pdf: {
    amount: 2,
    label: "Tarot — PDF da leitura",
    description: "Exporta a leitura realizada em PDF formatado.",
  },
  kabbalah_meditation: {
    amount: 3,
    label: "Meditação Cabalística",
    description: "Sessão guiada personalizada baseada na Árvore da Vida.",
  },
  kabbalah_pdf: {
    amount: 2,
    label: "Meditação Cabalística — PDF",
    description: "Exporta o roteiro da meditação em PDF.",
  },
  report_numerology: {
    amount: 5,
    label: "Relatório PDF — Numerologia",
    description: "Análise completa dos números da alma, destino e missão.",
  },
  weekly_reading: {
    amount: 1,
    label: "Leitura Semanal",
    description: "Previsão energética personalizada para a semana.",
  },
  energy_calendar: {
    amount: 2,
    label: "Calendário Energético",
    description: "Trânsitos e lunações cruzados com seu mapa para o mês.",
  },
} as const satisfies Record<string, { amount: number; label: string; description: string }>;

export type CreditAction = keyof typeof CREDIT_COST_CATALOG | string;

/** Backward-compatible amount map (used em alguns lugares legados). */
export const CREDIT_COSTS_DEFAULTS: Record<string, number> = Object.fromEntries(
  Object.entries(CREDIT_COST_CATALOG).map(([k, v]) => [k, v.amount]),
);

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
  // Map an action to one or more addon ids that grant unlimited access.
  const perReportAddon: Record<string, string> = {
    report_finance: "sub_unlimited_finance",
    report_family: "sub_unlimited_family",
    report_health: "sub_unlimited_health",
    report_friendships: "sub_unlimited_friendships",
    report_business: "sub_business_map",
  };
  const addonIds: string[] = [];
  if (action.startsWith("report_")) {
    addonIds.push("sub_unlimited_reports");
    const specific = perReportAddon[action];
    if (specific) addonIds.push(specific);
  } else if (action === "oracle_message") {
    addonIds.push("sub_oracle_premium");
  } else if (
    action === "tarot_card_day" ||
    action === "tarot_three" ||
    action === "tarot_celtic" ||
    action === "tarot_pdf"
  ) {
    addonIds.push("sub_tarot_unlimited");
  } else if (action === "kabbalah_meditation" || action === "kabbalah_pdf") {
    addonIds.push("sub_kabbalah_unlimited");
  }
  if (addonIds.length === 0) return false;
  const { data } = await supabaseAdmin
    .from("user_subscriptions")
    .select("addon_id")
    .eq("user_id", userId)
    .in("addon_id", addonIds)
    .eq("status", "active")
    .limit(1);
  return !!(data && data.length > 0);
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

/** Saldo + tabela de custos configurados — para mostrar antes de cada ação. */
export const getMyCreditsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: bal }, { data: costs }] = await Promise.all([
      supabaseAdmin
        .from("user_credits")
        .select("balance, updated_at")
        .eq("user_id", context.userId)
        .maybeSingle(),
      supabaseAdmin
        .from("credit_costs")
        .select("action, amount, label, description"),
    ]);
    const map: Record<string, { amount: number; label: string; description: string | null }> = {};
    // Seed do catálogo canônico (labels/descrições humanizadas)
    for (const [action, def] of Object.entries(CREDIT_COST_CATALOG)) {
      map[action] = {
        amount: def.amount,
        label: def.label,
        description: def.description,
      };
    }
    // Overrides do DB (admin pode editar valores e textos)
    for (const c of costs ?? []) {
      map[c.action] = {
        amount: c.amount,
        label: c.label || map[c.action]?.label || c.action,
        description: c.description ?? map[c.action]?.description ?? null,
      };
    }
    return {
      balance: bal?.balance ?? 0,
      updated_at: bal?.updated_at ?? null,
      costs: map,
    };
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

const RefundSchema = z.object({
  user_id: z.string().uuid(),
  action: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/i, "Ação inválida"),
  amount: z.number().int().min(1).max(10000).optional(),
  reason: z.string().trim().min(1, "Informe um motivo").max(240),
  original_tx_id: z.string().uuid().optional().nullable(),
});

/** Admin-triggered manual refund. */
export const adminRefundCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => RefundSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: actor } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", context.userId)
      .maybeSingle();
    const actorLabel = `admin:${actor?.full_name ?? context.userId}`;

    if (data.original_tx_id) {
      const { data: orig } = await supabaseAdmin
        .from("credit_transactions")
        .select("id, amount")
        .eq("id", data.original_tx_id)
        .eq("user_id", data.user_id)
        .maybeSingle();
      if (!orig) throw new Error("Transação original não encontrada.");
      if (orig.amount >= 0) throw new Error("Só é possível estornar débitos.");

      const { data: existing } = await supabaseAdmin
        .from("credit_transactions")
        .select("id")
        .eq("user_id", data.user_id)
        .ilike("reference", `%origin=${data.original_tx_id}%`)
        .limit(1)
        .maybeSingle();
      if (existing) throw new Error("Esta transação já foi estornada.");
    }

    const amount = await refundCredits(data.user_id, data.action, {
      reason: data.reason,
      actorUserId: context.userId,
      actorLabel,
      amount: data.amount,
      originalReference: data.original_tx_id ?? undefined,
    });

    return { ok: true, amount };
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
    const { data: dbCosts, error } = await supabaseAdmin
      .from("credit_costs")
      .select("action, amount, label, description, updated_at")
      .order("action", { ascending: true });
    if (error) throw new Error(error.message);

    const merged: Array<{
      action: string;
      amount: number;
      label: string;
      description: string | null;
      updated_at?: string | null;
      isDefault: boolean;
    }> = [];

    const dbMap = new Map((dbCosts ?? []).map((c) => [c.action, c]));

    // Add all from catalog
    for (const [action, def] of Object.entries(CREDIT_COST_CATALOG)) {
      const db = dbMap.get(action);
      merged.push({
        action,
        amount: db?.amount ?? def.amount,
        label: db?.label ?? def.label,
        description: db?.description ?? def.description,
        updated_at: db?.updated_at ?? null,
        isDefault: !db,
      });
      dbMap.delete(action);
    }

    // Add remaining from DB (custom actions)
    for (const db of dbMap.values()) {
      merged.push({
        ...db,
        isDefault: false,
      });
    }

    return { costs: merged };
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

// =========== Credit packages (compra avulsa) ===========

export const listCreditPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("credit_packages")
      .select("id, name, description, credits, price_cents, currency, active, sort_order, updated_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { packages: data ?? [] };
  });

export const adminListCreditPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("credit_packages")
      .select("id, name, description, credits, price_cents, currency, active, sort_order, updated_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { packages: data ?? [] };
  });

const UpsertPackageSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  credits: z.number().int().min(1).max(100000),
  price_cents: z.number().int().min(0).max(100000000),
  currency: z.string().trim().min(3).max(3).default("BRL"),
  active: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(10000).default(0),
});

export const adminUpsertCreditPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpsertPackageSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const payload = {
      name: data.name,
      description: data.description ?? null,
      credits: data.credits,
      price_cents: data.price_cents,
      currency: data.currency.toUpperCase(),
      active: data.active,
      sort_order: data.sort_order,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("credit_packages")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("credit_packages")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const adminDeleteCreditPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("credit_packages")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ApplyPackageSchema = z.object({
  user_id: z.string().uuid(),
  package_id: z.string().uuid(),
  note: z.string().trim().max(240).optional().nullable(),
});

/**
 * Aplica um pacote de créditos a um usuário (compra avulsa lançada pelo admin).
 * Lança automaticamente o saldo via adjust_credits e registra a transação
 * com kind=`package_purchase` e referência detalhada do pacote/admin.
 */
export const adminApplyCreditPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ApplyPackageSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: pkg, error: pErr } = await supabaseAdmin
      .from("credit_packages")
      .select("id, name, credits, price_cents, currency, active")
      .eq("id", data.package_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!pkg) throw new Error("Pacote não encontrado.");
    if (!pkg.active) throw new Error("Pacote inativo.");

    const priceLabel = (pkg.price_cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: pkg.currency || "BRL",
    });
    const ref = [
      `[package:${pkg.id}]`,
      `name=${pkg.name}`,
      `price=${priceLabel}`,
      `admin=${context.userId}`,
      data.note ? `note=${data.note}` : null,
    ]
      .filter(Boolean)
      .join(" ");

    const { data: newBalance, error } = await supabaseAdmin.rpc("adjust_credits", {
      _user_id: data.user_id,
      _amount: pkg.credits,
      _kind: "package_purchase",
      _reference: ref,
    });
    if (error) throw new Error(error.message);

    return {
      ok: true,
      balance: (newBalance as number) ?? 0,
      credits: pkg.credits,
      package_name: pkg.name,
    };
  });
