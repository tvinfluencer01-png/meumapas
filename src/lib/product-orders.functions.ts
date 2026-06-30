import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateOrderSchema = z.object({
  landing_id: z.string().uuid(),
  customer_data: z.record(z.string(), z.any()),
});

export const createProductOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CreateOrderSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: landing, error: lErr } = await supabaseAdmin
      .from("product_landings")
      .select("*")
      .eq("id", data.landing_id)
      .eq("active", true)
      .maybeSingle();
    if (lErr || !landing) throw new Error("Landing não encontrada ou inativa.");

    // Validate required fields presence
    const required = (landing.required_fields as string[]) ?? [];
    for (const k of required) {
      const v = data.customer_data[k];
      if (v === undefined || v === null || String(v).trim() === "") {
        throw new Error(`Campo obrigatório ausente: ${k}`);
      }
    }

    const { data: mp, error: mpErr } = await supabaseAdmin
      .from("mercado_pago_settings")
      .select("access_token, enabled, environment")
      .eq("id", true)
      .maybeSingle();
    if (mpErr) throw new Error(mpErr.message);
    if (!mp?.enabled || !mp.access_token) {
      throw new Error("Pagamentos indisponíveis no momento. Tente novamente em instantes.");
    }

    const { data: order, error: oErr } = await supabaseAdmin
      .from("product_orders")
      .insert({
        user_id: context.userId,
        landing_id: landing.id,
        status: "pending_payment",
        amount_cents: landing.price_cents,
        customer_data: data.customer_data,
      })
      .select("id, access_token")
      .single();
    if (oErr) throw new Error(oErr.message);

    let origin = process.env.PUBLIC_APP_URL;
    if (!origin) {
      try {
        const req = getRequest();
        const url = new URL(req.url);
        const forwardedHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
        const forwardedProto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
        origin = `${forwardedProto}://${forwardedHost ?? url.host}`;
      } catch {
        origin = "https://meumapas.lovable.app";
      }
    }

    const prefBody = {
      items: [
        {
          id: landing.slug,
          title: landing.title,
          quantity: 1,
          currency_id: "BRL",
          unit_price: landing.price_cents / 100,
        },
      ],
      external_reference: order.id,
      metadata: {
        order_id: order.id,
        user_id: context.userId,
        kind: "product_order",
        landing_id: landing.id,
      },
      back_urls: {
        success: `${origin}/p/${landing.slug}?status=success&order=${order.id}`,
        pending: `${origin}/p/${landing.slug}?status=pending&order=${order.id}`,
        failure: `${origin}/p/${landing.slug}?status=failure&order=${order.id}`,
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
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      init_point?: string;
      sandbox_init_point?: string;
      message?: string;
    };
    if (!res.ok) {
      throw new Error(`Falha ao criar checkout: ${json?.message ?? `HTTP ${res.status}`}`);
    }
    const checkoutUrl =
      mp.environment === "production"
        ? json.init_point
        : json.sandbox_init_point ?? json.init_point;
    if (!checkoutUrl || !json.id) throw new Error("Resposta inesperada do Mercado Pago.");

    await supabaseAdmin
      .from("product_orders")
      .update({ mp_preference_id: json.id })
      .eq("id", order.id);

    return { checkout_url: checkoutUrl, order_id: order.id, access_token: order.access_token };
  });

export const listAdminOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orders, error } = await supabaseAdmin
      .from("product_orders")
      .select("*, landing:product_landings(slug,title,report_type)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set((orders ?? []).map((o) => o.user_id)));
    let userMap: Record<string, { email: string | null; full_name: string | null }> = {};
    if (userIds.length) {
      const [{ data: profiles }] = await Promise.all([
        supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds),
      ]);
      for (const p of profiles ?? []) {
        userMap[p.id] = { email: null, full_name: p.full_name };
      }
      // get emails from auth
      for (const id of userIds) {
        try {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
          if (u?.user) {
            userMap[id] = {
              email: u.user.email ?? null,
              full_name: userMap[id]?.full_name ?? null,
            };
          }
        } catch {
          /* noop */
        }
      }
    }

    return (orders ?? []).map((o) => ({
      ...o,
      user_email: userMap[o.user_id]?.email ?? null,
      user_name: userMap[o.user_id]?.full_name ?? null,
    }));
  });

export const countUnviewedOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return { count: 0 };
    const { data } = await context.supabase.rpc("count_unviewed_orders");
    return { count: (data as number) ?? 0 };
  });

export const markOrdersViewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("product_orders")
      .update({ viewed_by_admin: true })
      .eq("viewed_by_admin", false);
    return { ok: true };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending_payment", "paid", "processing", "delivered", "failed", "refunded"]),
        pdf_url: z.string().url().optional().nullable(),
        error_message: z.string().max(2000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { status: data.status };
    if (data.pdf_url !== undefined) patch.pdf_url = data.pdf_url;
    if (data.error_message !== undefined) patch.error_message = data.error_message;
    if (data.status === "delivered") patch.delivered_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from("product_orders").update(patch as any).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("product_orders")
      .select("*, landing:product_landings(slug,title)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getOrderByToken = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("product_orders")
      .select("id, status, pdf_url, delivered_at, landing:product_landings(title,slug)")
      .eq("access_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("not_found");
    return order;
  });
