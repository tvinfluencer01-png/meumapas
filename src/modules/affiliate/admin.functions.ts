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

async function writeLog(context: any, action: string, meta: any = {}) {
  try {
    await context.supabase.from("affiliate_audit_logs" as any).insert({
      actor_id: context.userId,
      action,
      entity: meta.entity ?? null,
      entity_id: meta.entityId ?? null,
      diff: meta.diff ?? null,
    });
  } catch {}
}

// ────────────────────────────────────────────────────────────
// DASHBOARD
// ────────────────────────────────────────────────────────────
export const adminGetDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const sb = context.supabase;
    const now = new Date();
    const start30 = new Date(now.getTime() - 30 * 86400000).toISOString();
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [
      { count: totalAffiliates },
      { count: activeAffiliates },
      { count: pendingAffiliates },
      { count: clicksToday },
      { count: clicksTotal },
      { data: orders30 },
      { data: commissions },
      { data: clicksGeo },
      { data: topProducts },
      { data: topAffiliates },
    ] = await Promise.all([
      sb.from("affiliate_profiles" as any).select("*", { count: "exact", head: true }),
      sb.from("affiliate_profiles" as any).select("*", { count: "exact", head: true }).eq("status", "approved"),
      sb.from("affiliate_profiles" as any).select("*", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("affiliate_clicks" as any).select("*", { count: "exact", head: true }).gte("landed_at", startDay),
      sb.from("affiliate_clicks" as any).select("*", { count: "exact", head: true }),
      sb.from("affiliate_orders" as any).select("amount_cents,status,occurred_at,metadata").gte("occurred_at", start30),
      sb.from("affiliate_commissions" as any).select("amount_cents,status,created_at"),
      sb.from("affiliate_clicks" as any).select("country").gte("landed_at", start30).not("country", "is", null).limit(5000),
      sb.from("affiliate_orders" as any).select("metadata,amount_cents,status").eq("status", "paid").gte("occurred_at", start30).limit(1000),
      sb.from("affiliate_commissions" as any).select("affiliate_id,amount_cents,status").eq("status", "approved").limit(2000),
    ]);

    const paid = (orders30 ?? []).filter((o: any) => o.status === "paid");
    const revenueCents = paid.reduce((s: number, o: any) => s + (o.amount_cents ?? 0), 0);
    const commTotal = (commissions ?? []).reduce((s: number, c: any) => s + (c.amount_cents ?? 0), 0);
    const commAvailable = (commissions ?? []).filter((c: any) => c.status === "approved").reduce((s: number, c: any) => s + c.amount_cents, 0);
    const commPending = (commissions ?? []).filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + c.amount_cents, 0);
    const commPaid = (commissions ?? []).filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + c.amount_cents, 0);
    const conversion = (clicksTotal ?? 0) > 0 ? (paid.length / (clicksTotal ?? 1)) * 100 : 0;

    // Country map
    const countryMap: Record<string, number> = {};
    (clicksGeo ?? []).forEach((c: any) => {
      const k = (c.country ?? "??").toUpperCase();
      countryMap[k] = (countryMap[k] ?? 0) + 1;
    });
    const geo = Object.entries(countryMap).map(([country, clicks]) => ({ country, clicks })).sort((a, b) => b.clicks - a.clicks).slice(0, 20);

    // Time series (last 30 days revenue and orders)
    const seriesMap: Record<string, { orders: number; revenue: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      seriesMap[key] = { orders: 0, revenue: 0 };
    }
    paid.forEach((o: any) => {
      const k = String(o.occurred_at).slice(0, 10);
      if (seriesMap[k]) {
        seriesMap[k].orders += 1;
        seriesMap[k].revenue += o.amount_cents ?? 0;
      }
    });
    const series = Object.entries(seriesMap).map(([date, v]) => ({ date, orders: v.orders, revenue: v.revenue / 100 }));

    // Top products from order metadata.product_name
    const productMap: Record<string, { revenue: number; sales: number }> = {};
    (topProducts ?? []).forEach((o: any) => {
      const name = (o.metadata as any)?.product_name ?? (o.metadata as any)?.product ?? "N/D";
      if (!productMap[name]) productMap[name] = { revenue: 0, sales: 0 };
      productMap[name].revenue += o.amount_cents ?? 0;
      productMap[name].sales += 1;
    });
    const topProds = Object.entries(productMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

    // Top affiliates
    const affMap: Record<string, number> = {};
    (topAffiliates ?? []).forEach((c: any) => { affMap[c.affiliate_id] = (affMap[c.affiliate_id] ?? 0) + c.amount_cents; });
    const topAffIds = Object.entries(affMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const { data: affNames } = topAffIds.length
      ? await sb.from("affiliate_profiles" as any).select("id,full_name,affiliate_code").in("id", topAffIds.map(([id]) => id))
      : { data: [] };
    const topAffs = topAffIds.map(([id, total]) => {
      const p = (affNames ?? []).find((x: any) => x.id === id);
      return { id, name: (p as any)?.full_name ?? "—", code: (p as any)?.affiliate_code ?? "", total };
    });

    return {
      kpis: {
        totalAffiliates: totalAffiliates ?? 0,
        activeAffiliates: activeAffiliates ?? 0,
        pendingAffiliates: pendingAffiliates ?? 0,
        clicksToday: clicksToday ?? 0,
        clicksTotal: clicksTotal ?? 0,
        conversion,
        revenueCents,
        commissionsCents: commTotal,
        commAvailableCents: commAvailable,
        commPendingCents: commPending,
        commPaidCents: commPaid,
      },
      series,
      geo,
      topProducts: topProds,
      topAffiliates: topAffs,
    };
  });

