import { getRequest } from "@tanstack/react-start/server";

function randomSlug(len = 7): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) s += alphabet[bytes[i] % alphabet.length];
  return s;
}

const CANONICAL_ORIGIN = "https://codigocosmico.com.br";

export function getRequestOrigin(): string {
  const envOrigin = process.env.PUBLIC_APP_URL;
  if (envOrigin) return envOrigin.replace(/\/$/, "");
  try {
    const req = getRequest();
    const url = new URL(req.url);
    const forwardedHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const forwardedProto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
    const host = (forwardedHost ?? url.host).toLowerCase();
    // Never emit preview/lovable hosts in user-facing links.
    if (
      host.endsWith(".lovableproject.com") ||
      host.endsWith(".lovableproject-dev.com") ||
      host.endsWith(".lovable.app") ||
      host === "localhost" ||
      host.startsWith("localhost:") ||
      host.startsWith("127.0.0.1")
    ) {
      return CANONICAL_ORIGIN;
    }
    return `${forwardedProto}://${forwardedHost ?? url.host}`;
  } catch {
    return CANONICAL_ORIGIN;
  }
}


/**
 * Creates (or reuses) a short link for the given target URL and returns the
 * fully-qualified short URL (e.g. https://host/s/abc1234).
 */
export async function shortenUrl(
  targetUrl: string,
  options: { orderId?: string | null; expiresAt?: Date | null } = {},
): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const origin = getRequestOrigin();

  // Reuse existing short link for same order+target when available
  if (options.orderId) {
    const { data: existing } = await supabaseAdmin
      .from("short_links" as any)
      .select("slug, target_url")
      .eq("order_id", options.orderId)
      .eq("target_url", targetUrl)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const ex = existing as any;
    if (ex?.slug) return `${origin}/s/${ex.slug}`;
  }

  // Insert with retries on slug collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = randomSlug(7);
    const { error } = await supabaseAdmin.from("short_links" as any).insert({
      slug,
      target_url: targetUrl,
      order_id: options.orderId ?? null,
      expires_at: options.expiresAt ? options.expiresAt.toISOString() : null,
    } as any);
    if (!error) return `${origin}/s/${slug}`;
    if (!String(error.message ?? "").toLowerCase().includes("duplicate")) {
      throw new Error(`shortenUrl: ${error.message}`);
    }
  }
  throw new Error("Não foi possível gerar um slug único para o link curto.");
}
