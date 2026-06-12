import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso restrito a administradores.");
}

export type PwaSettings = {
  id: string | null;
  name: string;
  short_name: string;
  description: string;
  theme_color: string;
  background_color: string;
  icon_url: string;
  icon_512_url: string;
  display: string;
  start_url: string;
  orientation: string;
  enabled: boolean;
};

const EMPTY: PwaSettings = {
  id: null,
  name: "Código Cósmico",
  short_name: "Cósmico",
  description: "Mapa Astral, Numerologia e IA Espiritual",
  theme_color: "#1a1430",
  background_color: "#0a0814",
  icon_url: "",
  icon_512_url: "",
  display: "standalone",
  start_url: "/",
  orientation: "portrait",
  enabled: true,
};

export const getPwaSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<PwaSettings> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("pwa_settings" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return EMPTY;
    const r = data as any;
    return {
      id: r.id,
      name: r.name,
      short_name: r.short_name,
      description: r.description,
      theme_color: r.theme_color,
      background_color: r.background_color,
      icon_url: r.icon_url || "",
      icon_512_url: r.icon_512_url || "",
      display: r.display,
      start_url: r.start_url,
      orientation: r.orientation,
      enabled: r.enabled,
    };
  },
);

const SaveSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(60),
  short_name: z.string().trim().min(1).max(20),
  description: z.string().trim().min(1).max(300),
  theme_color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (#RRGGBB)"),
  background_color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (#RRGGBB)"),
  icon_url: z.string().trim().url().or(z.literal("")),
  icon_512_url: z.string().trim().url().or(z.literal("")),
  display: z.enum(["standalone", "fullscreen", "minimal-ui", "browser"]),
  start_url: z.string().trim().min(1).max(200),
  orientation: z.enum(["any", "portrait", "landscape"]),
  enabled: z.boolean(),
});

export const savePwaSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      name: data.name,
      short_name: data.short_name,
      description: data.description,
      theme_color: data.theme_color,
      background_color: data.background_color,
      icon_url: data.icon_url,
      icon_512_url: data.icon_512_url,
      display: data.display,
      start_url: data.start_url,
      orientation: data.orientation,
      enabled: data.enabled,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("pwa_settings" as any)
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: existing } = await supabaseAdmin
      .from("pwa_settings" as any)
      .select("id")
      .limit(1)
      .maybeSingle();
    if (existing && (existing as any).id) {
      const id = (existing as any).id as string;
      const { error } = await supabaseAdmin
        .from("pwa_settings" as any)
        .update(payload)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("pwa_settings" as any)
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (row as any).id as string };
  });
