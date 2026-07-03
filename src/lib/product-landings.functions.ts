import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const REPORT_TYPES = [
  { value: "mapa_astral", label: "Mapa Astral" },
  { value: "numerologia", label: "Numerologia (Mapa da Personalidade)" },
  { value: "numerologia_cabalistica", label: "Numerologia Cabalística" },
  { value: "tarot", label: "Leitura de Tarot" },
  { value: "mapa_empresarial", label: "Mapa Empresarial" },
  { value: "leitura_semanal", label: "Leitura Semanal" },
  { value: "horoscopo", label: "Horóscopo Personalizado" },
  { value: "custom", label: "Personalizado (manual)" },
] as const;

export const AVAILABLE_FIELDS = [
  { key: "full_name", label: "Nome completo" },
  { key: "email", label: "Email" },
  { key: "phone", label: "WhatsApp" },
  { key: "birth_date", label: "Data de nascimento" },
  { key: "birth_time", label: "Hora de nascimento" },
  { key: "birth_place", label: "Local de nascimento (cidade/estado/país)" },
  { key: "birth_city", label: "Cidade de nascimento" },
  { key: "birth_country", label: "País de nascimento" },
  { key: "partner_name", label: "Nome do parceiro(a)" },
  { key: "partner_birth_date", label: "Data nasc. parceiro(a)" },
  { key: "partner_birth_time", label: "Hora nasc. parceiro(a)" },
  { key: "partner_birth_place", label: "Local nasc. parceiro(a)" },
  { key: "company_name", label: "Nome da empresa" },
  { key: "company_founded_at", label: "Data de fundação" },
  { key: "question", label: "Pergunta livre" },
] as const;

export const getPublicLanding = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("product_landings")
      .select("*")
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("not_found");
    return row;
  });

export const listPublicLandings = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("product_landings")
    .select("slug, title, price_cents, report_type")
    .eq("active", true)
    .order("title", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listAdminLandings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("product_landings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const LandingInputSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/, "use apenas letras minúsculas, números e hífen"),
  title: z.string().min(2).max(200),
  subtitle: z.string().max(300).nullable().optional(),
  description: z.string().max(8000).nullable().optional(),
  hero_image_url: z.string().url().nullable().optional().or(z.literal("")),
  hero_image_width: z.number().int().min(120).max(1600).nullable().optional(),
  hero_image_height: z.number().int().min(120).max(1600).nullable().optional(),
  price_cents: z.number().int().min(0).max(10_000_000),
  report_type: z.string().min(1).max(60),
  required_fields: z.array(z.string()).min(1),
  benefits: z.array(z.string()).default([]),
  cta_text: z.string().min(1).max(80),
  delivery_email_subject: z.string().max(200).nullable().optional(),
  delivery_email_template: z.string().max(8000).nullable().optional(),
  delivery_whatsapp_template: z.string().max(2000).nullable().optional(),
  seo_title: z.string().max(200).nullable().optional(),
  seo_description: z.string().max(400).nullable().optional(),
  active: z.boolean().default(true),
});

export const upsertLanding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => LandingInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      slug: data.slug,
      title: data.title,
      subtitle: data.subtitle || null,
      description: data.description || null,
      hero_image_url: data.hero_image_url || null,
      hero_image_width: data.hero_image_width ?? null,
      hero_image_height: data.hero_image_height ?? null,
      price_cents: data.price_cents,
      report_type: data.report_type,
      required_fields: data.required_fields,
      benefits: data.benefits,
      cta_text: data.cta_text,
      delivery_email_subject: data.delivery_email_subject || null,
      delivery_email_template: data.delivery_email_template || null,
      delivery_whatsapp_template: data.delivery_whatsapp_template || null,
      seo_title: data.seo_title || null,
      seo_description: data.seo_description || null,
      active: data.active,
      created_by: context.userId,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("product_landings")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("product_landings")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const deleteLanding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("product_landings")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Imagem de capa: upload + geração por IA ---------- */

const LANDING_BUCKET = "product-landings";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 anos

async function ensureAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

async function storeAndSign(bytes: Buffer, ext: "png" | "jpg", mime: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const path = `hero/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabaseAdmin.storage
    .from(LANDING_BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (upErr) throw new Error(upErr.message);
  const { data: signed, error: sErr } = await supabaseAdmin.storage
    .from(LANDING_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (sErr || !signed?.signedUrl) throw new Error(sErr?.message ?? "Falha ao gerar URL");
  return signed.signedUrl;
}

export const uploadLandingHeroImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        base64: z.string().min(20),
        mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > 5 * 1024 * 1024) {
      throw new Error("Imagem acima de 5MB. Comprima antes de enviar.");
    }
    const ext = data.mime === "image/png" ? "png" : "jpg";
    const url = await storeAndSign(bytes, ext, data.mime);
    return { url };
  });

export const generateLandingHeroImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ prompt: z.string().min(3).max(1000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-image-2",
        prompt: data.prompt,
        size: "1024x1024",
        quality: "low",
        n: 1,
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Limite de geração atingido. Tente novamente em instantes.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados na workspace.");
      throw new Error(`Falha na geração (${res.status}): ${txt.slice(0, 200)}`);
    }
    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) throw new Error("Resposta da IA sem imagem.");
    const bytes = Buffer.from(b64, "base64");
    const url = await storeAndSign(bytes, "png", "image/png");
    return { url };
  });

