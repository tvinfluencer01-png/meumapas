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

    const userIds = Array.from(
      new Set((orders ?? []).map((o) => o.user_id).filter((x): x is string => !!x)),
    );
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
      user_email: (o.user_id && userMap[o.user_id]?.email) ?? (o as any).guest_email ?? null,
      user_name: (o.user_id && userMap[o.user_id]?.full_name) ?? (o.customer_data as any)?.full_name ?? null,
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
        delay_minutes: z.number().int().min(0).max(60 * 24 * 30),
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

const FIELD_LABELS: Record<string, string> = {
  full_name: "Nome completo",
  name: "Nome",
  email: "E-mail",
  phone: "Telefone",
  whatsapp: "WhatsApp",
  birth_date: "Data de nascimento",
  birth_time: "Horário de nascimento",
  birth_city: "Cidade de nascimento",
  birth_country: "País de nascimento",
  city: "Cidade",
  country: "País",
  question: "Pergunta",
  notes: "Observações",
};

function labelOf(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchAdminBranding(): Promise<any | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("pdf_branding")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

async function fetchBytes(url: string | null | undefined): Promise<{ bytes: Uint8Array; mime: "image/png" | "image/jpeg" } | null> {
  if (!url) return null;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    const ct = (r.headers.get("content-type") ?? "").toLowerCase();
    const mime: "image/png" | "image/jpeg" = ct.includes("png") || url.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    return { bytes: buf, mime };
  } catch {
    return null;
  }
}

