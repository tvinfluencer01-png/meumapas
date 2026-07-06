import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function extractHost(url: string | null | undefined): string {
  if (!url) return "(direto)";
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "(desconhecido)";
  }
}

function classifySource(host: string): string {
  const h = host.toLowerCase();
  if (h === "(direto)") return "Direto";
  if (/(google|bing|yahoo|duckduckgo|ecosia|brave)/.test(h)) return "Busca";
  if (/(facebook|instagram|threads|tiktok|twitter|x\.com|linkedin|youtube|pinterest|reddit|kwai|snapchat)/.test(h)) return "Redes sociais";
  if (/(whatsapp|wa\.me|t\.me|telegram|messenger|discord)/.test(h)) return "Mensageiros";
  if (/(mail|gmail|outlook|yahoo|hotmail)/.test(h)) return "Email";
  return "Outros";
}

type Bucket = { key: string; clicks: number; visitors: Set<string> };
const bump = (m: Map<string, Bucket>, key: string, tok: string) => {
  const rec = m.get(key) ?? { key, clicks: 0, visitors: new Set<string>() };
  rec.clicks++;
  rec.visitors.add(tok);
  m.set(key, rec);
};
const toArr = (m: Map<string, Bucket>) =>
  Array.from(m.values())
    .map((r) => ({ key: r.key, clicks: r.clicks, uniqueVisitors: r.visitors.size }))
    .sort((a, b) => b.clicks - a.clicks);

export const getMyAffiliateReferrers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number }) => ({
    days: Math.min(365, Math.max(1, input?.days ?? 30)),
  }))
  .handler(async ({ context, data }) => {
    const { data: profile } = await context.supabase
      .from("affiliate_profiles" as any)
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    const affiliateId = (profile as any)?.id;
    const empty = {
      periodDays: data.days,
      totals: { clicks: 0, uniqueVisitors: 0, referredClicks: 0, directClicks: 0 },
      byReferrer: [] as any[],
      byCategory: [] as any[],
      byUtmSource: [] as any[],
      byUtmMedium: [] as any[],
      byUtmCampaign: [] as any[],
      byCountry: [] as any[],
      byCity: [] as any[],
      byDevice: [] as any[],
      byOs: [] as any[],
      byBrowser: [] as any[],
      daily: [] as any[],
    };
    if (!affiliateId) return empty;

    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    const { data: clicks } = await context.supabase
      .from("affiliate_clicks" as any)
      .select("referrer,session_token,landed_at,utm_source,utm_medium,utm_campaign,country,region,city,device,os,browser")
      .eq("affiliate_id", affiliateId)
      .gte("landed_at", since)
      .limit(50000);

    const rows = (clicks ?? []) as any[];
    const byRef = new Map<string, Bucket>();
    const byCat = new Map<string, Bucket>();
    const byUS = new Map<string, Bucket>();
    const byUM = new Map<string, Bucket>();
    const byUC = new Map<string, Bucket>();
    const byCountry = new Map<string, Bucket>();
    const byCity = new Map<string, Bucket>();
    const byDevice = new Map<string, Bucket>();
    const byOs = new Map<string, Bucket>();
    const byBrowser = new Map<string, Bucket>();
    const daily = new Map<string, { date: string; clicks: number; referredClicks: number }>();
    let referredClicks = 0;
    let directClicks = 0;
    const visitors = new Set<string>();
    const N = (v: any) => (v == null || v === "" ? "(n/d)" : String(v));

    for (const r of rows) {
      const host = extractHost(r.referrer);
      const cat = classifySource(host);
      const tok = r.session_token || `${r.landed_at}`;
      visitors.add(tok);

      const isDirect = host === "(direto)";
      if (isDirect) directClicks++;
      else referredClicks++;

      bump(byRef, host, tok);
      bump(byCat, cat, tok);
      bump(byUS, N(r.utm_source), tok);
      bump(byUM, N(r.utm_medium), tok);
      bump(byUC, N(r.utm_campaign), tok);
      bump(byCountry, N(r.country), tok);
      bump(byCity, r.city ? `${r.city}${r.region ? " / " + r.region : ""}` : "(n/d)", tok);
      bump(byDevice, N(r.device), tok);
      bump(byOs, N(r.os), tok);
      bump(byBrowser, N(r.browser), tok);

      const day = new Date(r.landed_at).toISOString().slice(0, 10);
      const d = daily.get(day) ?? { date: day, clicks: 0, referredClicks: 0 };
      d.clicks++;
      if (!isDirect) d.referredClicks++;
      daily.set(day, d);
    }

    return {
      periodDays: data.days,
      totals: {
        clicks: rows.length,
        uniqueVisitors: visitors.size,
        referredClicks,
        directClicks,
      },
      byReferrer: toArr(byRef).slice(0, 50),
      byCategory: toArr(byCat),
      byUtmSource: toArr(byUS).slice(0, 50),
      byUtmMedium: toArr(byUM).slice(0, 50),
      byUtmCampaign: toArr(byUC).slice(0, 50),
      byCountry: toArr(byCountry).slice(0, 50),
      byCity: toArr(byCity).slice(0, 50),
      byDevice: toArr(byDevice),
      byOs: toArr(byOs),
      byBrowser: toArr(byBrowser),
      daily: Array.from(daily.values()).sort((a, b) => a.date.localeCompare(b.date)),
    };
  });
