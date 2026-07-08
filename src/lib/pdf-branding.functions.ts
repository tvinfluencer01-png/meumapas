import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";


const BUCKET = "pdf-branding";
const MAX_BYTES = 500 * 1024; // 500KB
const MAX_COVER_BYTES = 3 * 1024 * 1024; // 3MB para imagem de capa

const HexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (use formato #RRGGBB)");

const TitlePosition = z.enum(["top", "center", "bottom"]);
const FontFamily = z.enum(["serif", "sans", "display"]);
const FrameStyle = z.enum(["none", "simple", "double", "ornamental"]);

const BrandingShape = z.object({
  enabled: z.boolean(),
  logo_width: z.number().int().min(40).max(240),
  logo_height: z.number().int().min(20).max(160),
  display_name: z.string().trim().max(80).nullable().optional(),
  footer_enabled: z.boolean(),
  footer_name: z.string().trim().max(80).nullable().optional(),
  footer_site: z.string().trim().max(120).nullable().optional(),
  footer_phone: z.string().trim().max(40).nullable().optional(),
  enabled_personality: z.boolean(),
  enabled_love: z.boolean(),
  enabled_career: z.boolean(),
  enabled_spiritual: z.boolean(),
  enabled_tarot: z.boolean(),
  enabled_kabbalah: z.boolean(),
  enabled_numerology: z.boolean(),
  enabled_astrology: z.boolean(),
  enabled_kabbalah_numerology: z.boolean(),
  enabled_energy_calendar: z.boolean(),
  enabled_weekly: z.boolean(),
  // Personalização avançada da capa e cabeçalho/rodapé
  cover_bg_color: HexColor,
  cover_accent_color: HexColor,
  cover_title_position: TitlePosition,
  font_family: FontFamily,
  header_bg_color: HexColor,
  footer_bg_color: HexColor,
  header_text_color: HexColor,
  // PDF CSS Avançado
  page_bg_color: HexColor,
  body_text_color: HexColor,
  heading_text_color: HexColor,
  body_font_size: z.number().min(8).max(20),
  line_height: z.number().min(1).max(2.2),
  frame_style: FrameStyle,
  watermark_opacity: z.number().min(0).max(1),
});

async function getSignedUrl(path: string | null | undefined, expires = 60 * 60) {
  if (!path) return null;
  const { data: signed } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, expires);
  return signed?.signedUrl ?? null;
}

export const getPdfBranding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("pdf_branding")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const row = data as Record<string, unknown> | null;
    const signedLogoUrl = await getSignedUrl(data?.logo_path);
    const signedCoverUrl = await getSignedUrl(row?.cover_image_path as string | undefined);
    const signedPageBgUrl = await getSignedUrl(row?.page_bg_image_path as string | undefined);
    const signedWatermarkUrl = await getSignedUrl(row?.watermark_image_path as string | undefined);
    return { branding: data ?? null, signedLogoUrl, signedCoverUrl, signedPageBgUrl, signedWatermarkUrl };
  });