// ────────────────────────────────────────────────────────────
// PRODUCTS
// ────────────────────────────────────────────────────────────
export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data } = await context.supabase.from("affiliate_products" as any).select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(2).max(120),
  name: z.string().min(2).max(200),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  price_cents: z.number().int().min(0),
  commission_rate: z.number().min(0).max(100).nullable().optional(),
  commission_fixed_cents: z.number().int().min(0).nullable().optional(),
  active: z.boolean().default(true),
});

export const adminUpsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ProductSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { id, ...payload } = data;
    if (id) {
      const { error } = await context.supabase.from("affiliate_products" as any).update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      await writeLog(context, "admin.product.update", { entity: "affiliate_product", entityId: id });
    } else {
      const { data: inserted, error } = await context.supabase.from("affiliate_products" as any).insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      await writeLog(context, "admin.product.create", { entity: "affiliate_product", entityId: (inserted as any)?.id });
    }
    return { ok: true };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("affiliate_products" as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeLog(context, "admin.product.delete", { entity: "affiliate_product", entityId: data.id });
    return { ok: true };
  });

// ────────────────────────────────────────────────────────────
// COMMISSION RULES
// ────────────────────────────────────────────────────────────
export const adminListCommissionRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data } = await context.supabase.from("affiliate_commission_rules" as any).select("*").order("priority", { ascending: false });
    return data ?? [];
  });

const RuleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(200),
  scope: z.enum(["global", "product", "category", "affiliate"]),
  scope_ref: z.string().nullable().optional(),
  affiliate_id: z.string().uuid().nullable().optional(),
  kind: z.enum(["percent", "fixed"]),
  value: z.number().min(0),
  model: z.enum(["first_purchase", "recurring", "lifetime"]).default("first_purchase"),
  priority: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const adminUpsertCommissionRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => RuleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { id, ...payload } = data;
    if (id) {
      const { error } = await context.supabase.from("affiliate_commission_rules" as any).update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("affiliate_commission_rules" as any).insert(payload);
      if (error) throw new Error(error.message);
    }
    await writeLog(context, "admin.rule.upsert", { entity: "affiliate_commission_rule", entityId: id });
    return { ok: true };
  });

export const adminDeleteCommissionRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("affiliate_commission_rules" as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ────────────────────────────────────────────────────────────
// COUPONS
// ────────────────────────────────────────────────────────────
export const adminListCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data } = await context.supabase.from("affiliate_coupons" as any).select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

const CouponSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(2).max(64),
  affiliate_id: z.string().uuid().nullable().optional(),
  discount_percent: z.number().min(0).max(100).nullable().optional(),
  discount_cents: z.number().int().min(0).nullable().optional(),
  max_uses: z.number().int().min(0).nullable().optional(),
  expires_at: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

export const adminUpsertCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CouponSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { id, ...payload } = data;
    if (id) {
      const { error } = await context.supabase.from("affiliate_coupons" as any).update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("affiliate_coupons" as any).insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    await context.supabase.from("affiliate_coupons" as any).delete().eq("id", data.id);
    return { ok: true };
  });

// ────────────────────────────────────────────────────────────
// CAMPAIGNS
// ────────────────────────────────────────────────────────────
export const adminListCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data } = await context.supabase.from("affiliate_campaigns" as any).select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

const CampaignSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(200),
  description: z.string().nullable().optional(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  goal_cents: z.number().int().min(0).nullable().optional(),
  bonus_cents: z.number().int().min(0).nullable().optional(),
  active: z.boolean().default(true),
});

