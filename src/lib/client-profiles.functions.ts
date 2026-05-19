import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const ADDON_ID = "sub_astrologer_numerologist";

const ProfileInput = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().min(1).max(200),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birth_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  time_unknown: z.boolean().optional().default(false),
  city: z.string().min(1).max(200),
  country: z.string().max(200).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  timezone: z.string().max(100).nullable().optional(),
  email: z.string().email().max(200).nullable().optional().or(z.literal("")),
  phone: z.string().max(50).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional().default([]),
  notes: z.string().max(5000).nullable().optional(),
  avatar_url: z.string().url().max(500).nullable().optional().or(z.literal("")),
});

async function userHasAddon(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.rpc("has_active_addon", {
    _user_id: userId,
    _addon_id: ADDON_ID,
  });
  return !!data;
}

export const listClientProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const [{ data: profiles, error }, { data: prof }, hasAddon] = await Promise.all([
      supabaseAdmin
        .from("client_profiles")
        .select("*")
        .eq("user_id", userId)
        .order("full_name", { ascending: true }),
      supabaseAdmin
        .from("profiles")
        .select("active_client_profile_id")
        .eq("id", userId)
        .maybeSingle(),
      userHasAddon(userId),
    ]);
    if (error) throw new Error(error.message);
    return {
      profiles: profiles ?? [],
      active_client_profile_id: prof?.active_client_profile_id ?? null,
      has_addon: hasAddon,
    };
  });

export const upsertClientProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ProfileInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const hasAddon = await userHasAddon(userId);

    // Free tier: limite de 1 cliente. Com add-on: ilimitado.
    if (!data.id && !hasAddon) {
      const { count } = await supabaseAdmin
        .from("client_profiles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if ((count ?? 0) >= 1) {
        throw new Error(
          "Sem o add-on Astrólogo & Numerólogo você pode cadastrar apenas 1 cliente. Assine para clientes ilimitados.",
        );
      }
    }

    const payload = {
      user_id: userId,
      full_name: data.full_name.trim(),
      birth_date: data.birth_date,
      birth_time: data.time_unknown ? null : data.birth_time ?? null,
      time_unknown: !!data.time_unknown,
      city: data.city.trim(),
      country: data.country ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      timezone: data.timezone ?? null,
      email: data.email ? data.email : null,
      phone: data.phone ?? null,
      tags: data.tags ?? [],
      notes: data.notes ?? null,
      avatar_url: data.avatar_url ? data.avatar_url : null,
    };

    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("client_profiles")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { profile: row };
    }
    const { data: row, error } = await supabaseAdmin
      .from("client_profiles")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { profile: row };
  });

export const deleteClientProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Se for o ativo, limpa
    await supabaseAdmin
      .from("profiles")
      .update({ active_client_profile_id: null })
      .eq("id", userId)
      .eq("active_client_profile_id", data.id);
    const { error } = await supabaseAdmin
      .from("client_profiles")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setActiveClientProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (data.id) {
      // Garante que o cliente pertence ao usuário
      const { data: owned } = await supabaseAdmin
        .from("client_profiles")
        .select("id")
        .eq("id", data.id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!owned) throw new Error("Cliente não encontrado.");
    }
    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, active_client_profile_id: data.id }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true, active_client_profile_id: data.id };
  });