export const savePdfBranding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => BrandingShape.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      user_id: userId,
      enabled: data.enabled,
      logo_width: data.logo_width,
      logo_height: data.logo_height,
      display_name: data.display_name?.trim() || null,
      footer_enabled: data.footer_enabled,
      footer_name: data.footer_name?.trim() || null,
      footer_site: data.footer_site?.trim() || null,
      footer_phone: data.footer_phone?.trim() || null,
      enabled_personality: data.enabled_personality,
      enabled_love: data.enabled_love,
      enabled_career: data.enabled_career,
      enabled_spiritual: data.enabled_spiritual,
      enabled_tarot: data.enabled_tarot,
      enabled_kabbalah: data.enabled_kabbalah,
      enabled_numerology: data.enabled_numerology,
      enabled_astrology: data.enabled_astrology,
      enabled_kabbalah_numerology: data.enabled_kabbalah_numerology,
      enabled_energy_calendar: data.enabled_energy_calendar,
      enabled_weekly: data.enabled_weekly,
      cover_bg_color: data.cover_bg_color,
      cover_accent_color: data.cover_accent_color,
      cover_title_position: data.cover_title_position,
      font_family: data.font_family,
      header_bg_color: data.header_bg_color,
      footer_bg_color: data.footer_bg_color,
      header_text_color: data.header_text_color,
      page_bg_color: data.page_bg_color,
      body_text_color: data.body_text_color,
      heading_text_color: data.heading_text_color,
      body_font_size: data.body_font_size,
      line_height: data.line_height,
      frame_style: data.frame_style,
      watermark_opacity: data.watermark_opacity,
    };
    const { error } = await supabase
      .from("pdf_branding")
      .upsert(payload, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const uploadPdfLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        base64: z.string().min(20),
        mime: z.enum(["image/png", "image/jpeg"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > MAX_BYTES) {
      throw new Error("Logo acima de 500KB. Comprima a imagem antes de enviar.");
    }
    const ext = data.mime === "image/png" ? "png" : "jpg";
    const path = `${userId}/logo-${Date.now()}.${ext}`;

    // Remove logos anteriores (não as imagens de capa)
    const { data: existing } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(userId, { limit: 200 });
    const oldLogos = (existing ?? []).filter((f) => f.name.startsWith("logo-"));
    if (oldLogos.length) {
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove(oldLogos.map((f) => `${userId}/${f.name}`));
    }

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.mime, upsert: true });
    if (upErr) throw new Error(upErr.message);

    await supabaseAdmin
      .from("pdf_branding")
      .upsert({ user_id: userId, logo_path: path }, { onConflict: "user_id" });

    return { path, signedUrl: await getSignedUrl(path) };
  });

export const removePdfLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: existing } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(userId, { limit: 200 });
    const oldLogos = (existing ?? []).filter((f) => f.name.startsWith("logo-"));
    if (oldLogos.length) {
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove(oldLogos.map((f) => `${userId}/${f.name}`));
    }
    await supabaseAdmin
      .from("pdf_branding")
      .upsert({ user_id: userId, logo_path: null }, { onConflict: "user_id" });
    return { ok: true };
  });

/* ---------- Imagem de capa (upload manual) ---------- */

export const uploadCoverImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        base64: z.string().min(20),
        mime: z.enum(["image/png", "image/jpeg"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > MAX_COVER_BYTES) {
      throw new Error("Imagem de capa acima de 3MB. Comprima antes de enviar.");
    }
    const ext = data.mime === "image/png" ? "png" : "jpg";
    const path = `${userId}/cover-${Date.now()}.${ext}`;

    const { data: existing } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(userId, { limit: 200 });
    const oldCovers = (existing ?? []).filter((f) => f.name.startsWith("cover-"));
    if (oldCovers.length) {
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove(oldCovers.map((f) => `${userId}/${f.name}`));
    }

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.mime, upsert: true });
    if (upErr) throw new Error(upErr.message);

    await supabaseAdmin
      .from("pdf_branding")
      .upsert({ user_id: userId, cover_image_path: path }, { onConflict: "user_id" });

    return { path, signedUrl: await getSignedUrl(path) };
  });

export const removeCoverImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: existing } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(userId, { limit: 200 });
    const oldCovers = (existing ?? []).filter((f) => f.name.startsWith("cover-"));
    if (oldCovers.length) {
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove(oldCovers.map((f) => `${userId}/${f.name}`));
    }
    await supabaseAdmin
      .from("pdf_branding")
      .upsert(
        { user_id: userId, cover_image_path: null },
        { onConflict: "user_id" },
      );
    return { ok: true };
  });

/* ---------- Geração de imagem de capa por IA ---------- */

