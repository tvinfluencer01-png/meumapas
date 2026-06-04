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

const TestSchema = z.object({
  sun_sign: z.enum(SUN_SIGNS),
  phone_e164: z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/, "Telefone em formato internacional (ex: +5511999998888)"),
});

export const sendTestHoroscopeWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => TestSchema.parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    const { data: addon } = await supabaseAdmin
      .from("user_subscriptions")
      .select("status")
      .eq("user_id", userId)
      .eq("addon_id", "sub_daily_horoscope")
      .eq("status", "active")
      .maybeSingle();
    if (!addon) throw new Error("Ative o add-on Horóscopo Diário para enviar teste.");

    const { data: evo } = await (supabaseAdmin as any)
      .from("evolution_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    const evoReady =
      evo?.enabled && evo?.base_url && evo?.global_api_key && evo?.instance_name;

    const { data: twilio } = await supabaseAdmin
      .from("twilio_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    const twilioReady =
      twilio?.enabled && twilio.account_sid && twilio.auth_token && twilio.whatsapp_from;

    if (!evoReady && !twilioReady) {
      throw new Error("Nenhum provedor WhatsApp configurado (Evolution ou Twilio).");
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente.");
    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider.chatModel("google/gemini-2.5-flash");

    const today = new Date().toISOString().slice(0, 10);
    const prompt = `Escreva um horóscopo PERSONALIZADO em pt-BR para hoje (${today}) para o signo ${data.sun_sign}.
Inclua, em até 6 linhas curtas e claras:
- 💛 Amor:
- 💼 Trabalho:
- ⚡ Energia:
- 🌟 Conselho do dia:
Tom inspirador, simbólico mas prático. Não use markdown, apenas emojis e quebras de linha.`;

    let body = "";
    try {
      const { text } = await generateText({ model, prompt, temperature: 0.85 });
      body = text.trim();
    } catch (e: any) {
      throw new Error("Falha ao gerar horóscopo: " + (e?.message ?? String(e)));
    }

    const message = `🧪 TESTE — Horóscopo de hoje — ${data.sun_sign}\n\n${body}\n\n— Cosmic AI`;

    if (evoReady) {
      const base = String(evo.base_url).replace(/\/+$/, "");
      const url = `${base}/message/sendText/${encodeURIComponent(evo.instance_name)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { apikey: evo.global_api_key, "Content-Type": "application/json" },
        body: JSON.stringify({
          number: data.phone_e164.replace(/\D+/g, ""),
          text: message,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        await supabaseAdmin.from("horoscope_log").insert({
          user_id: userId, date: today, channel: "whatsapp", status: "error",
          detail: `test evo HTTP ${res.status}: ${t.slice(0, 180)}`, sign: data.sun_sign,
        });
        throw new Error(`Evolution falhou (${res.status}): ${t.slice(0, 200)}`);
      }
      await supabaseAdmin.from("horoscope_log").insert({
        user_id: userId, date: today, channel: "whatsapp", status: "sent",
        detail: "test evolution", sign: data.sun_sign,
      });
      return { ok: true, provider: "evolution" };
    }

    const form = new URLSearchParams();
    form.set("From", `whatsapp:${twilio!.whatsapp_from}`);
    form.set("To", `whatsapp:${data.phone_e164}`);
    form.set("Body", message);
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilio!.account_sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${twilio!.account_sid}:${twilio!.auth_token}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );
    if (!res.ok) {
      const t = await res.text();
      await supabaseAdmin.from("horoscope_log").insert({
        user_id: userId, date: today, channel: "whatsapp", status: "error",
        detail: `test twilio HTTP ${res.status}: ${t.slice(0, 180)}`, sign: data.sun_sign,
      });
      throw new Error(`Twilio falhou (${res.status}): ${t.slice(0, 200)}`);
    }
    await supabaseAdmin.from("horoscope_log").insert({
      user_id: userId, date: today, channel: "whatsapp", status: "sent",
      detail: "test twilio", sign: data.sun_sign,
    });
    return { ok: true, provider: "twilio" };
  });
