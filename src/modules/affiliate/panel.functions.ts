import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Helper: fetch current affiliate id via RPC
async function getAffiliateId(context: any) {
  const { data } = await context.supabase
    .from("affiliate_profiles" as any)
    .select("id")
    .eq("user_id", context.userId)
    .maybeSingle();
  return (data as any)?.id as string | undefined;
}

// ─────────────────────────────────────────────────────────────
// Dashboard: full stats + funnel + chart data
// ─────────────────────────────────────────────────────────────
export const getPanelDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const affiliateId = await getAffiliateId(context);
    if (!affiliateId) return null;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const start30 = new Date(now.getTime() - 30 * 86400000).toISOString();

    const sb = context.supabase;
    const [
      { count: clicksToday },
      { count: clicksMonth },
      { count: totalClicks },
      { data: orders },
      { data: commissions },
      { data: clicks30 },
      { data: recentSales },
      { count: landings },
      { count: checkouts },
    ] = await Promise.all([
      sb.from("affiliate_clicks" as any).select("*", { count: "exact", head: true }).eq("affiliate_id", affiliateId).gte("landed_at", startOfDay),
      sb.from("affiliate_clicks" as any).select("*", { count: "exact", head: true }).eq("affiliate_id", affiliateId).gte("landed_at", startOfMonth),
      sb.from("affiliate_clicks" as any).select("*", { count: "exact", head: true }).eq("affiliate_id", affiliateId),
      sb.from("affiliate_orders" as any).select("amount_cents, status, occurred_at").eq("affiliate_id", affiliateId).gte("occurred_at", start30),
      sb.from("affiliate_commissions" as any).select("amount_cents, status, available_at, created_at").eq("affiliate_id", affiliateId),
      sb.from("affiliate_clicks" as any).select("landed_at").eq("affiliate_id", affiliateId).gte("landed_at", start30),
      sb.from("affiliate_orders" as any).select("id, order_ref, amount_cents, status, occurred_at, metadata").eq("affiliate_id", affiliateId).order("occurred_at", { ascending: false }).limit(8),
      sb.from("affiliate_conversions" as any).select("*", { count: "exact", head: true }).eq("affiliate_id", affiliateId).eq("type", "landing_view"),
      sb.from("affiliate_conversions" as any).select("*", { count: "exact", head: true }).eq("affiliate_id", affiliateId).eq("type", "checkout"),
    ]);

    const paidOrders = (orders ?? []).filter((o: any) => o.status === "paid");
    const salesCount = paidOrders.length;
    const grossCents = paidOrders.reduce((s: number, o: any) => s + (o.amount_cents ?? 0), 0);
    const avgTicket = salesCount ? Math.round(grossCents / salesCount) : 0;

    const nowIso = now.toISOString();
    const availableCents = (commissions ?? [])
      .filter((c: any) => c.status === "pending" && (!c.available_at || c.available_at <= nowIso))
      .reduce((s: number, c: any) => s + (c.amount_cents ?? 0), 0);
    const blockedCents = (commissions ?? [])
      .filter((c: any) => c.status === "pending" && c.available_at && c.available_at > nowIso)
      .reduce((s: number, c: any) => s + (c.amount_cents ?? 0), 0);
    const paidCents = (commissions ?? [])
      .filter((c: any) => c.status === "paid")
      .reduce((s: number, c: any) => s + (c.amount_cents ?? 0), 0);

    // Build 30-day series
    const daily: Record<string, { clicks: number; sales: number; revenue: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      daily[key] = { clicks: 0, sales: 0, revenue: 0 };
    }
    (clicks30 ?? []).forEach((c: any) => {
      const k = String(c.landed_at).slice(0, 10);
      if (daily[k]) daily[k].clicks++;
    });
    (orders ?? []).forEach((o: any) => {
      if (o.status !== "paid") return;
      const k = String(o.occurred_at).slice(0, 10);
      if (daily[k]) { daily[k].sales++; daily[k].revenue += (o.amount_cents ?? 0) / 100; }
    });
    const series = Object.entries(daily).map(([date, v]) => ({ date, ...v }));

    const totalClicksN = totalClicks ?? 0;
    const conversionRate = totalClicksN > 0 ? (salesCount / totalClicksN) * 100 : 0;

    // Enrich recentSales with product + customer names + commission credit status
    const orderIds = (recentSales ?? []).map((o: any) => o.id).filter(Boolean);
    const orderRefs = (recentSales ?? []).map((o: any) => o.order_ref).filter(Boolean);
    let enrichedSales: any[] = recentSales ?? [];
    if (orderIds.length) {
      const [{ data: pos }, { data: comms }] = await Promise.all([
        orderRefs.length
          ? sb.from("product_orders" as any).select("id, customer_data, landing:landing_id(title, slug)").in("id", orderRefs)
          : Promise.resolve({ data: [] as any[] }),
        sb.from("affiliate_commissions" as any).select("order_id, amount_cents, status, available_at").in("order_id", orderIds),
      ]);
      const poMap = new Map<string, any>((pos ?? []).map((p: any) => [p.id, p]));
      const commMap = new Map<string, any>((comms ?? []).map((c: any) => [c.order_id, c]));
      const nowIso2 = new Date().toISOString();
      enrichedSales = (recentSales ?? []).map((o: any) => {
        const po = poMap.get(o.order_ref);
        const c = commMap.get(o.id);
        let commission_status: "creditado" | "pendente" | "bloqueado" | "sem_comissao" = "sem_comissao";
        if (c) {
          if (c.status === "paid") commission_status = "creditado";
          else if (c.status === "pending" && (!c.available_at || c.available_at <= nowIso2)) commission_status = "creditado";
          else if (c.status === "pending") commission_status = "bloqueado";
          else commission_status = "pendente";
        }
        return {
          ...o,
          product_title: po?.landing?.title ?? o.metadata?.product_title ?? null,
          customer_name: po?.customer_data?.full_name ?? po?.customer_data?.name ?? o.metadata?.customer_name ?? null,
          commission_status,
          commission_cents: c?.amount_cents ?? 0,
          commission_available_at: c?.available_at ?? null,
        };
      });
    }


    return {
      summary: {
        clicksToday: clicksToday ?? 0,
        clicksMonth: clicksMonth ?? 0,
        conversionRate,
        salesCount,
        avgTicketCents: avgTicket,
        availableCents,
        blockedCents,
        paidCents,
      },
      funnel: {
        clicks: totalClicksN,
        landings: landings ?? 0,
        checkouts: checkouts ?? 0,
        purchases: salesCount,
      },
      series,
      recentSales: enrichedSales,
    };
  });