async function generatePdfForOrder(order: any, landing: any): Promise<Uint8Array> {
  const { buildSimplePdf } = await import("@/lib/simple-pdf");
  const cd = (order.customer_data ?? {}) as Record<string, any>;

  const orderedKeys = [
    "full_name", "name", "email", "phone", "whatsapp",
    "birth_date", "birth_time", "birth_city", "birth_country", "city", "country",
    "question", "notes",
  ];
  const seen = new Set<string>();
  const rows: { k: string; v: string }[] = [];
  for (const k of orderedKeys) {
    const v = cd[k];
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      rows.push({ k: labelOf(k), v: String(v) });
      seen.add(k);
    }
  }
  for (const [k, v] of Object.entries(cd)) {
    if (seen.has(k)) continue;
    if (v === null || v === undefined || String(v).trim() === "") continue;
    rows.push({ k: labelOf(k), v: String(v) });
  }

  const benefits = Array.isArray(landing.benefits)
    ? (landing.benefits as any[]).map((b) => String(b)).filter(Boolean)
    : [];

  const descriptionParas = String(landing.description ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocks: any[] = [
    { type: "h2", text: "Dados do Pedido" },
    { type: "kv", rows },
  ];

  // === Mapa de Personalidade Numerológico — conteúdo completo ===
  const isNumerologyPersonality =
    String(landing.report_type ?? "") === "numerologia" ||
    /numerolog/i.test(String(landing.slug ?? "")) ||
    /personalidade.*numerolog/i.test(String(landing.title ?? ""));

  if (isNumerologyPersonality) {
    const customerName = String(cd.full_name ?? cd.name ?? "").trim();
    const customerBirth = String(cd.birth_date ?? "").trim();
    if (customerName && /^\d{4}-\d{2}-\d{2}/.test(customerBirth)) {
      const { buildPersonalityNumerologyBlocks } = await import(
        "@/lib/numerology-personality-report"
      );
      const { blocks: numBlocks } = buildPersonalityNumerologyBlocks(
        customerName,
        customerBirth,
      );
      for (const b of numBlocks) blocks.push(b);
    } else {
      blocks.push({ type: "h2", text: "Atenção" });
      blocks.push({
        type: "p",
        text:
          "Para gerar o mapa numerológico completo precisamos do nome completo de batismo e da data de nascimento. Por favor, responda ao e-mail de entrega com esses dados para que possamos enviar o mapa personalizado.",
      });
    }
  } else if (descriptionParas.length) {
    blocks.push({ type: "h2", text: "Sobre o seu relatório" });
    for (const p of descriptionParas) blocks.push({ type: "p", text: p });
  } else {
    blocks.push({ type: "p", text: "Seu relatório personalizado está sendo preparado." });
  }

  blocks.push({ type: "h2", text: "Próximos passos" });
  blocks.push({
    type: "p",
    text:
      "Você receberá orientações detalhadas por e-mail. Em caso de dúvidas, responda ao e-mail de entrega que retornaremos o mais breve possível.",
  });
  blocks.push({
    type: "p",
    text: `Pedido nº ${String(order.id).slice(0, 8).toUpperCase()} — emitido em ${new Date().toLocaleDateString("pt-BR")}.`,
  });

  // Carrega branding do admin (logo, cores, capa, rodapé)
  const brand = await fetchAdminBranding();
  let branding: any | undefined;
  if (brand) {
    const [logo, cover, pageBg, watermark] = await Promise.all([
      fetchBytes(brand.logo_url),
      fetchBytes(brand.cover_image_url),
      fetchBytes(brand.page_bg_image_url),
      fetchBytes(brand.watermark_image_url),
    ]);
    branding = {
      displayName: brand.display_name ?? undefined,
      logoBytes: logo?.bytes,
      logoMime: logo?.mime,
      coverImageBytes: cover?.bytes,
      coverImageMime: cover?.mime,
      pageBgImageBytes: pageBg?.bytes,
      pageBgImageMime: pageBg?.mime,
      watermarkImageBytes: watermark?.bytes,
      watermarkImageMime: watermark?.mime,
      watermarkOpacity: brand.watermark_opacity ?? undefined,
      coverBgColor: brand.cover_bg_color ?? undefined,
      coverAccentColor: brand.cover_accent_color ?? undefined,
      coverTitlePosition: brand.cover_title_position ?? undefined,
      headerBgColor: brand.header_bg_color ?? undefined,
      footerBgColor: brand.footer_bg_color ?? undefined,
      headerTextColor: brand.header_text_color ?? undefined,
      bodyTextColor: brand.body_text_color ?? undefined,
      headingTextColor: brand.heading_text_color ?? undefined,
      pageBgColor: brand.page_bg_color ?? undefined,
      bodyFontSize: brand.body_font_size ?? undefined,
      lineHeight: brand.line_height ?? undefined,
      fontFamily: brand.font_family ?? undefined,
      frameStyle: brand.frame_style ?? undefined,
      footerEnabled: brand.footer_enabled ?? true,
      footerName: brand.footer_name ?? undefined,
      footerSite: brand.footer_site ?? undefined,
      footerPhone: brand.footer_phone ?? undefined,
    };
  }

  return await buildSimplePdf({
    brand: branding?.displayName || "Código Cósmico",
    eyebrow: landing.subtitle || landing.title,
    title: landing.title,
    subtitle: landing.subtitle ?? undefined,
    consultantName: cd.full_name ?? cd.name ?? undefined,
    meta: [
      `Pedido: ${String(order.id).slice(0, 8).toUpperCase()}`,
      `Data: ${new Date().toLocaleDateString("pt-BR")}`,
    ],
    blocks,
    branding,
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
      const longUrl = signed?.signedUrl ?? null;
      if (longUrl) {
        const { shortenUrl } = await import("./short-links.server");
        try {
          pdfUrl = await shortenUrl(longUrl, {
            orderId: order.id,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          });
        } catch {
          pdfUrl = longUrl;
        }
      } else {
        pdfUrl = null;
      }
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

async function sendPasswordSetupEmail(order: any) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cd = (order.customer_data ?? {}) as Record<string, any>;
  const to = cd.email ?? order.guest_email;
  if (!to) throw new Error("E-mail do cliente não encontrado.");

  const { data: linkData, error: lErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email: to,
  });
  if (lErr) throw new Error(`generateLink: ${lErr.message}`);
  const recoveryUrl = linkData?.properties?.action_link;
  if (!recoveryUrl) throw new Error("Não foi possível gerar o link de recuperação.");

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
  const nodemailer = (await import("nodemailer")).default;
  const transporter = nodemailer.createTransport({
    host: s.host, port: s.port, secure: !!s.secure,
    auth: { user: s.username, pass: s.password },
  });
  await transporter.sendMail({
    from: `"${s.from_name || s.from_email}" <${s.from_email}>`,
    to,
    subject: "Defina sua senha — Código Cósmico",
    html: `<p>Olá ${cd.full_name ?? cd.name ?? ""},</p>
           <p>Sua conta no Código Cósmico está pronta. Clique abaixo para definir sua senha e acessar.</p>
           <p><a href="${recoveryUrl}" style="background:#d4af37;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">Definir minha senha</a></p>`,
  });
}

export const dispatchProductOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["pdf", "email", "both", "password_setup", "whatsapp"]).default("both"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    if (data.action === "password_setup") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: order, error } = await supabaseAdmin
        .from("product_orders")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      if (error || !order) throw new Error("Pedido não encontrado.");
      await sendPasswordSetupEmail(order);
      return { ok: true };
    }
    if (data.action === "whatsapp") {
      return await sendOrderWhatsapp(data.id);
    }
    return await runDispatchForOrder(data.id, data.action);
  });

