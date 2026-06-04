import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SUBSCRIPTION_ADDONS } from "./addons.catalog";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso restrito a administradores.");
}

export type AddonOverride = {
  addon_id: string;
  name: string | null;
  description: string | null;
  features: string[];
  price_cents: number | null;
  prompt: string | null;
  enabled: boolean;
  updated_at: string | null;
};

export type AddonRow = {
  addon_id: string;
  defaults: {
    name: string;
    description: string;
    features: string[];
    price_cents: number;
    highlight?: boolean;
  };
  override: AddonOverride | null;
  effective: {
    name: string;
    description: string;
    features: string[];
    price_cents: number;
    prompt: string | null;
    enabled: boolean;
  };
};

export const listAdminAddons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("addon_settings")
      .select("*");
    if (error) throw new Error(error.message);
    const byId = new Map<string, any>((rows ?? []).map((r: any) => [r.addon_id, r]));

    const result: AddonRow[] = SUBSCRIPTION_ADDONS.map((d) => {
      const r = byId.get(d.id);
      const override: AddonOverride | null = r
        ? {
            addon_id: r.addon_id,
            name: r.name,
            description: r.description,
            features: Array.isArray(r.features) ? r.features : [],
            price_cents: r.price_cents,
            prompt: r.prompt,
            enabled: r.enabled,
            updated_at: r.updated_at,
          }
        : null;
      return {
        addon_id: d.id,
        defaults: {
          name: d.name,
          description: d.description,
          features: d.features,
          price_cents: d.price_cents,
          highlight: d.highlight,
        },
        override,
        effective: {
          name: override?.name ?? d.name,
          description: override?.description ?? d.description,
          features:
            override?.features && override.features.length > 0
              ? override.features
              : d.features,
          price_cents: override?.price_cents ?? d.price_cents,
          prompt: override?.prompt ?? null,
          enabled: override?.enabled ?? true,
        },
      };
    });
    return result;
  });

const UpsertSchema = z.object({
  addon_id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(120).nullable().optional(),
  description: z.string().trim().min(1).max(1000).nullable().optional(),
  features: z.array(z.string().trim().min(1).max(240)).max(20).optional(),
  price_cents: z.number().int().min(0).max(10_000_000).nullable().optional(),
  prompt: z.string().trim().max(8000).nullable().optional(),
  enabled: z.boolean().optional(),
});

export const upsertAdminAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (!SUBSCRIPTION_ADDONS.some((a) => a.id === data.addon_id)) {
      throw new Error("Add-on inválido.");
    }
    const payload: any = {
      addon_id: data.addon_id,
      updated_by: context.userId,
    };
    if (data.name !== undefined) payload.name = data.name;
    if (data.description !== undefined) payload.description = data.description;
    if (data.features !== undefined) payload.features = data.features;
    if (data.price_cents !== undefined) payload.price_cents = data.price_cents;
    if (data.prompt !== undefined) payload.prompt = data.prompt;
    if (data.enabled !== undefined) payload.enabled = data.enabled;

    const { error } = await supabaseAdmin
      .from("addon_settings")
      .upsert(payload, { onConflict: "addon_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetAdminAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ addon_id: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("addon_settings")
      .delete()
      .eq("addon_id", data.addon_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Server-side helper: returns the effective addon (catalog merged with DB override). */
export async function getEffectiveAddon(addon_id: string) {
  const def = SUBSCRIPTION_ADDONS.find((a) => a.id === addon_id);
  if (!def) return null;
  const { data: r } = await supabaseAdmin
    .from("addon_settings")
    .select("*")
    .eq("addon_id", addon_id)
    .maybeSingle();
  return {
    name: (r as any)?.name ?? def.name,
    description: (r as any)?.description ?? def.description,
    features:
      Array.isArray((r as any)?.features) && (r as any).features.length > 0
        ? ((r as any).features as string[])
        : def.features,
    price_cents: (r as any)?.price_cents ?? def.price_cents,
    prompt: ((r as any)?.prompt as string | null) ?? null,
    enabled: (r as any)?.enabled ?? true,
  };
}

/** Returns the override prompt for an addon, or null when unset. */
export async function getAddonPromptOverride(addon_id: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("addon_settings")
    .select("prompt")
    .eq("addon_id", addon_id)
    .maybeSingle();
  const p = (data as any)?.prompt as string | null | undefined;
  return p && p.trim().length > 0 ? p : null;
}
