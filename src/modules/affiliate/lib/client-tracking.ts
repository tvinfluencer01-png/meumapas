/**
 * Client-side affiliate tracking helpers.
 * Captures ?ref=…&utm_* from the URL, persists a session token in
 * localStorage, and fires visit/click/checkout/signup conversions
 * against the public tracking endpoints.
 *
 * All calls are best-effort and never throw to the caller.
 */

const SESSION_KEY = "aff_session_token";
const REF_KEY = "aff_ref";
const UTM_KEY = "aff_utm";

type Utm = Record<string, string>;

function safeGet(key: string): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function getAffiliateContext(): {
  affiliateCode: string | null;
  sessionToken: string | null;
  utm: Utm;
} {
  const affiliateCode = safeGet(REF_KEY);
  const sessionToken = safeGet(SESSION_KEY);
  let utm: Utm = {};
  try {
    const raw = safeGet(UTM_KEY);
    if (raw) utm = JSON.parse(raw) as Utm;
  } catch {
    /* ignore */
  }
  return { affiliateCode, sessionToken, utm };
}

async function post(path: string, body: unknown) {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as any;
  } catch {
    return null;
  }
}

/**
 * Capture ?ref and utm_* from the current URL and register a
 * visit + click for the given landing. Persists the returned
 * session token in localStorage for later checkout/signup calls.
 */
export async function captureAffiliateFromUrl(landingUrl?: string): Promise<void> {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const ref = url.searchParams.get("ref");
  if (ref) safeSet(REF_KEY, ref);

  const utm: Utm = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const v = url.searchParams.get(key);
    if (v) utm[key] = v;
  }
  if (Object.keys(utm).length) safeSet(UTM_KEY, JSON.stringify(utm));

  const { affiliateCode, sessionToken } = getAffiliateContext();
  if (!affiliateCode) return;

  const visit = await post("/api/public/affiliate/track/visit", {
    affiliateCode,
    sessionToken: sessionToken ?? undefined,
  });
  const token = visit?.sessionToken as string | undefined;
  if (token) safeSet(SESSION_KEY, token);

  await post("/api/public/affiliate/track/click", {
    affiliateCode,
    sessionToken: token ?? sessionToken ?? undefined,
    landingUrl: landingUrl ?? window.location.href,
    utm,
  });
}

export async function trackAffiliateCheckout(opts: {
  value_cents: number;
  reference?: string;
}): Promise<void> {
  const { affiliateCode, sessionToken } = getAffiliateContext();
  if (!affiliateCode && !sessionToken) return;
  await post("/api/public/affiliate/track/checkout", {
    affiliateCode: affiliateCode ?? undefined,
    sessionToken: sessionToken ?? undefined,
    value_cents: opts.value_cents,
    reference: opts.reference,
  });
}

export async function trackAffiliateSignup(opts: { reference?: string }): Promise<void> {
  const { affiliateCode, sessionToken } = getAffiliateContext();
  if (!affiliateCode && !sessionToken) return;
  await post("/api/public/affiliate/track/checkout", {
    affiliateCode: affiliateCode ?? undefined,
    sessionToken: sessionToken ?? undefined,
    value_cents: 0,
    reference: opts.reference,
    type: "signup",
  });
}