export const generateCoverImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ prompt: z.string().trim().min(8).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const sysPrompt =
      "Elegant, sophisticated, dark-tone abstract cover image for a premium spiritual report cover. Vertical A4 composition, dark/empty space in the center for title overlay. No text, no letters, no words. Mystical, painterly, cinematic.";
    const fullPrompt = `${sysPrompt}\n\nUser prompt: ${data.prompt}`;

    const { generateImageWithConfigured } = await import("@/lib/image-resolver.server");
    const bytes = Buffer.from(
      await generateImageWithConfigured(context.supabase, userId, fullPrompt, "1024x1536"),
    );
    const mime: "image/png" = "image/png";

    const ext = mime === "image/png" ? "png" : "jpg";
    const path = `${userId}/cover-${Date.now()}.${ext}`;

    // remove anteriores
    const { data: existing } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(userId, { limit: 200 });
    const oldCovers = (existing ?? []).filter((f) => f.name.startsWith("cover-"));
    if (oldCovers.length) {
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove(oldCovers.map((f) => `${userId}/${f.name}`));
    }

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: mime, upsert: true });
    if (upErr) throw new Error(upErr.message);

    await supabaseAdmin
      .from("pdf_branding")
      .upsert({ user_id: userId, cover_image_path: path }, { onConflict: "user_id" });

    return { path, signedUrl: await getSignedUrl(path) };
  });

/* ---------- PDF de exemplo (preview real) ---------- */

export const generateSampleBrandingPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("pdf_branding")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const branding = await resolveBrandingPayload(row);

    // Importa dinamicamente para evitar custo em outros fluxos
    const { buildSimplePdf } = await import("@/lib/simple-pdf");

    const bytes = await buildSimplePdf({
      brand: "Código Cósmico",
      eyebrow: "Preview de personalização",
      title: "Exemplo de Relatório",
      subtitle: "Esta é uma capa de teste com o seu branding atual",
      consultantName: branding?.footerName ?? undefined,
      meta: ["Data: Hoje", "Tipo: Amostra"],
      blocks: [
        { type: "h2", text: "Introdução" },
        {
          type: "p",
          text: "Este é um PDF de exemplo gerado para você visualizar como ficará o branding aplicado nos relatórios. As cores, a tipografia e a imagem de capa configuradas aparecem como nos relatórios reais.",
        },
        { type: "h2", text: "Como funciona" },
        {
          type: "p",
          text: "Cada vez que você ajustar uma cor, fonte ou imagem, basta salvar e gerar um novo preview. Os relatórios verdadeiros usarão exatamente esta mesma configuração.",
        },
        { type: "quote", text: "A beleza está nos detalhes meticulosamente cuidados." },
      ],
      flowing: true,
      branding,
    });

    const base64 = Buffer.from(bytes).toString("base64");
    return { pdfBase64: base64 };
  });

/**
 * Carrega a configuração de branding atual do usuário em um payload pronto
 * para o `buildSimplePdf`/`reports-pdf`. Retorna undefined quando o branding
 * está desativado.
 */
export async function resolveBrandingPayload(
  row: Record<string, unknown> | null | undefined,
): Promise<
  | {
      coverImageBytes?: Uint8Array;
      coverImageMime?: "image/png" | "image/jpeg";
      logoBytes?: Uint8Array;
      logoMime?: "image/png" | "image/jpeg";
      logoWidth: number;
      logoHeight: number;
      displayName?: string;
      footerEnabled: boolean;
      footerName?: string;
      footerSite?: string;
      footerPhone?: string;
      coverBgColor: string;
      coverAccentColor: string;
      coverTitlePosition: "top" | "center" | "bottom";
      fontFamily: "serif" | "sans" | "display";
      headerBgColor: string;
      footerBgColor: string;
      headerTextColor: string;
      pageBgColor: string;
      pageBgImageBytes?: Uint8Array;
      pageBgImageMime?: "image/png" | "image/jpeg";
      watermarkImageBytes?: Uint8Array;
      watermarkImageMime?: "image/png" | "image/jpeg";
      watermarkOpacity: number;
      bodyTextColor: string;
      headingTextColor: string;
      bodyFontSize: number;
      lineHeight: number;
      frameStyle: "none" | "simple" | "double" | "ornamental";
    }
  | undefined