export const adminUpsertCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CampaignSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { id, ...payload } = data;
    if (id) {
      const { error } = await context.supabase.from("affiliate_campaigns" as any).update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("affiliate_campaigns" as any).insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ────────────────────────────────────────────────────────────
// MATERIALS
// ────────────────────────────────────────────────────────────
export const adminListMaterials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data } = await context.supabase.from("affiliate_materials" as any).select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

const MaterialSchema = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(["video", "banner", "reel", "story", "carousel", "logo", "copy", "pdf", "training"]),
  title: z.string().min(2).max(200),
  description: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
  thumb_url: z.string().url().nullable().optional(),
  content: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

export const adminUpsertMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => MaterialSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { id, ...payload } = data;
    const insertPayload = { ...payload, created_by: context.userId };
    if (id) {
      const { error } = await context.supabase.from("affiliate_materials" as any).update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("affiliate_materials" as any).insert(insertPayload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    await context.supabase.from("affiliate_materials" as any).delete().eq("id", data.id);
    return { ok: true };
  });

// ────────────────────────────────────────────────────────────
// COMMISSIONS + WITHDRAWS
// ────────────────────────────────────────────────────────────
export const adminListCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ status: z.string().optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    let q = context.supabase
      .from("affiliate_commissions" as any)
      .select("*, affiliate_profiles!inner(full_name,affiliate_code), affiliate_orders(order_ref,amount_cents)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const adminUpdateCommissionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), status: z.enum(["pending", "approved", "paid", "reversed", "blocked"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: prev } = await context.supabase.from("affiliate_commissions" as any).select("affiliate_id, amount_cents, order_id").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("affiliate_commissions" as any).update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeLog(context, "admin.commission.status", { entity: "affiliate_commission", entityId: data.id, diff: { status: data.status } });
    try {
      const { dispatchEvent } = await import("./notifications.server");
      const eventKey = data.status === "approved" ? "commission.approved"
        : data.status === "paid" ? "commission.paid"
        : data.status === "reversed" ? "commission.reversed"
        : data.status === "blocked" ? "commission.blocked" : null;
      if (eventKey && prev) {
        await dispatchEvent(context.supabase, {
          event_key: eventKey,
          affiliate_id: (prev as any).affiliate_id,
          variables: {
            commission_id: data.id,
            amount_cents: (prev as any).amount_cents,
            amount_brl: (((prev as any).amount_cents ?? 0) / 100).toFixed(2),
            order_id: (prev as any).order_id,
            status: data.status,
          },
        });
      }
    } catch (e) { console.error("[admin commission] dispatchEvent failed", e); }
    return { ok: true };
  });

export const adminListWithdraws = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data } = await context.supabase
      .from("affiliate_withdraws" as any)
      .select("*, affiliate_profiles!inner(full_name,affiliate_code,email)")
      .order("created_at", { ascending: false })
      .limit(500);
    return data ?? [];
  });

export const adminUpdateWithdraw = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["requested", "approved", "paid", "rejected"]),
      notes: z.string().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const patch: any = { status: data.status, notes: data.notes ?? null };
    if (data.status === "paid") {
      patch.processed_by = context.userId;
      patch.processed_at = new Date().toISOString();
    }
    const { data: prev } = await context.supabase.from("affiliate_withdraws" as any).select("affiliate_id, amount_cents, method").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("affiliate_withdraws" as any).update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeLog(context, "admin.withdraw.status", { entity: "affiliate_withdraw", entityId: data.id, diff: { status: data.status } });
    try {
      const { dispatchEvent } = await import("./notifications.server");
      const eventKey = data.status === "paid" ? "withdraw.paid"
        : data.status === "approved" ? "withdraw.approved"
        : data.status === "rejected" ? "withdraw.rejected" : null;
      if (eventKey && prev) {
        await dispatchEvent(context.supabase, {
          event_key: eventKey,
          affiliate_id: (prev as any).affiliate_id,
          variables: {
            withdraw_id: data.id,
            amount_cents: (prev as any).amount_cents,
            amount_brl: (((prev as any).amount_cents ?? 0) / 100).toFixed(2),
            method: (prev as any).method,
            status: data.status,
            notes: data.notes ?? "",
          },
        });
      }
    } catch (e) { console.error("[admin withdraw] dispatchEvent failed", e); }
    return { ok: true };
  });

