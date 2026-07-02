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
    if (isAppAdmin !== true) throw new Error("Acesso restrito ao painel administrativo.");
  }
}

type Bucket = Record<string, { key: string; clicks: number; visitors: Set<string>; conversions: number; revenueCents: number }>;

function ensureBucket(b: Bucket, key: string) {
  if (!b[key]) b[key] = { key, clicks: 0, visitors: new Set(), conversions: 0, revenueCents: 0 };
  return b[key];
}

function bucketToArray(b: Bucket, limit = 25) {
  return Object.values(b)
    .map((r) => ({
      key: r.key,
      clicks: r.clicks,
      uniqueVisitors: r.visitors.size,
      conversions: r.conversions,
      revenueCents: r.revenueCents,
      conversionRate: r.clicks > 0 ? +((r.conversions / r.clicks) * 100).toFixed(2) : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

function extractPath(url: string | null | undefined): string {
  if (!url) return "(desconhecido)";
  try {
    const u = new URL(url);
    return u.pathname || "/";
  } catch {
    return url.length > 60 ? url.slice(0, 60) + "…" : url;
  }
}

function extractHost(url: string | null | undefined): string {
  if (!url) return "(direto)";
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "(desconhecido)";
  }
}

export const adminGetAffiliateReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number }) => ({ days: Math.min(365, Math.max(1, input?.days ?? 30)) }))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const sb = context.supabase;
    const since = new Date(Date.now() - data.days * 86400000).toISOString();

    // Pull raw data in parallel
    const [clicksRes, convRes, affRes] = await Promise.all([
      sb.from("affiliate_clicks" as any)
        .select("affiliate_id,landing_url,referrer,utm_source,utm_medium,utm_campaign,country,city,device,browser,os,session_token,landed_at")
        .gte("landed_at", since)
        .limit(50000),
      sb.from("affiliate_conversions" as any)
        .select("affiliate_id,type,value_cents,reference,occurred_at")
        .gte("occurred_at", since)
        .limit(50000),
      sb.from("affiliate_profiles" as any)
        .select("id,full_name,affiliate_code,email"),
    ]);

    const clicks = (clicksRes.data ?? []) as any[];
    const conversions = (convRes.data ?? []) as any[];
    const affiliates = (affRes.data ?? []) as any[];
    const affMap = new Map<string, any>(affiliates.map((a) => [a.id, a]));

    // Landing pages, referrers, sources, campaigns, geo, device, affiliates
    const byLanding: Bucket = {};
    const byReferrer: Bucket = {};
    const bySource: Bucket = {};
    const byMedium: Bucket = {};
    const byCampaign: Bucket = {};
    const byCountry: Bucket = {};
    const byCity: Bucket = {};
    const byDevice: Bucket = {};
    const byBrowser: Bucket = {};
    const byOs: Bucket = {};
    const byAffiliate: Bucket = {};
    const daily: Record<string, { date: string; clicks: number; conversions: number; revenueCents: number }> = {};

    for (const c of clicks) {
      const landingKey = extractPath(c.landing_url);
      const refKey = extractHost(c.referrer);
      const srcKey = c.utm_source || "(none)";
      const medKey = c.utm_medium || "(none)";
      const cmpKey = c.utm_campaign || "(none)";
      const ctryKey = c.country || "(desconhecido)";
      const cityKey = c.city || "(desconhecido)";
      const devKey = c.device || "(desconhecido)";
      const brwKey = c.browser || "(desconhecido)";
      const osKey = c.os || "(desconhecido)";
      const aff = affMap.get(c.affiliate_id);
      const affKey = aff ? ((aff.full_name && aff.full_name.trim()) || aff.email || aff.affiliate_code || c.affiliate_id) : c.affiliate_id;
      const dayKey = new Date(c.landed_at).toISOString().slice(0, 10);

      const tok = c.session_token || `${c.affiliate_id}-${c.landed_at}`;
      for (const [b, k] of [
        [byLanding, landingKey], [byReferrer, refKey], [bySource, srcKey], [byMedium, medKey],
        [byCampaign, cmpKey], [byCountry, ctryKey], [byCity, cityKey], [byDevice, devKey],
        [byBrowser, brwKey], [byOs, osKey], [byAffiliate, affKey],
      ] as [Bucket, string][]) {
        const row = ensureBucket(b, k);
        row.clicks++;
        row.visitors.add(tok);
      }

      if (!daily[dayKey]) daily[dayKey] = { date: dayKey, clicks: 0, conversions: 0, revenueCents: 0 };
      daily[dayKey].clicks++;
    }

    for (const cv of conversions) {
      const value = Number(cv.value_cents ?? 0);
      const aff = affMap.get(cv.affiliate_id);
      const affKey = aff ? (aff.full_name || aff.affiliate_code || aff.email || cv.affiliate_id) : cv.affiliate_id;
      const landingKey = extractPath(cv.reference);
      const dayKey = new Date(cv.occurred_at).toISOString().slice(0, 10);

      for (const [b, k] of [[byLanding, landingKey], [byAffiliate, affKey]] as [Bucket, string][]) {
        const row = ensureBucket(b, k);
        row.conversions++;
        if (cv.type === "sale") row.revenueCents += value;
      }
      if (!daily[dayKey]) daily[dayKey] = { date: dayKey, clicks: 0, conversions: 0, revenueCents: 0 };
      daily[dayKey].conversions++;
      if (cv.type === "sale") daily[dayKey].revenueCents += value;
    }

    // Funnel totals
    const totalClicks = clicks.length;
    const uniqueVisitors = new Set(clicks.map((c) => c.session_token || `${c.affiliate_id}-${c.landed_at}`)).size;
    const signups = conversions.filter((c) => c.type === "signup" || c.type === "registration").length;
    const checkouts = conversions.filter((c) => c.type === "checkout").length;
    const sales = conversions.filter((c) => c.type === "sale").length;
    const revenueCents = conversions.filter((c) => c.type === "sale").reduce((s, c) => s + Number(c.value_cents ?? 0), 0);

    return {
      periodDays: data.days,
      totals: { clicks: totalClicks, uniqueVisitors, signups, checkouts, sales, revenueCents,
        conversionRate: totalClicks > 0 ? +((sales / totalClicks) * 100).toFixed(2) : 0 },
      byLanding: bucketToArray(byLanding),
      byReferrer: bucketToArray(byReferrer),
      bySource: bucketToArray(bySource),
      byMedium: bucketToArray(byMedium),
      byCampaign: bucketToArray(byCampaign),
      byCountry: bucketToArray(byCountry),
      byCity: bucketToArray(byCity),
      byDevice: bucketToArray(byDevice),
      byBrowser: bucketToArray(byBrowser),
      byOs: bucketToArray(byOs),
      byAffiliateTraffic: bucketToArray(byAffiliate),
      byAffiliateRevenue: Object.values(byAffiliate)
        .map((r) => ({ key: r.key, clicks: r.clicks, conversions: r.conversions, revenueCents: r.revenueCents }))
        .sort((a, b) => b.revenueCents - a.revenueCents)
        .slice(0, 25),
      daily: Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)),
    };
  });
