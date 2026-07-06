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
    if (!affiliateId) {
      return {
        periodDays: data.days,
        totals: { clicks: 0, uniqueVisitors: 0, referredClicks: 0, directClicks: 0 },
        byReferrer: [],
        byCategory: [],
        daily: [],
      };
    }

    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    const { data: clicks } = await context.supabase
      .from("affiliate_clicks" as any)
      .select("referrer,session_token,landed_at")
      .eq("affiliate_id", affiliateId)
      .gte("landed_at", since)
      .limit(50000);

    const rows = (clicks ?? []) as any[];
    const byRef = new Map<string, { key: string; clicks: number; visitors: Set<string> }>();
    const byCat = new Map<string, { key: string; clicks: number; visitors: Set<string> }>();
    const daily = new Map<string, { date: string; clicks: number; referredClicks: number }>();
    let referredClicks = 0;
    let directClicks = 0;
    const visitors = new Set<string>();

    for (const r of rows) {
      const host = extractHost(r.referrer);
      const cat = classifySource(host);
      const tok = r.session_token || `${r.landed_at}`;
      visitors.add(tok);

      const isDirect = host === "(direto)";
      if (isDirect) directClicks++;
      else referredClicks++;

      const rec = byRef.get(host) ?? { key: host, clicks: 0, visitors: new Set<string>() };
      rec.clicks++;
      rec.visitors.add(tok);
      byRef.set(host, rec);

      const c = byCat.get(cat) ?? { key: cat, clicks: 0, visitors: new Set<string>() };
      c.clicks++;
      c.visitors.add(tok);
      byCat.set(cat, c);

      const day = new Date(r.landed_at).toISOString().slice(0, 10);
      const d = daily.get(day) ?? { date: day, clicks: 0, referredClicks: 0 };
      d.clicks++;
      if (!isDirect) d.referredClicks++;
      daily.set(day, d);
    }

    const toArr = (m: Map<string, { key: string; clicks: number; visitors: Set<string> }>) =>
      Array.from(m.values())
        .map((r) => ({ key: r.key, clicks: r.clicks, uniqueVisitors: r.visitors.size }))
        .sort((a, b) => b.clicks - a.clicks);

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
      daily: Array.from(daily.values()).sort((a, b) => a.date.localeCompare(b.date)),
    };
  });