async function sendOrderWhatsapp(orderId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order, error } = await supabaseAdmin
    .from("product_orders")
    .select("*, landing:product_landings(*)")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !order) throw new Error("Pedido não encontrado.");
  const landing = (order as any).landing;
  if (!landing) throw new Error("Produto vinculado não encontrado.");

  const recordFailure = async (msg: string) => {
    await supabaseAdmin
      .from("product_orders")
      .update({
        dispatch_attempts: ((order as any).dispatch_attempts ?? 0) + 1,
        error_message: msg,
      } as any)
      .eq("id", order.id);
  };

  try {
    const cd = ((order as any).customer_data ?? {}) as Record<string, any>;
    const rawPhone = String(
      cd.phone_e164 ?? cd.whatsapp ?? cd.phone ?? cd.telefone ?? "",
    ).replace(/\D+/g, "");
    if (!rawPhone) throw new Error("Telefone do cliente não encontrado nos dados do pedido.");
    // Add country code 55 (Brazil) if missing for typical 10/11-digit local numbers
    const phone = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;

    let pdfUrl: string | null = (order as any).pdf_url ?? null;
    if (!pdfUrl) {
      let bytes: Uint8Array;
      try {
        bytes = await generatePdfForOrder(order, landing);
      } catch (e: any) {
        throw new Error(`Falha ao gerar PDF: ${e?.message ?? e}`);
      }
      const path = `product-orders/${order.id}.pdf`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("reports")
        .upload(path, bytes, { contentType: "application/pdf", upsert: true });
      if (upErr) throw new Error(`Upload do PDF falhou: ${upErr.message}`);
      const { data: signed, error: sErr } = await supabaseAdmin.storage
        .from("reports")
        .createSignedUrl(path, 60 * 60 * 24 * 30);
      if (sErr || !signed?.signedUrl) throw new Error(`Gerar link assinado falhou: ${sErr?.message ?? "sem URL"}`);
      const longUrl = signed.signedUrl;
      try {
        const { shortenUrl } = await import("./short-links.server");
        pdfUrl = await shortenUrl(longUrl, {
          orderId: order.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        });
      } catch {
        pdfUrl = longUrl;
      }
      await supabaseAdmin
        .from("product_orders")
        .update({ pdf_url: pdfUrl, pdf_generated_at: new Date().toISOString() } as any)
        .eq("id", order.id);
    }

    const { data: evo } = await supabaseAdmin
      .from("evolution_settings" as any)
      .select("*")
      .eq("enabled", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const e = evo as any;
    if (!e?.base_url || !e?.global_api_key || !e?.instance_name) {
      throw new Error("Evolution API (WhatsApp) não configurada ou desabilitada.");
    }

    const nome = cd.full_name ?? cd.name ?? "";
    const text =
      `Olá ${nome}! ✨\n\nSeu relatório "${landing?.title ?? "produto"}" está pronto.\n\n` +
      `📄 Acesse seu PDF aqui:\n${pdfUrl}\n\n` +
      `O link é válido por 30 dias. Guarde com carinho! 🌙`;
    const base = String(e.base_url).replace(/\/+$/, "");
    const url = `${base}/message/sendText/${encodeURIComponent(e.instance_name)}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { apikey: e.global_api_key, "Content-Type": "application/json" },
        body: JSON.stringify({ number: phone, text }),
      });
    } catch (netErr: any) {
      throw new Error(`Falha de rede ao chamar Evolution: ${netErr?.message ?? netErr}`);
    }
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Evolution retornou HTTP ${res.status}: ${t.slice(0, 200) || res.statusText}`);
    }

    await supabaseAdmin
      .from("product_orders")
      .update({
        updated_at: new Date().toISOString(),
        whatsapp_sent_at: new Date().toISOString(),
        error_message: null,
        dispatch_attempts: ((order as any).dispatch_attempts ?? 0) + 1,
      } as any)
      .eq("id", order.id);
    return { ok: true, pdf_url: pdfUrl, phone };
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    await recordFailure(msg);
    throw new Error(msg);
  }
}


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

// ============================================================
// Guest checkout — order created BEFORE login; user created post-payment
// ============================================================

const GuestOrderSchema = z.object({
  landing_id: z.string().uuid(),
  customer_data: z.record(z.string(), z.any()),
});

