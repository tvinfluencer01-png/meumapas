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

// ============================================================
// Dispatch (PDF + Email) — automatic or manual
// ============================================================

export const getDispatchSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("product_dispatch_settings" as any)
      .select("*")
      .eq("id", "global")
      .maybeSingle();
    const r = (data as any) ?? {};
    return {
      auto_enabled: !!r.auto_enabled,
      delay_minutes: typeof r.delay_minutes === "number" ? r.delay_minutes : 5,
    };
  });

export const saveDispatchSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        auto_enabled: z.boolean(),
        delay_minutes: z.number().int().min(0).max(1440),
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
    const { error } = await supabaseAdmin
      .from("product_dispatch_settings" as any)
      .upsert(
        {
          id: "global",
          auto_enabled: data.auto_enabled,
          delay_minutes: data.delay_minutes,
          updated_at: new Date().toISOString(),
          updated_by: context.userId,
        },
        { onConflict: "id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function generatePdfForOrder(order: any, landing: any): Promise<Uint8Array> {
  const { buildSimplePdf } = await import("@/lib/simple-pdf");
  const cd = (order.customer_data ?? {}) as Record<string, any>;
  const rows = Object.entries(cd)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => ({ k: String(k), v: String(v) }));
  return await buildSimplePdf({
    brand: "Código Cósmico",
    eyebrow: landing.title,
    title: landing.title,
    subtitle: landing.subtitle ?? undefined,
    consultantName: cd.full_name ?? cd.name ?? undefined,
    meta: [`Pedido: ${order.id.slice(0, 8)}`, `Data: ${new Date().toLocaleDateString("pt-BR")}`],
    blocks: [
      { type: "h2", text: "Dados do Pedido" },
      { type: "kv", rows },
      { type: "p", text: landing.description ?? "Seu relatório personalizado está sendo preparado." },
    ],
  });
}

async function sendOrderEmail(order: any, landing: any, pdfUrl: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: smtp } = await supabaseAdmin
    .from("smtp_settings" as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const s = smtp as any;
  if (!s?.enabled || !s.host || !s.username || !s.password || !s.from_email) {
    throw new Error("SMTP não configurado.");
  }
  const cd = (order.customer_data ?? {}) as Record<string, any>;
  const to = cd.email;
  if (!to) throw new Error("E-mail do cliente não encontrado nos dados do pedido.");

  const subject = landing.delivery_email_subject || `Seu ${landing.title} está pronto`;
  const tpl =
    landing.delivery_email_template ||
    `<p>Olá {{name}},</p><p>Seu relatório <strong>{{title}}</strong> está pronto.</p>{{download}}<p>Obrigado!</p>`;
  const downloadHtml = pdfUrl
    ? `<p><a href="${pdfUrl}" style="background:#d4af37;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">Baixar PDF</a></p>`
    : "";
  const html = tpl
    .replace(/\{\{name\}\}/g, String(cd.full_name ?? cd.name ?? "cliente"))
    .replace(/\{\{title\}\}/g, landing.title)
    .replace(/\{\{download\}\}/g, downloadHtml);

  const nodemailer = (await import("nodemailer")).default;
  const transporter = nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: !!s.secure,
    auth: { user: s.username, pass: s.password },
  });
  await transporter.sendMail({
    from: `"${s.from_name || s.from_email}" <${s.from_email}>`,
    to,
    replyTo: s.reply_to || undefined,
    subject,
    html,
  });
}

async function runDispatchForOrder(
  orderId: string,
  action: "pdf" | "email" | "both",
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order, error } = await supabaseAdmin
    .from("product_orders")
    .select("*, landing:product_landings(*)")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !order) throw new Error("Pedido não encontrado.");
  const landing = (order as any).landing;
  if (!landing) throw new Error("Produto vinculado não encontrado.");

  const patch: Record<string, any> = {
    dispatch_attempts: ((order as any).dispatch_attempts ?? 0) + 1,
  };
  let pdfUrl: string | null = (order as any).pdf_url ?? null;

  try {
    if (action === "pdf" || action === "both") {
      const bytes = await generatePdfForOrder(order, landing);
      const path = `product-orders/${order.id}.pdf`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("reports")
        .upload(path, bytes, { contentType: "application/pdf", upsert: true });
      if (upErr) throw new Error(`Upload PDF: ${upErr.message}`);
      const { data: signed, error: sErr } = await supabaseAdmin.storage
        .from("reports")
        .createSignedUrl(path, 60 * 60 * 24 * 30);
      if (sErr) throw new Error(`Signed URL: ${sErr.message}`);
      pdfUrl = signed?.signedUrl ?? null;
      patch.pdf_url = pdfUrl;
      patch.pdf_generated_at = new Date().toISOString();
    }
    if (action === "email" || action === "both") {
      await sendOrderEmail(order, landing, pdfUrl);
      patch.email_sent_at = new Date().toISOString();
    }
    if (action === "both" || (action === "email" && pdfUrl)) {
      patch.status = "delivered";
      patch.delivered_at = new Date().toISOString();
    } else if (action === "pdf") {
      if (((order as any).status ?? "") === "paid") patch.status = "processing";
    }
    patch.error_message = null;
  } catch (e: any) {
    patch.status = "failed";
    patch.error_message = e?.message ?? String(e);
    await supabaseAdmin.from("product_orders").update(patch as any).eq("id", order.id);
    throw e;
  }
  await supabaseAdmin.from("product_orders").update(patch as any).eq("id", order.id);
  return { ok: true, pdf_url: pdfUrl };
}

export const dispatchProductOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["pdf", "email", "both"]).default("both"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    return await runDispatchForOrder(data.id, data.action);
  });

export async function runAutomaticDispatchSweep() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: cfg } = await supabaseAdmin
    .from("product_dispatch_settings" as any)
    .select("*")
    .eq("id", "global")
    .maybeSingle();
  const c = cfg as any;
  if (!c?.auto_enabled) return { ran: 0, skipped: "disabled" as const };
  const delay = typeof c.delay_minutes === "number" ? c.delay_minutes : 5;
  const cutoff = new Date(Date.now() - delay * 60_000).toISOString();
  const { data: orders } = await supabaseAdmin
    .from("product_orders")
    .select("id")
    .eq("status", "paid")
    .lte("updated_at", cutoff)
    .limit(20);
  let ran = 0;
  for (const o of (orders ?? []) as Array<{ id: string }>) {
    try {
      await runDispatchForOrder(o.id, "both");
      ran++;
    } catch {
      /* logged in order */
    }
  }
  return { ran };
}
