import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BUCKET = "pdf-branding";
const MAX_BYTES = 500 * 1024; // 500KB

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
});

export const getPdfBranding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("pdf_branding")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    let signedLogoUrl: string | null = null;
    if (data?.logo_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(data.logo_path, 60 * 60);
      signedLogoUrl = signed?.signedUrl ?? null;
    }
    return { branding: data ?? null, signedLogoUrl };
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

    // Remove previous logo files for this user
    const { data: existing } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(userId, { limit: 100 });
    if (existing?.length) {
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove(existing.map((f) => `${userId}/${f.name}`));
    }

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.mime, upsert: true });
    if (upErr) throw new Error(upErr.message);

    // Ensure row exists; update logo_path
    await supabaseAdmin
      .from("pdf_branding")
      .upsert({ user_id: userId, logo_path: path }, { onConflict: "user_id" });

    const { data: signed } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60);
    return { path, signedUrl: signed?.signedUrl ?? null };
  });

export const removePdfLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: existing } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(userId, { limit: 100 });
    if (existing?.length) {
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove(existing.map((f) => `${userId}/${f.name}`));
    }
    await supabaseAdmin
      .from("pdf_branding")
      .upsert({ user_id: userId, logo_path: null }, { onConflict: "user_id" });
    return { ok: true };
  });