export const createGuestProductOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => GuestOrderSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: landing, error: lErr } = await supabaseAdmin
      .from("product_landings")
      .select("*")
      .eq("id", data.landing_id)
      .eq("active", true)
      .maybeSingle();
    if (lErr || !landing) throw new Error("Landing não encontrada ou inativa.");

    const cd = data.customer_data ?? {};
    const email = String(cd.email ?? "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("E-mail inválido.");
    }
    cd.email = email;

    // required fields + always require email + full_name for guest flow
    const required = Array.from(new Set([...(landing.required_fields as string[] ?? []), "email", "full_name"]));
    for (const k of required) {
      const v = cd[k];
      if (v === undefined || v === null || String(v).trim() === "") {
        throw new Error(`Campo obrigatório ausente: ${k}`);
      }
    }

    // Upsert CRM lead (one per email+landing)
    const { data: existingLead } = await supabaseAdmin
      .from("crm_leads")
      .select("id")
      .eq("email", email)
      .eq("landing_id", landing.id)
      .maybeSingle();

    let leadId: string;
    if (existingLead) {
      leadId = existingLead.id;
      await supabaseAdmin.from("crm_leads").update({
        full_name: cd.full_name ?? null,
        phone: cd.phone ?? null,
        customer_data: cd,
        status: "new",
      }).eq("id", leadId);
    } else {
      const { data: newLead, error: leadErr } = await supabaseAdmin.from("crm_leads").insert({
        email,
        full_name: cd.full_name ?? null,
        phone: cd.phone ?? null,
        source: "landing",
        landing_slug: landing.slug,
        landing_id: landing.id,
        customer_data: cd,
        status: "new",
      }).select("id").single();
      if (leadErr) throw new Error(leadErr.message);
      leadId = newLead.id;
    }

    const { data: mp } = await supabaseAdmin
      .from("mercado_pago_settings")
      .select("access_token, enabled, environment")
      .eq("id", true)
      .maybeSingle();
    if (!mp?.enabled || !mp.access_token) {
      throw new Error("Pagamentos indisponíveis no momento.");
    }

    const { data: order, error: oErr } = await supabaseAdmin
      .from("product_orders")
      .insert({
        user_id: null,
        lead_id: leadId,
        guest_email: email,
        landing_id: landing.id,
        status: "pending_payment",
        amount_cents: landing.price_cents,
        customer_data: cd,
      } as any)
      .select("id, access_token")
      .single();
    if (oErr) throw new Error(oErr.message);

    let origin = process.env.PUBLIC_APP_URL;
    if (!origin) {
      try {
        const req = getRequest();
        const url = new URL(req.url);
        const fh = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
        const fp = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
        origin = `${fp}://${fh ?? url.host}`;
      } catch {
        origin = "https://meumapas.lovable.app";
      }
    }

    const prefBody = {
      items: [{
        id: landing.slug,
        title: landing.title,
        quantity: 1,
        currency_id: "BRL",
        unit_price: landing.price_cents / 100,
      }],
      payer: { email },
      external_reference: order.id,
      metadata: { order_id: order.id, kind: "product_order", landing_id: landing.id, lead_id: leadId },
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
      headers: { Authorization: `Bearer ${mp.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(prefBody),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Falha ao criar checkout: ${json?.message ?? `HTTP ${res.status}`}`);
    const checkoutUrl = mp.environment === "production" ? json.init_point : json.sandbox_init_point ?? json.init_point;
    if (!checkoutUrl || !json.id) throw new Error("Resposta inesperada do Mercado Pago.");

    await supabaseAdmin.from("product_orders").update({ mp_preference_id: json.id }).eq("id", order.id);
    return { checkout_url: checkoutUrl, order_id: order.id, access_token: order.access_token };
  });

// ============================================================
// CRM Leads
// ============================================================

export const listCrmLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("crm_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateCrmLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    status: z.enum(["new", "contacted", "negotiating", "converted", "lost"]).optional(),
    notes: z.string().max(4000).nullable().optional(),
    last_contact_at: z.string().datetime().nullable().optional(),
    increment_followup: z.boolean().optional(),
    followup_paused: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, any> = {};
    if (data.status) {
      patch.status = data.status;
      if (data.status === "converted" || data.status === "lost") {
        patch.next_followup_at = null;
      }
    }
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.last_contact_at !== undefined) patch.last_contact_at = data.last_contact_at;
    if (data.followup_paused !== undefined) patch.followup_paused = data.followup_paused;
    if (data.increment_followup) {
      const { data: cur } = await supabaseAdmin.from("crm_leads").select("followup_count").eq("id", data.id).maybeSingle();
      patch.followup_count = ((cur as any)?.followup_count ?? 0) + 1;
      patch.last_contact_at = new Date().toISOString();
      patch.last_followup_at = patch.last_contact_at;
    }
    const { error } = await supabaseAdmin.from("crm_leads").update(patch as any).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

