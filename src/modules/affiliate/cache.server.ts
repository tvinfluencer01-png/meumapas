/**
 * Distributed cache com TTL, backed pelo Postgres.
 * Uso: cacheGet / cacheSet / cacheDelete / cacheOrCompute.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  const { data } = await supabaseAdmin
    .from("affiliate_cache")
    .select("value, expires_at")
    .eq("cache_key", key)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await cacheDelete(key);
    return null;
  }
  return data.value as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  const expires = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await supabaseAdmin
    .from("affiliate_cache")
    .upsert({ cache_key: key, value: value as never, expires_at: expires }, { onConflict: "cache_key" });
}

export async function cacheDelete(key: string): Promise<void> {
  await supabaseAdmin.from("affiliate_cache").delete().eq("cache_key", key);
}

export async function cacheOrCompute<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const value = await compute();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

export async function cachePurgeExpired(): Promise<number> {
  const { count } = await supabaseAdmin
    .from("affiliate_cache")
    .delete({ count: "exact" })
    .lt("expires_at", new Date().toISOString());
  return count ?? 0;
}
