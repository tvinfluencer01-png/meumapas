// Server-only helpers (uses service role). Import with `await import(...)`
// from server-fn handlers or route handlers — never at module scope of a
// client-reachable module.
import { createHash, randomBytes } from "node:crypto";
import type { TrackingContext } from "./lib/tracking";
import { hashSecret } from "./lib/codes";

export async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  diff?: Record<string, unknown>;
  ctx?: TrackingContext;
}

export async function writeAudit(entry: AuditEntry) {
  const admin = await getAdmin();
  await admin.from("affiliate_audit_logs" as any).insert({
    actor_id: entry.actorId ?? null,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    diff: entry.diff ?? {},
    ip: entry.ctx?.ip ?? null,
    user_agent: entry.ctx?.userAgent ?? null,
  });
}

export async function findAffiliateByApiKey(apiKey: string) {
  const admin = await getAdmin();
  const hash = hashSecret(apiKey);
  const { data } = await admin
    .from("affiliate_profiles" as any)
    .select("id, user_id, status, affiliate_code")
    .eq("api_key_hash", hash)
    .maybeSingle();
  return data as { id: string; user_id: string; status: string; affiliate_code: string } | null;
}

export function newSessionToken(): string {
  return randomBytes(16).toString("base64url");
}

export function fingerprint(ctx: TrackingContext): string {
  return createHash("sha256")
    .update(`${ctx.ip ?? ""}|${ctx.userAgent ?? ""}|${ctx.os ?? ""}`)
    .digest("hex");
}