// ─────────────────────────────────────────────────────────────
// Financial detail
// ─────────────────────────────────────────────────────────────
export const getPanelFinancial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const affiliateId = await getAffiliateId(context);
    if (!affiliateId) return { commissions: [], withdraws: [] };
    const [{ data: commissions }, { data: withdraws }] = await Promise.all([
      context.supabase.from("affiliate_commissions" as any).select("*").eq("affiliate_id", affiliateId).order("created_at", { ascending: false }).limit(100),
      context.supabase.from("affiliate_withdraws" as any).select("*").eq("affiliate_id", affiliateId).order("created_at", { ascending: false }).limit(50),
    ]);
    return { commissions: commissions ?? [], withdraws: withdraws ?? [] };
  });

// ─────────────────────────────────────────────────────────────
// Withdraw request
// ─────────────────────────────────────────────────────────────
const WithdrawSchema = z.object({
  amountCents: z.number().int().positive(),
  method: z.enum(["pix", "bank"]),
  pixKeyId: z.string().uuid().optional(),
  bankAccountId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export const requestWithdraw = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => WithdrawSchema.parse(i))
  .handler(async ({ data, context }) => {
    const affiliateId = await getAffiliateId(context);
    if (!affiliateId) throw new Error("Perfil não encontrado.");

    const { data: settings } = await context.supabase.from("affiliate_settings" as any).select("min_withdraw_cents").eq("id", "global").maybeSingle();
    const minCents = (settings as any)?.min_withdraw_cents ?? 5000;
    if (data.amountCents < minCents) throw new Error(`Valor mínimo de saque: R$ ${(minCents / 100).toFixed(2)}`);

    // Check available balance
    const { data: commissions } = await context.supabase.from("affiliate_commissions" as any).select("amount_cents, status, available_at").eq("affiliate_id", affiliateId);
    const nowIso = new Date().toISOString();
    const available = (commissions ?? []).filter((c: any) => c.status === "pending" && (!c.available_at || c.available_at <= nowIso)).reduce((s: number, c: any) => s + (c.amount_cents ?? 0), 0);
    if (data.amountCents > available) throw new Error("Saldo disponível insuficiente.");

    const { data: inserted, error } = await context.supabase.from("affiliate_withdraws" as any).insert({
      affiliate_id: affiliateId,
      amount_cents: data.amountCents,
      method: data.method,
      pix_key_id: data.pixKeyId ?? null,
      bank_account_id: data.bankAccountId ?? null,
      notes: data.notes ?? null,
      status: "requested",
    }).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    try {
      const { dispatchEvent } = await import("./notifications.server");
      await dispatchEvent(context.supabase, {
        event_key: "withdraw.requested",
        affiliate_id: affiliateId,
        variables: {
          withdraw_id: (inserted as any)?.id,
          amount_cents: data.amountCents,
          amount_brl: (data.amountCents / 100).toFixed(2),
          method: data.method,
        },
      });
    } catch (e) { console.error("[withdraw] dispatchEvent failed", e); }
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────
// Bank / PIX / Docs
// ─────────────────────────────────────────────────────────────
export const getPaymentMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const affiliateId = await getAffiliateId(context);
    if (!affiliateId) return { bank: null, pix: [] };
    const [{ data: bank }, { data: pix }] = await Promise.all([
      context.supabase.from("affiliate_bank_accounts" as any).select("*").eq("affiliate_id", affiliateId).maybeSingle(),
      context.supabase.from("affiliate_pix_keys" as any).select("*").eq("affiliate_id", affiliateId),
    ]);
    return { bank, pix: pix ?? [] };
  });

const BankSchema = z.object({
  bank_name: z.string().min(2),
  branch: z.string().min(1),
  account_number: z.string().min(1),
  account_type: z.enum(["checking", "savings"]),
  holder_name: z.string().min(3),
  holder_doc: z.string().min(6),
});
export const saveBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => BankSchema.parse(i))
  .handler(async ({ data, context }) => {
    const affiliateId = await getAffiliateId(context);
    if (!affiliateId) throw new Error("Perfil não encontrado.");
    const { data: existing } = await context.supabase.from("affiliate_bank_accounts" as any).select("id").eq("affiliate_id", affiliateId).maybeSingle();
    const payload = { ...data, affiliate_id: affiliateId };
    const { error } = existing
      ? await context.supabase.from("affiliate_bank_accounts" as any).update(payload).eq("id", (existing as any).id)
      : await context.supabase.from("affiliate_bank_accounts" as any).insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const PixSchema = z.object({
  key_type: z.enum(["cpf", "cnpj", "email", "phone", "random"]),
  key_value: z.string().min(4),
});
export const addPixKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => PixSchema.parse(i))
  .handler(async ({ data, context }) => {
    const affiliateId = await getAffiliateId(context);
    if (!affiliateId) throw new Error("Perfil não encontrado.");
    const { error } = await context.supabase.from("affiliate_pix_keys" as any).insert({ ...data, affiliate_id: affiliateId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePixKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const affiliateId = await getAffiliateId(context);
    if (!affiliateId) throw new Error("Perfil não encontrado.");
    const { error } = await context.supabase.from("affiliate_pix_keys" as any).delete().eq("id", data.id).eq("affiliate_id", affiliateId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────
// Account: update, password, avatar
// ─────────────────────────────────────────────────────────────
const AccountSchema = z.object({
  full_name: z.string().min(3).optional(),
  whatsapp: z.string().min(6).optional(),
  avatar_url: z.string().url().nullable().optional(),
  document_url: z.string().url().nullable().optional(),
  theme: z.enum(["dark", "light"]).optional(),
  notify_toast: z.boolean().optional(),
  notify_push: z.boolean().optional(),
  notify_email: z.boolean().optional(),
});
export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => AccountSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("affiliate_profiles" as any).update(data).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const changePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ newPassword: z.string().min(8).max(72) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, { password: data.newPassword });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Signed URL for upload
export const createUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ path: z.string().min(1), scope: z.enum(["avatar", "document"]) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = `${context.userId}/${data.scope}/${Date.now()}-${data.path}`.replace(/[^\w./-]/g, "_");
    const { data: signed, error } = await supabaseAdmin.storage.from("affiliate").createSignedUploadUrl(key);
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("affiliate").getPublicUrl(key);
    // Since bucket is private, return signed download url instead
    const { data: dl } = await supabaseAdmin.storage.from("affiliate").createSignedUrl(key, 60 * 60 * 24 * 365);
    return { uploadUrl: signed.signedUrl, token: signed.token, path: key, publicUrl: dl?.signedUrl ?? pub.publicUrl };
  });

// ─────────────────────────────────────────────────────────────
// Materials
// ─────────────────────────────────────────────────────────────
export const listMaterials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("affiliate_materials" as any).select("*").eq("active", true).order("created_at", { ascending: false });
    return data ?? [];
  });

// ─────────────────────────────────────────────────────────────
// Notifications & Messages
// ─────────────────────────────────────────────────────────────
export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const affiliateId = await getAffiliateId(context);
    if (!affiliateId) return [];
    const { data } = await context.supabase.from("affiliate_notifications" as any).select("*").eq("affiliate_id", affiliateId).eq("to_admin", false).order("created_at", { ascending: false }).limit(50);
    return data ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const affiliateId = await getAffiliateId(context);
    await context.supabase.from("affiliate_notifications" as any).update({ read_at: new Date().toISOString() }).eq("id", data.id).eq("affiliate_id", affiliateId);
    return { ok: true };
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const affiliateId = await getAffiliateId(context);
    if (!affiliateId) return [];
    const { data } = await context.supabase.from("affiliate_messages" as any).select("*").eq("affiliate_id", affiliateId).order("created_at", { ascending: true }).limit(200);
    return data ?? [];
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ body: z.string().min(1).max(4000) }).parse(i))
  .handler(async ({ data, context }) => {
    const affiliateId = await getAffiliateId(context);
    if (!affiliateId) throw new Error("Perfil não encontrado.");
    const { error } = await context.supabase.from("affiliate_messages" as any).insert({
      affiliate_id: affiliateId,
      sender_id: context.userId,
      from_admin: false,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────
// Ranking, goals & medals
// ─────────────────────────────────────────────────────────────
export const getRanking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Use service role to aggregate across affiliates (public leaderboard)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: orders } = await supabaseAdmin
      .from("affiliate_orders")
      .select("affiliate_id, amount_cents, status")
      .eq("status", "paid")
      .gte("occurred_at", startOfMonth.toISOString());

    const bucket = new Map<string, { affiliate_id: string; sales: number; revenue_cents: number }>();
    (orders ?? []).forEach((o: any) => {
      const cur = bucket.get(o.affiliate_id) ?? { affiliate_id: o.affiliate_id, sales: 0, revenue_cents: 0 };
      cur.sales++;
      cur.revenue_cents += o.amount_cents ?? 0;
      bucket.set(o.affiliate_id, cur);
    });
    const rows = Array.from(bucket.values()).sort((a, b) => b.revenue_cents - a.revenue_cents).slice(0, 20);
    const ids = rows.map((r) => r.affiliate_id);
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("affiliate_profiles").select("id, full_name, avatar_url, affiliate_code").in("id", ids)
      : { data: [] as any };

    const me = await getAffiliateId(context);
    return {
      me,
      top: rows.map((r, idx) => ({
        rank: idx + 1,
        ...r,
        profile: (profiles ?? []).find((p: any) => p.id === r.affiliate_id) ?? null,
      })),
    };
  });

export const getGoalsAndMedals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const affiliateId = await getAffiliateId(context);
    if (!affiliateId) return { goals: [], medals: [], awarded: [] };
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: goals }, { data: medals }, { data: awarded }] = await Promise.all([
      context.supabase.from("affiliate_goals" as any).select("*")
        .or(`affiliate_id.is.null,affiliate_id.eq.${affiliateId}`)
        .lte("period_start", today).gte("period_end", today),
      context.supabase.from("affiliate_medals" as any).select("*").eq("active", true).order("tier"),
      context.supabase.from("affiliate_medal_awards" as any).select("medal_id, awarded_at").eq("affiliate_id", affiliateId),
    ]);
    return { goals: goals ?? [], medals: medals ?? [], awarded: awarded ?? [] };
  });