// ────────────────────────────────────────────────────────────
// MESSAGES (broadcast to affiliate or all)
// ────────────────────────────────────────────────────────────
export const adminBroadcastMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      affiliateId: z.string().uuid().nullable().optional(),
      subject: z.string().min(1).max(200),
      body: z.string().min(1).max(4000),
      channel: z.enum(["notification", "message"]).default("notification"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const sb = context.supabase;
    let recipients: string[] = [];
    if (data.affiliateId) {
      recipients = [data.affiliateId];
    } else {
      const { data: rows } = await sb.from("affiliate_profiles" as any).select("id").eq("status", "approved");
      recipients = (rows ?? []).map((r: any) => r.id);
    }
    if (data.channel === "notification") {
      const payload = recipients.map((id) => ({
        affiliate_id: id,
        title: data.subject,
        body: data.body,
        kind: "admin_broadcast",
      }));
      if (payload.length) await sb.from("affiliate_notifications" as any).insert(payload);
    } else {
      const payload = recipients.map((id) => ({
        affiliate_id: id,
        sender: "admin",
        subject: data.subject,
        body: data.body,
      }));
      if (payload.length) await sb.from("affiliate_messages" as any).insert(payload);
    }
    await writeLog(context, "admin.broadcast", { diff: { count: recipients.length, subject: data.subject } });
    return { ok: true, count: recipients.length };
  });

// ────────────────────────────────────────────────────────────
// FRAUD FLAGS
// ────────────────────────────────────────────────────────────
export const adminListFraudFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data } = await context.supabase
      .from("affiliate_fraud_flags" as any)
      .select("*, affiliate_profiles(full_name,affiliate_code)")
      .order("created_at", { ascending: false })
      .limit(500);
    return data ?? [];
  });

export const adminResolveFraudFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["resolved", "blocked", "ignored"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("affiliate_fraud_flags" as any)
      .update({ status: data.status, resolved_by: context.userId, resolved_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ────────────────────────────────────────────────────────────
// EXTENDED SETTINGS
// ────────────────────────────────────────────────────────────
const ExtendedSettingsSchema = z.object({
  auto_approve: z.boolean(),
  default_commission_rate: z.number().min(0).max(100),
  cookie_window_days: z.number().int().min(1).max(365),
  min_withdraw_cents: z.number().int().min(0),
  hold_days: z.number().int().min(0).max(365),
  commission_model: z.enum(["first_purchase", "recurring", "lifetime"]),
  antifraud_same_cpf: z.boolean(),
  antifraud_same_ip: z.boolean(),
  antifraud_same_card: z.boolean(),
  antifraud_block_vpn: z.boolean(),
  antifraud_block_self: z.boolean(),
  auto_notify_email: z.boolean(),
  auto_notify_whatsapp: z.boolean(),
  auto_notify_push: z.boolean(),
  cookie_lifetime_days: z.number().int().min(1).max(365).optional(),
  cookie_lifetime_lifetime: z.boolean().optional(),
  attribution_model: z.enum(["first_click", "last_click", "linear", "custom", "hybrid"]).optional(),
});

export const adminUpdateExtendedSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ExtendedSettingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("affiliate_settings" as any).update(data).eq("id", "global");
    if (error) throw new Error(error.message);
    await writeLog(context, "admin.settings.update", { diff: data });
    return { ok: true };
  });

// ────────────────────────────────────────────────────────────
// LOGS
// ────────────────────────────────────────────────────────────
export const adminListLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data } = await context.supabase
      .from("affiliate_audit_logs" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    return data ?? [];
  });

export const adminListWebhookEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data } = await context.supabase
      .from("affiliate_webhook_events" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

// ────────────────────────────────────────────────────────────
// RANKING
// ────────────────────────────────────────────────────────────
export const adminGetRanking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const startMonth = new Date();
    startMonth.setDate(1);
    startMonth.setHours(0, 0, 0, 0);
    const { data: orders } = await context.supabase
      .from("affiliate_orders" as any)
      .select("affiliate_id,amount_cents,status,occurred_at")
      .eq("status", "paid")
      .gte("occurred_at", startMonth.toISOString());
    const agg: Record<string, { revenue: number; sales: number }> = {};
    (orders ?? []).forEach((o: any) => {
      if (!agg[o.affiliate_id]) agg[o.affiliate_id] = { revenue: 0, sales: 0 };
      agg[o.affiliate_id].revenue += o.amount_cents ?? 0;
      agg[o.affiliate_id].sales += 1;
    });
    const ids = Object.keys(agg);
    if (!ids.length) return [];
    const { data: profiles } = await context.supabase
      .from("affiliate_profiles" as any)
      .select("id,full_name,affiliate_code,avatar_url")
      .in("id", ids);
    return (profiles ?? []).map((p: any) => ({
      id: p.id,
      name: p.full_name,
      code: p.affiliate_code,
      avatar: p.avatar_url,
      revenueCents: agg[p.id].revenue,
      sales: agg[p.id].sales,
    })).sort((a, b) => b.revenueCents - a.revenueCents);
  });

