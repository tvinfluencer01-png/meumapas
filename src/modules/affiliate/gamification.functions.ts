// FASE 4D — Server functions de Gamificação (Admin + Afiliado).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: any) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
}

async function getAffiliateId(ctx: any) {
  const { data } = await ctx.supabase
    .from("affiliate_profiles").select("id").eq("user_id", ctx.userId).maybeSingle();
  return data?.id as string | undefined;
}

// ═══════════════════════════ Levels ═══════════════════════════
export const listLevels = createServerFn({ method: "GET" })
  .handler(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!);
    const { data } = await sb.from("affiliate_levels").select("*").order("sort_order");
    return data ?? [];
  });

const levelSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  min_points: z.number().int().nonnegative(),
  min_revenue_cents: z.number().int().nonnegative(),
  min_conversions: z.number().int().nonnegative(),
  commission_bonus_bps: z.number().int().nonnegative(),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  sort_order: z.number().int().nonnegative(),
  active: z.boolean().optional(),
});

export const upsertLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => levelSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("affiliate_levels").upsert(data).select().single();
    if (error) throw error;
    return row;
  });

export const deleteLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("affiliate_levels").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ═══════════════════════════ Badges ═══════════════════════════
export const listBadges = createServerFn({ method: "GET" })
  .handler(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!);
    const { data } = await sb.from("affiliate_badges").select("*").order("rarity");
    return data ?? [];
  });

const badgeSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  criteria: z.record(z.any()).default({}),
  points_reward: z.number().int().nonnegative().default(0),
  rarity: z.enum(["common", "uncommon", "rare", "epic", "legendary"]).default("common"),
  active: z.boolean().optional(),
});

export const upsertBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => badgeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("affiliate_badges").upsert(data).select().single();
    if (error) throw error;
    return row;
  });

export const deleteBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("affiliate_badges").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ═══════════════════════════ Missions ═══════════════════════════
export const listMissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("affiliate_missions").select("*").order("ends_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

const missionSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  mission_type: z.enum(["daily", "weekly", "monthly", "campaign"]).default("weekly"),
  goal_metric: z.enum(["revenue_cents", "conversions", "clicks", "signups"]),
  goal_value: z.number().nonnegative(),
  points_reward: z.number().int().nonnegative().default(0),
  bonus_cents: z.number().int().nonnegative().default(0),
  badge_id: z.string().uuid().optional().nullable(),
  starts_at: z.string(),
  ends_at: z.string(),
  active: z.boolean().optional(),
});

export const upsertMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => missionSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("affiliate_missions").upsert(data).select().single();
    if (error) throw error;
    return row;
  });

export const deleteMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("affiliate_missions").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ═══════════════════════════ Leaderboard ═══════════════════════════
export const getLeaderboard = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({
      period: z.enum(["daily", "weekly", "monthly", "alltime"]).default("monthly"),
      metric: z.enum(["revenue", "conversions", "points"]).default("revenue"),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const { buildLeaderboard } = await import("./gamification.server");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    return await buildLeaderboard(sb, data.period, data.metric, 100);
  });

// ═══════════════════════════ Painel do afiliado ═══════════════════════════
export const getMyGamification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const affiliateId = await getAffiliateId(context);
    if (!affiliateId) return null;

    const [pts, badges, allBadges, missions, progress, levels] = await Promise.all([
      context.supabase.from("affiliate_points").select("*, level:affiliate_levels(*)").eq("affiliate_id", affiliateId).maybeSingle(),
      context.supabase.from("affiliate_badge_awards").select("*, badge:affiliate_badges(*)").eq("affiliate_id", affiliateId),
      context.supabase.from("affiliate_badges").select("*").eq("active", true),
      context.supabase.from("affiliate_missions").select("*").eq("active", true).gte("ends_at", new Date().toISOString()),
      context.supabase.from("affiliate_mission_progress").select("*").eq("affiliate_id", affiliateId),
      context.supabase.from("affiliate_levels").select("*").eq("active", true).order("sort_order"),
    ]);

    return {
      points: pts.data ?? { points: 0, level: null },
      badges: badges.data ?? [],
      allBadges: allBadges.data ?? [],
      missions: missions.data ?? [],
      progress: progress.data ?? [],
      levels: levels.data ?? [],
    };
  });

// Recalcula pontos/nível/badges do afiliado (admin manual ou pós-conversão)
export const recomputeAffiliateGamification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ affiliate_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { createClient } = await import("@supabase/supabase-js");
    const { recalcLevel, evaluateBadges } = await import("./gamification.server");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const level = await recalcLevel(sb, data.affiliate_id);
    const badges = await evaluateBadges(sb, data.affiliate_id);
    return { level, badges };
  });
