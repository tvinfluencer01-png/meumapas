import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ---------- Public: list active plans ---------- */

export const listPublicHoroscopePlans = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("horoscope_plans")
      .select("id, slug, name, description, price_cents, billing_cycle, interval_months, features, is_featured, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { plans: data ?? [] };
  },
);

/* ---------- Authenticated: create Mercado Pago checkout ---------- */

const CheckoutSchema = z.object({ plan_id: z.string().uuid() });

export const createHoroscopePlanCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CheckoutSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: plan } = await (supabaseAdmin as any)
      .from("horoscope_plans")
      .select("*")
      .eq("id", data.plan_id)
      .eq("is_active", true)
      .maybeSingle();
    if (!plan) throw new Error("Plano não encontrado ou inativo.");

    const { data: mp } = await (supabaseAdmin as any)
      .from("mercado_pago_settings")
      .select("access_token, enabled, environment")
      .eq("id", true)
      .maybeSingle();
    if (!mp?.enabled || !mp.access_token) {
      throw new Error("Pagamentos temporariamente indisponíveis.");
    }

    const { data: { user } } = await (supabaseAdmin as any).auth.admin.getUserById(context.userId);
    const email = user?.email ?? null;

    // Persist the pending subscription first
    const { data: sub, error: subErr } = await (supabaseAdmin as any)
      .from("horoscope_paid_subscriptions")
      .insert({
        user_id: context.userId,
        plan_id: plan.id,
        status: "pending",
        email,
      })
      .select("id")
      .single();
    if (subErr) throw new Error(subErr.message);

    const originHeader = getRequestHeader("origin") ?? getRequestHeader("referer") ?? "";
    const origin = originHeader
      ? new URL(originHeader).origin
      : (process.env.PUBLIC_APP_ORIGIN ?? "https://codigocosmico.com.br");

    const prefBody = {
      items: [
        {
          id: plan.slug,
          title: `Horóscopo Diário — ${plan.name}`,
          description: plan.description ?? "Assinatura do horóscopo diário no WhatsApp",
          quantity: 1,
          currency_id: "BRL",
          unit_price: plan.price_cents / 100,
        },
      ],
      payer: email ? { email } : undefined,
      external_reference: `horoscope_plan:${sub.id}`,
      metadata: {
        kind: "horoscope_plan",
        subscription_id: sub.id,
        plan_id: plan.id,
        user_id: context.userId,
      },
      back_urls: {
        success: `${origin}/horoscopo-preferencia?sid=${sub.id}&status=success`,
        pending: `${origin}/horoscopo-preferencia?sid=${sub.id}&status=pending`,
        failure: `${origin}/horoscopo-assinar?status=failure`,
      },
      auto_return: "approved",
      notification_url: `${origin}/api/public/hooks/mercadopago`,
    };

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mp.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(prefBody),
    });
    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      throw new Error(`Falha ao criar checkout: ${json?.message ?? `HTTP ${res.status}`}`);
    }
    const checkoutUrl =
      mp.environment === "production"
        ? json.init_point
        : (json.sandbox_init_point ?? json.init_point);
    if (!checkoutUrl || !json.id) throw new Error("Resposta inesperada do Mercado Pago.");

    await (supabaseAdmin as any)
      .from("horoscope_paid_subscriptions")
      .update({ mp_preference_id: json.id })
      .eq("id", sub.id);

    return { checkout_url: checkoutUrl, subscription_id: sub.id };
  });

/* ---------- Authenticated: get one paid subscription ---------- */

export const getMyHoroscopeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sub } = await (supabaseAdmin as any)
      .from("horoscope_paid_subscriptions")
      .select("*, plan:horoscope_plans(*)")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    return { subscription: sub ?? null };
  });

/* ---------- Authenticated: save periodicity preference ---------- */

const PreferenceSchema = z.object({
  frequency: z.enum(["daily", "alternate", "weekly"]),
  send_local_hour: z.number().int().min(0).max(23).default(8),
  send_local_minute: z.number().int().min(0).max(59).default(30),
  send_weekday: z.number().int().min(0).max(6).nullable().optional(),
  phone_e164: z.string().trim().optional(),
  timezone: z.string().trim().max(64).optional(),
  city: z.string().trim().max(120).optional(),
});

export const saveHoroscopeSubscriptionPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PreferenceSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { findCity, timezoneForUF } = await import("@/lib/br-cities");

    const { data: { user } } = await (supabaseAdmin as any).auth.admin.getUserById(context.userId);
    const email = user?.email ?? null;
    const { data: prof } = await (supabaseAdmin as any)
      .from("profiles").select("phone").eq("id", context.userId).maybeSingle();
    const phone = data.phone_e164?.trim() || prof?.phone || null;

    let tz = data.timezone?.trim() || "";
    if (!tz && data.city) {
      const c = findCity(data.city);
      if (c) tz = c.timezone;
      else {
        const m = data.city.match(/-\s*([A-Za-z]{2})\s*$/);
        if (m) tz = timezoneForUF(m[1]);
      }
    }
    if (!tz) tz = "America/Sao_Paulo";

    const payload = {
      user_id: context.userId,
      enabled: true,
      channel_email: !!email,
      channel_whatsapp: !!phone,
      email,
      phone_e164: phone,
      frequency: data.frequency,
      send_local_hour: data.send_local_hour,
      send_local_minute: data.send_local_minute,
      send_weekday: data.frequency === "weekly" ? (data.send_weekday ?? 1) : null,
      timezone: tz,
    };

    const { data: existing } = await (supabaseAdmin as any)
      .from("horoscope_subscriptions")
      .select("id")
      .eq("user_id", context.userId)
      .is("client_profile_id", null)
      .maybeSingle();

    if (existing) {
      const { error } = await (supabaseAdmin as any)
        .from("horoscope_subscriptions").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await (supabaseAdmin as any)
        .from("horoscope_subscriptions").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/* ---------- ADMIN: CRUD plans ---------- */

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId, _role: "admin",
  });
  if (data !== true) throw new Error("Acesso restrito.");
}

export const adminListHoroscopePlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("horoscope_plans").select("*").order("sort_order");
    return { plans: data ?? [] };
  });

const UpsertSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600).nullable().optional(),
  price_cents: z.number().int().min(0),
  billing_cycle: z.enum(["month", "quarter", "year"]),
  interval_months: z.number().int().min(1).max(24),
  features: z.array(z.string().min(1)).max(20),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  sort_order: z.number().int().min(0).max(999),
});

export const adminUpsertHoroscopePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    const payload = { ...rest, features: data.features };
    if (id) {
      const { error } = await (supabaseAdmin as any)
        .from("horoscope_plans").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await (supabaseAdmin as any)
        .from("horoscope_plans").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteHoroscopePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Prefer deactivating to preserve historical subs; only hard-delete if unused
    const { count } = await (supabaseAdmin as any)
      .from("horoscope_paid_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", data.id);
    if ((count ?? 0) > 0) {
      const { error } = await (supabaseAdmin as any)
        .from("horoscope_plans").update({ is_active: false }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, deactivated: true };
    }
    const { error } = await (supabaseAdmin as any)
      .from("horoscope_plans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, deleted: true };
  });
