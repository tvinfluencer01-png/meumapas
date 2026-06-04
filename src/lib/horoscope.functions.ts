import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

export const SUN_SIGNS = [
  "Áries", "Touro", "Gêmeos", "Câncer", "Leão", "Virgem",
  "Libra", "Escorpião", "Sagitário", "Capricórnio", "Aquário", "Peixes",
] as const;

export const getMyHoroscopeSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const [{ data: sub }, { data: addon }, { data: birth }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from("horoscope_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("user_subscriptions")
        .select("status, current_period_end")
        .eq("user_id", userId)
        .eq("addon_id", "sub_daily_horoscope")
        .eq("status", "active")
        .maybeSingle(),
      supabaseAdmin
        .from("birth_data")
        .select("full_name")
        .eq("user_id", userId)
        .eq("is_primary", true)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("phone")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);

    return {
      addonActive: !!addon,
      sub: sub ?? null,
      defaults: {
        email: user?.email ?? null,
        phone_e164: profile?.phone ?? null,
        full_name: birth?.full_name ?? null,
      },
    };
  });

const UpdateSchema = z.object({
  enabled: z.boolean(),
  channel_email: z.boolean(),
  channel_whatsapp: z.boolean(),
  sun_sign: z.enum(SUN_SIGNS),
  email: z.string().email().nullable().optional(),
  phone_e164: z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/, "Telefone em formato internacional (ex: +5511999998888)")
    .nullable()
    .optional(),
});

export const updateMyHoroscopeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: addon } = await supabaseAdmin
      .from("user_subscriptions")
      .select("status")
      .eq("user_id", userId)
      .eq("addon_id", "sub_daily_horoscope")
      .eq("status", "active")
      .maybeSingle();
    if (!addon) {
      throw new Error("Ative o add-on Horóscopo Diário para configurar entregas.");
    }

    const { error } = await supabaseAdmin
      .from("horoscope_subscriptions")
      .upsert({
        user_id: userId,
        enabled: data.enabled,
        channel_email: data.channel_email,
        channel_whatsapp: data.channel_whatsapp,
        sun_sign: data.sun_sign,
        email: data.email ?? null,
        phone_e164: data.phone_e164 ?? null,
        send_hour_utc: 10,
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
