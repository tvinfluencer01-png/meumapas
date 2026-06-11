import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LandingPackage = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  price_label: string | null;
  sub_label: string;
  anchor: string | null;
  features: string[];
  included_addons: string[];
  cta_label: string;
  featured: boolean;
  enabled: boolean;
  sort_order: number;
};

function normalize(row: any): LandingPackage {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    price_cents: row.price_cents ?? 0,
    price_label: row.price_label ?? null,
    sub_label: row.sub_label ?? "/ mês",
    anchor: row.anchor ?? null,
    features: Array.isArray(row.features) ? row.features.map(String) : [],
    included_addons: Array.isArray(row.included_addons) ? row.included_addons.map(String) : [],
    cta_label: row.cta_label ?? "Ascender",
    featured: !!row.featured,
    enabled: !!row.enabled,
    sort_order: row.sort_order ?? 0,
  };
}

/** Public — used by landing page (anon allowed via RLS for enabled rows). */
export const listPublicLandingPackages = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("landing_packages")
      .select("*")
      .eq("enabled", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(normalize);
  },
);

/** Admin — list ALL packages (including disabled). */
export const listAdminLandingPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Acesso restrito.");
    const { data, error } = await supabaseAdmin
      .from("landing_packages")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(normalize);
  });

const UpsertSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9_-]+$/, "Use apenas letras minúsculas, números, hífen ou underline."),
  name: z.string().trim().min(1).max(120),
  price_cents: z.number().int().min(0).max(10_000_000),
  price_label: z.string().trim().max(40).nullable().optional(),
  sub_label: z.string().trim().max(40).default("/ mês"),
  anchor: z.string().trim().max(80).nullable().optional(),
  features: z.array(z.string().trim().min(1).max(240)).max(20),
  included_addons: z.array(z.string().trim().min(1).max(64)).max(30),
  cta_label: z.string().trim().min(1).max(60).default("Ascender"),
  featured: z.boolean().default(false),
  enabled: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const upsertLandingPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Acesso restrito.");

    const payload: any = {
      slug: data.slug,
      name: data.name,
      price_cents: data.price_cents,
      price_label: data.price_label ?? null,
      sub_label: data.sub_label || "/ mês",
      anchor: data.anchor ?? null,
      features: data.features,
      included_addons: data.included_addons,
      cta_label: data.cta_label,
      featured: data.featured,
      enabled: data.enabled,
      sort_order: data.sort_order,
    };

    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("landing_packages")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return normalize(row);
    } else {
      const { data: row, error } = await supabaseAdmin
        .from("landing_packages")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return normalize(row);
    }
  });

export const deleteLandingPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Acesso restrito.");
    const { error } = await supabaseAdmin
      .from("landing_packages")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
