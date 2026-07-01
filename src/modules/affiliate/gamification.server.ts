// FASE 4D — Motor de Gamificação: pontos, níveis, badges, missões e ranking.
// Server-only helpers (não expor diretamente ao cliente).

type Db = any;

export type LevelRow = {
  id: string;
  slug: string;
  name: string;
  min_points: number;
  min_revenue_cents: number;
  min_conversions: number;
  commission_bonus_bps: number;
  color: string | null;
  icon: string | null;
  sort_order: number;
  active: boolean;
};

/**
 * Concede/subtrai pontos ao afiliado e registra no ledger.
 * Recalcula o nível automaticamente.
 */
export async function awardPoints(
  supabase: Db,
  affiliateId: string,
  delta: number,
  reason: string,
  reference?: string,
  metadata: Record<string, unknown> = {},
) {
  if (!Number.isFinite(delta) || delta === 0) return { points: null };

  // Upsert saldo
  const { data: current } = await supabase
    .from("affiliate_points")
    .select("points, level_id")
    .eq("affiliate_id", affiliateId)
    .maybeSingle();

  const prevPoints = current?.points ?? 0;
  const newPoints = Math.max(0, prevPoints + delta);

  await supabase
    .from("affiliate_points")
    .upsert({ affiliate_id: affiliateId, points: newPoints, updated_at: new Date().toISOString() });

  await supabase
    .from("affiliate_points_ledger")
    .insert({ affiliate_id: affiliateId, delta, reason, reference: reference ?? null, metadata });

  await recalcLevel(supabase, affiliateId);
  return { points: newPoints };
}

/**
 * Recalcula o nível do afiliado com base em pontos + receita + conversões.
 */
export async function recalcLevel(supabase: Db, affiliateId: string) {
  const { data: levels } = await supabase
    .from("affiliate_levels")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (!levels?.length) return null;

  const { data: pts } = await supabase
    .from("affiliate_points")
    .select("points, level_id")
    .eq("affiliate_id", affiliateId)
    .maybeSingle();

  // Métricas do afiliado
  const { data: agg } = await supabase
    .from("affiliate_ledger")
    .select("amount_cents, entry_type")
    .eq("affiliate_id", affiliateId);

  const revenueCents = (agg ?? [])
    .filter((r: any) => r.entry_type === "commission")
    .reduce((s: number, r: any) => s + Number(r.amount_cents ?? 0), 0);

  const { count: conversions } = await supabase
    .from("affiliate_touchpoints")
    .select("id", { count: "exact", head: true })
    .eq("affiliate_id", affiliateId)
    .not("converted_at", "is", null);

  const points = pts?.points ?? 0;
  const prevLevelId = (pts as any)?.level_id ?? null;

  let matched: LevelRow = levels[0];
  for (const lvl of levels as LevelRow[]) {
    if (
      points >= lvl.min_points &&
      revenueCents >= lvl.min_revenue_cents &&
      (conversions ?? 0) >= lvl.min_conversions
    ) {
      matched = lvl;
    }
  }

  await supabase
    .from("affiliate_points")
    .upsert({ affiliate_id: affiliateId, level_id: matched.id, updated_at: new Date().toISOString() });

  if (prevLevelId && prevLevelId !== matched.id) {
    try {
      const { dispatchEvent } = await import("./notifications.server");
      await dispatchEvent(supabase, {
        event_key: "level.up",
        affiliate_id: affiliateId,
        variables: {
          level_slug: matched.slug,
          level_name: matched.name,
          level_color: matched.color,
          commission_bonus_bps: matched.commission_bonus_bps,
          points,
        },
      });
    } catch (e) { console.error("[gamification] level.up dispatchEvent failed", e); }
  }

  return matched;
}

/**
 * Avalia critérios de badges e concede as que se aplicam.
 * Idempotente graças à UNIQUE(affiliate_id, badge_id).
 */
export async function evaluateBadges(supabase: Db, affiliateId: string) {
  const { data: badges } = await supabase
    .from("affiliate_badges")
    .select("*")
    .eq("active", true);
  if (!badges?.length) return { awarded: [] };

  // Métricas
  const { count: conversions } = await supabase
    .from("affiliate_touchpoints")
    .select("id", { count: "exact", head: true })
    .eq("affiliate_id", affiliateId)
    .not("converted_at", "is", null);

  const { data: rev } = await supabase
    .from("affiliate_ledger")
    .select("amount_cents")
    .eq("affiliate_id", affiliateId)
    .eq("entry_type", "commission");
  const revenueCents = (rev ?? []).reduce((s: number, r: any) => s + Number(r.amount_cents ?? 0), 0);

  const metrics: Record<string, number> = {
    conversions: conversions ?? 0,
    revenue_cents: revenueCents,
  };

  const { data: already } = await supabase
    .from("affiliate_badge_awards")
    .select("badge_id")
    .eq("affiliate_id", affiliateId);
  const owned = new Set((already ?? []).map((r: any) => r.badge_id));

  const awarded: string[] = [];
  for (const b of badges as any[]) {
    if (owned.has(b.id)) continue;
    const c = b.criteria ?? {};
    const metric = c.metric as string | undefined;
    const gte = Number(c.gte ?? 0);
    if (!metric) continue;
    const value = metrics[metric] ?? 0;
    if (value >= gte) {
      await supabase.from("affiliate_badge_awards").insert({
        affiliate_id: affiliateId,
        badge_id: b.id,
        context: { metric, value, gte },
      });
      if (b.points_reward) {
        await awardPoints(supabase, affiliateId, b.points_reward, `badge:${b.slug}`, b.id);
      }
      awarded.push(b.slug);
    }
  }
  return { awarded };
}