> {
  if (!row) return undefined;
  if (!(row.enabled as boolean)) return undefined;

  async function loadImage(path: string | undefined | null) {
    if (!path) return { bytes: undefined, mime: undefined };
    try {
      const { data: blob } = await supabaseAdmin.storage
        .from(BUCKET)
        .download(path);
      if (!blob) return { bytes: undefined, mime: undefined };
      const ab = await blob.arrayBuffer();
      const bytes = new Uint8Array(ab);
      const mime: "image/png" | "image/jpeg" = path
        .toLowerCase()
        .endsWith(".png")
        ? "image/png"
        : "image/jpeg";
      return { bytes, mime };
    } catch {
      return { bytes: undefined, mime: undefined };
    }
  }

  const logo = await loadImage(row.logo_path as string | null | undefined);
  const cover = await loadImage(row.cover_image_path as string | null | undefined);
  const pageBg = await loadImage(row.page_bg_image_path as string | null | undefined);
  const watermark = await loadImage(row.watermark_image_path as string | null | undefined);

  return {
    coverImageBytes: cover.bytes,
    coverImageMime: cover.mime,
    logoBytes: logo.bytes,
    logoMime: logo.mime,
    logoWidth: (row.logo_width as number) ?? 120,
    logoHeight: (row.logo_height as number) ?? 60,
    displayName: (row.display_name as string) || undefined,
    footerEnabled: (row.footer_enabled as boolean) ?? true,
    footerName: (row.footer_name as string) || undefined,
    footerSite: (row.footer_site as string) || undefined,
    footerPhone: (row.footer_phone as string) || undefined,
    coverBgColor: (row.cover_bg_color as string) ?? "#03060f",
    coverAccentColor: (row.cover_accent_color as string) ?? "#d4af37",
    coverTitlePosition:
      ((row.cover_title_position as string) as "top" | "center" | "bottom") ?? "center",
    fontFamily: ((row.font_family as string) as "serif" | "sans" | "display") ?? "serif",
    headerBgColor: (row.header_bg_color as string) ?? "#f5f1e6",
    footerBgColor: (row.footer_bg_color as string) ?? "#f5f1e6",
    headerTextColor: (row.header_text_color as string) ?? "#d4af37",
    pageBgColor: (row.page_bg_color as string) ?? "#f5f1e6",
    pageBgImageBytes: pageBg.bytes,
    pageBgImageMime: pageBg.mime,
    watermarkImageBytes: watermark.bytes,
    watermarkImageMime: watermark.mime,
    watermarkOpacity: Number(row.watermark_opacity ?? 0.08),
    bodyTextColor: (row.body_text_color as string) ?? "#262218",
    headingTextColor: (row.heading_text_color as string) ?? "#03060f",
    bodyFontSize: Number(row.body_font_size ?? 12.5),
    lineHeight: Number(row.line_height ?? 1.45),
    frameStyle: ((row.frame_style as string) as "none" | "simple" | "double" | "ornamental") ?? "double",
  };
}

/* ---------- Imagem de fundo das páginas e marca d'água (PDF CSS) ---------- */