// ────────────────────────────────────────────────────────────
// EXPORT (CSV / XLS / PDF)
// ────────────────────────────────────────────────────────────
function toCSV(rows: any[], columns: string[]): string {
  const esc = (v: any) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => esc(r[c])).join(","))].join("\n");
}

function toXLSHtml(rows: any[], columns: string[]): string {
  const th = columns.map((c) => `<th>${c}</th>`).join("");
  const trs = rows.map((r) => `<tr>${columns.map((c) => `<td>${r[c] ?? ""}</td>`).join("")}</tr>`).join("");
  return `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/></head><body><table border="1"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
}

async function toPDF(title: string, rows: any[], columns: string[]): Promise<string> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([842, 595]); // A4 landscape
  const margin = 30;
  let y = 555;
  page.drawText(title, { x: margin, y, size: 16, font: bold, color: rgb(0.2, 0.15, 0.35) });
  y -= 30;
  const colW = (842 - margin * 2) / Math.max(columns.length, 1);
  columns.forEach((c, i) => page.drawText(c.slice(0, 18), { x: margin + i * colW, y, size: 9, font: bold }));
  y -= 15;
  for (const r of rows) {
    if (y < 40) { page = doc.addPage([842, 595]); y = 555; }
    columns.forEach((c, i) => {
      const v = r[c] == null ? "" : String(r[c]);
      page.drawText(v.slice(0, 22), { x: margin + i * colW, y, size: 8, font });
    });
    y -= 12;
  }
  const bytes = await doc.save();
  return Buffer.from(bytes).toString("base64");
}

const ExportSchema = z.object({
  entity: z.enum(["affiliates", "commissions", "withdraws", "orders", "products", "coupons"]),
  format: z.enum(["csv", "xls", "pdf"]),
});

export const adminExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ExportSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const sb = context.supabase;
    let rows: any[] = [];
    let cols: string[] = [];
    if (data.entity === "affiliates") {
      const { data: r } = await sb.from("affiliate_profiles" as any).select("affiliate_code,full_name,email,whatsapp,status,created_at");
      rows = r ?? [];
      cols = ["affiliate_code", "full_name", "email", "whatsapp", "status", "created_at"];
    } else if (data.entity === "commissions") {
      const { data: r } = await sb.from("affiliate_commissions" as any).select("id,affiliate_id,amount_cents,status,created_at");
      rows = r ?? [];
      cols = ["id", "affiliate_id", "amount_cents", "status", "created_at"];
    } else if (data.entity === "withdraws") {
      const { data: r } = await sb.from("affiliate_withdraws" as any).select("id,affiliate_id,amount_cents,method,status,created_at");
      rows = r ?? [];
      cols = ["id", "affiliate_id", "amount_cents", "method", "status", "created_at"];
    } else if (data.entity === "orders") {
      const { data: r } = await sb.from("affiliate_orders" as any).select("id,affiliate_id,order_ref,amount_cents,status,occurred_at");
      rows = r ?? [];
      cols = ["id", "affiliate_id", "order_ref", "amount_cents", "status", "occurred_at"];
    } else if (data.entity === "products") {
      const { data: r } = await sb.from("affiliate_products" as any).select("slug,name,category,price_cents,commission_rate,active");
      rows = r ?? [];
      cols = ["slug", "name", "category", "price_cents", "commission_rate", "active"];
    } else if (data.entity === "coupons") {
      const { data: r } = await sb.from("affiliate_coupons" as any).select("code,affiliate_id,discount_percent,discount_cents,uses,active,expires_at");
      rows = r ?? [];
      cols = ["code", "affiliate_id", "discount_percent", "discount_cents", "uses", "active", "expires_at"];
    }
    await writeLog(context, `admin.export.${data.entity}.${data.format}`);
    if (data.format === "csv") return { mime: "text/csv", filename: `${data.entity}.csv`, content: toCSV(rows, cols), encoding: "utf8" };
    if (data.format === "xls") return { mime: "application/vnd.ms-excel", filename: `${data.entity}.xls`, content: toXLSHtml(rows, cols), encoding: "utf8" };
    const b64 = await toPDF(`Affiliate • ${data.entity}`, rows, cols);
    return { mime: "application/pdf", filename: `${data.entity}.pdf`, content: b64, encoding: "base64" };
  });
