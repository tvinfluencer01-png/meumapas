/**
 * Universal Tracking Service (FASE 4A).
 * Independente do sistema existente de `affiliate_clicks` — adiciona uma camada
 * de "analytics" com sessão, eventos, touchpoints e modelo de atribuição.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface TrackingContext {
  sessionKey: string;
  visitorId: string;
  ip?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
  landingUrl?: string | null;
  language?: string | null;
  screenResolution?: string | null;
  utm?: {
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
    content?: string | null;
    term?: string | null;
  };
  clickIds?: {
    fbclid?: string | null;
    gclid?: string | null;
    ttclid?: string | null;
    msclkid?: string | null;
    li_fat_id?: string | null;
    epik?: string | null;
  };
  affiliateSlug?: string | null;
}

function parseUA(ua: string | null | undefined) {
  if (!ua) return { browser: null, os: null, device_type: null };
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);
  const browser = /Edg/.test(ua)
    ? "Edge"
    : /Chrome/.test(ua)
    ? "Chrome"
    : /Firefox/.test(ua)
    ? "Firefox"
    : /Safari/.test(ua)
    ? "Safari"
    : "Other";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS/.test(ua)
    ? "macOS"
    : /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad|iOS/.test(ua)
    ? "iOS"
    : /Linux/.test(ua)
    ? "Linux"
    : "Other";
  return { browser, os, device_type: isTablet ? "tablet" : isMobile ? "mobile" : "desktop" };
}

async function resolveAffiliateId(slug: string | null | undefined): Promise<{
  affiliateId: string | null;
  linkId: string | null;
}> {
  if (!slug) return { affiliateId: null, linkId: null };
  const { data } = await supabaseAdmin
    .from("affiliate_links")
    .select("id, affiliate_id")
    .eq("slug", slug)
    .maybeSingle();
  return { affiliateId: data?.affiliate_id ?? null, linkId: data?.id ?? null };
}

export async function upsertSession(ctx: TrackingContext): Promise<string> {
  const ua = parseUA(ctx.userAgent);
  const { affiliateId, linkId } = await resolveAffiliateId(ctx.affiliateSlug);

  const { data: existing } = await supabaseAdmin
    .from("affiliate_tracking_sessions")
    .select("id, affiliate_id, affiliate_link_id")
    .eq("session_key", ctx.sessionKey)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("affiliate_tracking_sessions")
      .update({
        last_seen_at: new Date().toISOString(),
        affiliate_id: existing.affiliate_id ?? affiliateId,
        affiliate_link_id: existing.affiliate_link_id ?? linkId,
      })
      .eq("id", existing.id);
    return existing.id as string;
  }

  const { data: created, error } = await supabaseAdmin
    .from("affiliate_tracking_sessions")
    .insert({
      session_key: ctx.sessionKey,
      visitor_id: ctx.visitorId,
      affiliate_id: affiliateId,
      affiliate_link_id: linkId,
      referrer: ctx.referrer ?? null,
      landing_url: ctx.landingUrl ?? null,
      utm_source: ctx.utm?.source ?? null,
      utm_medium: ctx.utm?.medium ?? null,
      utm_campaign: ctx.utm?.campaign ?? null,
      utm_content: ctx.utm?.content ?? null,
      utm_term: ctx.utm?.term ?? null,
      fbclid: ctx.clickIds?.fbclid ?? null,
      gclid: ctx.clickIds?.gclid ?? null,
      ttclid: ctx.clickIds?.ttclid ?? null,
      msclkid: ctx.clickIds?.msclkid ?? null,
      li_fat_id: ctx.clickIds?.li_fat_id ?? null,
      epik: ctx.clickIds?.epik ?? null,
      ip: ctx.ip ?? null,
      user_agent: ctx.userAgent ?? null,
      language: ctx.language ?? null,
      screen_resolution: ctx.screenResolution ?? null,
      browser: ua.browser,
      os: ua.os,
      device_type: ua.device_type,
    })
    .select("id")
    .single();
  if (error) throw error;

  if (affiliateId) {
    await supabaseAdmin.from("affiliate_touchpoints").insert({
      visitor_id: ctx.visitorId,
      affiliate_id: affiliateId,
      affiliate_link_id: linkId,
      session_id: created.id,
      utm_source: ctx.utm?.source ?? null,
      utm_medium: ctx.utm?.medium ?? null,
      utm_campaign: ctx.utm?.campaign ?? null,
      touch_type: "click",
    });
  }

  return created.id as string;
}

export interface TrackedEvent {
  sessionId: string;
  name: string;
  category?: string | null;
  pageUrl?: string | null;
  pageTitle?: string | null;
  valueCents?: number | null;
  currency?: string | null;
  properties?: Record<string, unknown>;
}

export async function recordEvent(e: TrackedEvent): Promise<void> {
  await supabaseAdmin.from("affiliate_tracking_events").insert({
    session_id: e.sessionId,
    event_name: e.name,
    event_category: e.category ?? null,
    page_url: e.pageUrl ?? null,
    page_title: e.pageTitle ?? null,
    value_cents: e.valueCents ?? null,
    currency: e.currency ?? "BRL",
    properties: (e.properties ?? {}) as never,
  });

  // agregar métricas leves na sessão
  const patch: Record<string, unknown> = { last_seen_at: new Date().toISOString() };
  if (e.name === "page_view") {
    const { data } = await supabaseAdmin
      .from("affiliate_tracking_sessions")
      .select("page_views")
      .eq("id", e.sessionId)
      .maybeSingle();
    patch.page_views = (data?.page_views ?? 0) + 1;
  }
  if (e.name === "scroll" && typeof e.properties?.pct === "number") {
    const { data } = await supabaseAdmin
      .from("affiliate_tracking_sessions")
      .select("max_scroll_pct")
      .eq("id", e.sessionId)
      .maybeSingle();
    const pct = Math.min(100, Math.max(0, Math.floor(e.properties.pct as number)));
    if (pct > (data?.max_scroll_pct ?? 0)) patch.max_scroll_pct = pct;
  }
  if (e.name === "heartbeat" && typeof e.properties?.seconds === "number") {
    const { data } = await supabaseAdmin
      .from("affiliate_tracking_sessions")
      .select("time_on_site_seconds")
      .eq("id", e.sessionId)
      .maybeSingle();
    patch.time_on_site_seconds =
      (data?.time_on_site_seconds ?? 0) + Math.max(0, Math.floor(e.properties.seconds as number));
  }
  await supabaseAdmin.from("affiliate_tracking_sessions").update(patch).eq("id", e.sessionId);
}

/**
 * Resolve o afiliado atribuído a um visitante para uma conversão,
 * respeitando cookie_lifetime_days / attribution_model configurados.
 */
export async function resolveAttribution(visitorId: string): Promise<{
  affiliateId: string | null;
  linkId: string | null;
  model: string;
}> {
  const { data: cfg } = await supabaseAdmin
    .from("affiliate_settings")
    .select("cookie_lifetime_days, cookie_lifetime_lifetime, attribution_model")
    .maybeSingle();

  const model = cfg?.attribution_model ?? "last_click";
  const cutoff = cfg?.cookie_lifetime_lifetime
    ? new Date(0)
    : new Date(Date.now() - (cfg?.cookie_lifetime_days ?? 30) * 86_400_000);

  const { data: touches } = await supabaseAdmin
    .from("affiliate_touchpoints")
    .select("affiliate_id, affiliate_link_id, occurred_at")
    .eq("visitor_id", visitorId)
    .gte("occurred_at", cutoff.toISOString())
    .not("affiliate_id", "is", null)
    .order("occurred_at", { ascending: true });

  if (!touches?.length) return { affiliateId: null, linkId: null, model };

  const pick = model === "first_click" ? touches[0] : touches[touches.length - 1];
  return { affiliateId: pick.affiliate_id, linkId: pick.affiliate_link_id, model };
}
