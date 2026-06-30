// Lightweight tracking context extractor (no external deps).
// Uses Cloudflare Workers request headers when available.

export interface TrackingContext {
  ip: string | null;
  userAgent: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  referrer: string | null;
}

export function extractTracking(request: Request): TrackingContext {
  const h = request.headers;
  const ip =
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  const ua = h.get("user-agent") || null;
  const country = h.get("cf-ipcountry") || null;
  const region = h.get("cf-region") || null;
  const city = h.get("cf-ipcity") || null;
  const referrer = h.get("referer") || h.get("referrer") || null;
  const parsed = parseUA(ua || "");
  return { ip, userAgent: ua, country, region, city, referrer, ...parsed };
}

function parseUA(ua: string): { device: string; os: string; browser: string } {
  const lower = ua.toLowerCase();
  let device = "desktop";
  if (/mobile|iphone|android(?!.*tablet)/.test(lower)) device = "mobile";
  else if (/ipad|tablet/.test(lower)) device = "tablet";

  let os = "unknown";
  if (/windows nt/.test(lower)) os = "Windows";
  else if (/mac os x/.test(lower)) os = "macOS";
  else if (/android/.test(lower)) os = "Android";
  else if (/iphone|ipad|ios/.test(lower)) os = "iOS";
  else if (/linux/.test(lower)) os = "Linux";

  let browser = "unknown";
  if (/edg\//.test(lower)) browser = "Edge";
  else if (/chrome\//.test(lower) && !/edg\//.test(lower)) browser = "Chrome";
  else if (/safari\//.test(lower) && !/chrome\//.test(lower)) browser = "Safari";
  else if (/firefox\//.test(lower)) browser = "Firefox";

  return { device, os, browser };
}

export function pickUtm(input: Record<string, unknown> | URLSearchParams) {
  const get = (k: string) =>
    input instanceof URLSearchParams ? input.get(k) : (input?.[k] as string | null | undefined);
  return {
    utm_source: get("utm_source") || null,
    utm_medium: get("utm_medium") || null,
    utm_campaign: get("utm_campaign") || null,
    utm_term: get("utm_term") || null,
    utm_content: get("utm_content") || null,
  };
}