/**
 * Atualiza progresso de missões em aberto para o afiliado.
 */
export async function updateMissionProgress(
  supabase: Db,
  affiliateId: string,
  metric: string,
  increment: number,
) {
  const now = new Date().toISOString();
  const { data: missions } = await supabase
    .from("affiliate_missions")
    .select("*")
    .eq("active", true)
    .eq("goal_metric", metric)
    .lte("starts_at", now)
    .gte("ends_at", now);

  if (!missions?.length) return { completed: [] };

  const completed: string[] = [];
  for (const m of missions as any[]) {
    const { data: prog } = await supabase
      .from("affiliate_mission_progress")
      .select("id, current_value, completed_at")
      .eq("mission_id", m.id)
      .eq("affiliate_id", affiliateId)
      .maybeSingle();

    const prev = Number(prog?.current_value ?? 0);
    const next = prev + increment;
    const done = next >= Number(m.goal_value);

    await supabase.from("affiliate_mission_progress").upsert({
      id: prog?.id,
      mission_id: m.id,
      affiliate_id: affiliateId,
      current_value: next,
      completed_at: done && !prog?.completed_at ? now : prog?.completed_at ?? null,
      updated_at: now,
    });

    if (done && !prog?.completed_at) {
      if (m.points_reward) {
        await awardPoints(supabase, affiliateId, m.points_reward, `mission:${m.slug}`, m.id);
      }
      completed.push(m.slug);
    }
  }
  return { completed };
}

/**
 * Reconstrói o snapshot do ranking para o período informado.
 * period: 'daily' | 'weekly' | 'monthly' | 'alltime'
 * metric: 'revenue' | 'conversions' | 'points'
 */
export async function buildLeaderboard(
  supabase: Db,
  period: "daily" | "weekly" | "monthly" | "alltime" = "monthly",
  metric: "revenue" | "conversions" | "points" = "revenue",
  limit = 100,
) {
  const now = new Date();
  let start = new Date(0);
  const end = now;
  if (period === "daily") start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (period === "weekly") {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay());
    d.setHours(0, 0, 0, 0);
    start = d;
  } else if (period === "monthly") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const map = new Map<string, number>();

  if (metric === "revenue") {
    const { data } = await supabase
      .from("affiliate_ledger")
      .select("affiliate_id, amount_cents, created_at, entry_type")
      .eq("entry_type", "commission")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());
    for (const r of data ?? []) {
      map.set(r.affiliate_id, (map.get(r.affiliate_id) ?? 0) + Number(r.amount_cents ?? 0));
    }
  } else if (metric === "conversions") {
    const { data } = await supabase
      .from("affiliate_touchpoints")
      .select("affiliate_id, converted_at")
      .not("converted_at", "is", null)
      .gte("converted_at", start.toISOString())
      .lte("converted_at", end.toISOString());
    for (const r of data ?? []) {
      map.set(r.affiliate_id, (map.get(r.affiliate_id) ?? 0) + 1);
    }
  } else {
    const { data } = await supabase
      .from("affiliate_points_ledger")
      .select("affiliate_id, delta")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());
    for (const r of data ?? []) {
      map.set(r.affiliate_id, (map.get(r.affiliate_id) ?? 0) + Number(r.delta ?? 0));
    }
  }

  const ids = [...map.keys()];
  const { data: profiles } = ids.length
    ? await supabase
        .from("affiliate_profiles")
        .select("id, full_name, affiliate_code")
        .in("id", ids)
    : { data: [] };

  const rankings = ids
    .map((id) => {
      const p = (profiles ?? []).find((x: any) => x.id === id);
      return {
        affiliate_id: id,
        code: p?.affiliate_code ?? null,
        display_name: p?.full_name ?? "Afiliado",
        
        value: map.get(id) ?? 0,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((r, i) => ({ ...r, position: i + 1 }));

  await supabase.from("affiliate_leaderboard_snapshots").upsert(
    {
      period,
      period_start: start.toISOString(),
      period_end: end.toISOString(),
      metric,
      rankings,
    },
    { onConflict: "period,period_start,metric" },
  );

  return { period, metric, period_start: start.toISOString(), rankings };
}