async function uploadAssetGeneric(opts: {
  userId: string;
  base64: string;
  mime: "image/png" | "image/jpeg";
  prefix: "pagebg" | "watermark";
  maxBytes: number;
  column: "page_bg_image_path" | "watermark_image_path";
}) {
  const bytes = Buffer.from(opts.base64, "base64");
  if (bytes.byteLength > opts.maxBytes) {
    throw new Error(`Arquivo acima de ${Math.round(opts.maxBytes / 1024)}KB.`);
  }
  const ext = opts.mime === "image/png" ? "png" : "jpg";
  const path = `${opts.userId}/${opts.prefix}-${Date.now()}.${ext}`;
  const { data: existing } = await supabaseAdmin.storage
    .from(BUCKET)
    .list(opts.userId, { limit: 200 });
  const old = (existing ?? []).filter((f) => f.name.startsWith(`${opts.prefix}-`));
  if (old.length) {
    await supabaseAdmin.storage
      .from(BUCKET)
      .remove(old.map((f) => `${opts.userId}/${f.name}`));
  }
  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: opts.mime, upsert: true });
  if (upErr) throw new Error(upErr.message);
  const upsertPayload = { user_id: opts.userId, [opts.column]: path } as never;
  await supabaseAdmin.from("pdf_branding").upsert(upsertPayload, { onConflict: "user_id" });
  return path;
}

async function removeAssetGeneric(opts: {
  userId: string;
  prefix: "pagebg" | "watermark";
  column: "page_bg_image_path" | "watermark_image_path";
}) {
  const { data: existing } = await supabaseAdmin.storage
    .from(BUCKET)
    .list(opts.userId, { limit: 200 });
  const old = (existing ?? []).filter((f) => f.name.startsWith(`${opts.prefix}-`));
  if (old.length) {
    await supabaseAdmin.storage
      .from(BUCKET)
      .remove(old.map((f) => `${opts.userId}/${f.name}`));
  }
  const upsertPayload = { user_id: opts.userId, [opts.column]: null } as never;
  await supabaseAdmin.from("pdf_branding").upsert(upsertPayload, { onConflict: "user_id" });
}

const AssetInput = z.object({
  base64: z.string().min(20),
  mime: z.enum(["image/png", "image/jpeg"]),
});

export const uploadPageBgImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => AssetInput.parse(d))
  .handler(async ({ data, context }) => {
    const path = await uploadAssetGeneric({
      userId: context.userId,
      base64: data.base64, mime: data.mime,
      prefix: "pagebg", maxBytes: 3 * 1024 * 1024,
      column: "page_bg_image_path",
    });
    return { path, signedUrl: await getSignedUrl(path) };
  });

export const removePageBgImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await removeAssetGeneric({
      userId: context.userId,
      prefix: "pagebg", column: "page_bg_image_path",
    });
    return { ok: true as const };
  });

export const uploadWatermarkImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => AssetInput.parse(d))
  .handler(async ({ data, context }) => {
    const path = await uploadAssetGeneric({
      userId: context.userId,
      base64: data.base64, mime: data.mime,
      prefix: "watermark", maxBytes: 1 * 1024 * 1024,
      column: "watermark_image_path",
    });
    return { path, signedUrl: await getSignedUrl(path) };
  });

export const removeWatermarkImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await removeAssetGeneric({
      userId: context.userId,
      prefix: "watermark", column: "watermark_image_path",
    });
    return { ok: true as const };
  });

/**
 * Verifica se o branding deve ser aplicado a um determinado módulo de PDF.
 * Use as chaves: 'tarot' | 'kabbalah' | 'numerology' | 'astrology' |
 * 'kabbalah_numerology' | 'energy_calendar' | 'weekly' | 'personality' |
 * 'love' | 'career' | 'spiritual'.
 */
export function isBrandingEnabledFor(
  row: Record<string, unknown> | null | undefined,
  kind:
    | "tarot"
    | "kabbalah"
    | "numerology"
    | "astrology"
    | "kabbalah_numerology"
    | "energy_calendar"
    | "weekly"
    | "personality"
    | "love"
    | "career"
    | "spiritual",
): boolean {
  if (!row || !(row.enabled as boolean)) return false;
  const key = `enabled_${kind}`;
  return (row[key] as boolean | undefined) ?? true;
}