// ─────────────────────────────────────────────────────────────
// Landing-level metrics: clicks, signups, conversions, sales
// ─────────────────────────────────────────────────────────────
export const getPanelLandingMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ days: z.number().int().min(1).max(365).default(30) }).parse(i))
  .handler(async ({ data, context }) => {
    const affiliateId = await getAffiliateId(context);
    if (!affiliateId) return { rows: [], period: data.days };

    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    const sb = context.supabase;

    const [{ data: clicks }, { data: convs }, { data: orders }] = await Promise.all([
      sb.from("affiliate_clicks" as any).select("landing_url, landed_at").eq("affiliate_id", affiliateId).gte("landed_at", since),
      sb.from("affiliate_conversions" as any).select("type, reference, metadata, occurred_at").eq("affiliate_id", affiliateId).gte("occurred_at", since),
      sb.from("affiliate_orders" as any).select("amount_cents, status, metadata, occurred_at").eq("affiliate_id", affiliateId).gte("occurred_at", since),
    ]);

    // Extract landing slug from URL path like /p/{slug} (fallback to path or "geral")
    const slugFromUrl = (u?: string | null): string => {
      if (!u) return "geral";
      try {
        const url = new URL(u, "https://x");
        const m = url.pathname.match(/\/p\/([^/?#]+)/);
        return m ? m[1] : url.pathname.replace(/^\/+|\/+$/g, "") || "geral";
      } catch { return "geral"; }
    };

    type Row = { landing: string; clicks: number; signups: number; checkouts: number; sales: number; revenueCents: number };
    const map = new Map<string, Row>();
    const bump = (key: string): Row => {
      let r = map.get(key);
      if (!r) { r = { landing: key, clicks: 0, signups: 0, checkouts: 0, sales: 0, revenueCents: 0 }; map.set(key, r); }
      return r;
    };

    (clicks ?? []).forEach((c: any) => { bump(slugFromUrl(c.landing_url)).clicks++; });
    (convs ?? []).forEach((c: any) => {
      const key = slugFromUrl(c.metadata?.landing_url || c.reference || null);
      const row = bump(key);
      if (c.type === "signup" || c.type === "registration") row.signups++;
      else if (c.type === "checkout") row.checkouts++;
    });
    (orders ?? []).forEach((o: any) => {
      if (o.status !== "paid") return;
      const key = slugFromUrl(o.metadata?.landing_url || o.metadata?.slug || null);
      const row = bump(key);
      row.sales++;
      row.revenueCents += o.amount_cents ?? 0;
    });

    const rows = [...map.values()].sort((a, b) => b.clicks - a.clicks);
    return { rows, period: data.days };
  });
