// FASE 4C — Server functions para o painel de Inteligência.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: any) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
}

// ── Pixels ───────────────────────────────────────
export const listPixels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("affiliate_pixels").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

const pixelSchema = z.object({
  id: z.string().uuid().optional(),
  provider: z.enum(["meta", "ga4", "tiktok"]),
  label: z.string().optional(),
  pixel_id: z.string().min(1),
  access_token: z.string().optional(),
  api_secret: z.string().optional(),
  measurement_id: z.string().optional(),
  event_map: z.record(z.string()).optional(),
  test_mode: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const upsertPixel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pixelSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("affiliate_pixels").upsert(data).select("*").single();
    if (error) throw error;
    return row;
  });

export const deletePixel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("affiliate_pixels").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ── Fraud scores ─────────────────────────────────
export const listFraudScores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ risk: z.string().optional(), limit: z.number().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase.from("affiliate_fraud_scores").select("*").order("created_at", { ascending: false }).limit(data.limit ?? 100);
    if (data.risk) q = q.eq("risk_level", data.risk);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const reviewFraudScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), action: z.enum(["allow", "review", "block"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("affiliate_fraud_scores")
      .update({ action_taken: data.action, reviewed_by: context.userId, reviewed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const runFraudScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    session_id: z.string().optional(),
    click_id: z.string().uuid().optional(),
    affiliate_id: z.string().uuid().optional(),
    ip: z.string().optional(),
    user_agent: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { scoreAndRecord } = await import("./fraud.server");
    return scoreAndRecord(data);
  });

// ── ROI ──────────────────────────────────────────
export const listRoiSnapshots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("affiliate_roi_snapshots").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    return data ?? [];
  });

export const runRoiSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    period_start: z.string(),
    period_end: z.string(),
    affiliate_id: z.string().uuid().optional(),
    product_id: z.string().uuid().optional(),
    ad_spend_cents: z.number().int().nonnegative().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { computeRoi } = await import("./roi.server");
    return computeRoi(data);
  });

// ── Cookie Consents ──────────────────────────────
export const listCookieConsents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("affiliate_cookie_consents").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    return data ?? [];
  });
