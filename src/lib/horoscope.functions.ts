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
export type SunSign = (typeof SUN_SIGNS)[number];

/** Determina o signo solar a partir de uma data de nascimento (ISO yyyy-mm-dd). */
export function sunSignFromBirthDate(birthDate: string | null | undefined): SunSign | null {
  if (!birthDate) return null;
  const d = new Date(birthDate + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const k = m * 100 + day;
  if (k >= 321 && k <= 419) return "Áries";
  if (k >= 420 && k <= 520) return "Touro";
  if (k >= 521 && k <= 620) return "Gêmeos";
  if (k >= 621 && k <= 722) return "Câncer";
  if (k >= 723 && k <= 822) return "Leão";
  if (k >= 823 && k <= 922) return "Virgem";
  if (k >= 923 && k <= 1022) return "Libra";
  if (k >= 1023 && k <= 1121) return "Escorpião";
  if (k >= 1122 && k <= 1221) return "Sagitário";
  if (k >= 1222 || k <= 119) return "Capricórnio";
  if (k >= 120 && k <= 218) return "Aquário";
  return "Peixes";
}

export function buildHoroscopePrompt(sunSign: string, today: string) {
  return `Escreva um horóscopo PERSONALIZADO, rico e inspirador em pt-BR para hoje (${today}) para o signo ${sunSign}.

Formato obrigatório (use exatamente estes títulos com emojis, sem markdown, apenas texto puro com quebras de linha):

🌅 Visão geral do dia
(2 linhas curtas descrevendo a energia astrológica do dia para ${sunSign})

💛 Amor & Relacionamentos
✨ Faça: (1 linha — ação concreta recomendada)
⚠️ Evite: (1 linha — atitude a não tomar)

💰 Dinheiro & Carreira
✨ Faça: (1 linha — ação concreta recomendada)
⚠️ Evite: (1 linha — atitude a não tomar)

🌿 Saúde & Bem-estar
✨ Faça: (1 linha — prática recomendada hoje)
⚠️ Evite: (1 linha — hábito a evitar)

⚡ Energia do dia
(1 linha — nível de energia e como canalizá-la)

🌟 Conselho cósmico
(1 frase poderosa e prática para guiar o dia)

🎯 Número e cor da sorte
Número: (1-99) | Cor: (cor)

Regras: tom inspirador, simbólico mas prático e acionável. Nada de markdown (sem **, ##, -). Use apenas emojis e quebras de linha. Seja específico — evite frases genéricas.`;
}

/**
 * Resolve o "contexto ativo" do usuário: usa o client_profile ativo, se houver;
 * caso contrário, recai para o birth_data primário do próprio usuário.
 */
async function resolveActiveContext(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("active_client_profile_id, phone")
    .eq("id", userId)
    .maybeSingle();

  const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);

  const activeId = profile?.active_client_profile_id ?? null;

  if (activeId) {
    const { data: cp } = await supabaseAdmin
      .from("client_profiles")
      .select("id, full_name, birth_date, email, phone")
      .eq("id", activeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (cp) {
      return {
        clientProfileId: cp.id as string,
        fullName: cp.full_name as string,
        birthDate: cp.birth_date as string,
        email: (cp.email as string | null) ?? user?.email ?? null,
        phone: (cp.phone as string | null) ?? profile?.phone ?? null,
        kind: "client" as const,
      };
    }
  }

  const { data: bd } = await supabaseAdmin
    .from("birth_data")
    .select("full_name, birth_date")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();

  return {
    clientProfileId: null,
    fullName: (bd?.full_name as string | null) ?? null,
    birthDate: (bd?.birth_date as string | null) ?? null,
    email: user?.email ?? null,
    phone: profile?.phone ?? null,
    kind: "self" as const,
  };
}

export const getMyHoroscopeSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;

    const [{ data: addon }, ctx] = await Promise.all([
      supabaseAdmin
        .from("user_subscriptions")
        .select("status, current_period_end")
        .eq("user_id", userId)
        .eq("addon_id", "sub_daily_horoscope")
        .eq("status", "active")
        .maybeSingle(),
      resolveActiveContext(userId),
    ]);

    const detectedSign = sunSignFromBirthDate(ctx.birthDate);

    let q = supabaseAdmin
      .from("horoscope_subscriptions")
      .select("*")
      .eq("user_id", userId);
    q = ctx.clientProfileId
      ? q.eq("client_profile_id", ctx.clientProfileId)
      : q.is("client_profile_id", null);
    const { data: sub } = await q.maybeSingle();

    return {
      addonActive: !!addon,
      sub: sub ?? null,
      context: {
        kind: ctx.kind,
        clientProfileId: ctx.clientProfileId,
        fullName: ctx.fullName,
        birthDate: ctx.birthDate,
        detectedSign,
      },
      defaults: {
        email: ctx.email,
        phone_e164: ctx.phone,
        full_name: ctx.fullName,
      },
    };
  });

const UpdateSchema = z.object({
  enabled: z.boolean(),
  channel_email: z.boolean(),
  channel_whatsapp: z.boolean(),
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

    const ctx = await resolveActiveContext(userId);
    const sign = sunSignFromBirthDate(ctx.birthDate);
    if (!sign) {
      throw new Error(
        "Cadastre a data de nascimento no contexto ativo para detectar o signo automaticamente.",
      );
    }

    const payload = {
      user_id: userId,
      client_profile_id: ctx.clientProfileId,
      enabled: data.enabled,
      channel_email: data.channel_email,
      channel_whatsapp: data.channel_whatsapp,
      sun_sign: sign,
      email: data.email ?? null,
      phone_e164: data.phone_e164 ?? null,
      send_hour_utc: 10,
    };

    // Upsert manual: índice único usa COALESCE, então ON CONFLICT não funciona aqui.
    let q = supabaseAdmin
      .from("horoscope_subscriptions")
      .select("id")
      .eq("user_id", userId);
    q = ctx.clientProfileId
      ? q.eq("client_profile_id", ctx.clientProfileId)
      : q.is("client_profile_id", null);
    const { data: existing } = await q.maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("horoscope_subscriptions")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("horoscope_subscriptions")
        .insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true, sun_sign: sign, client_profile_id: ctx.clientProfileId };
  });

const TestSchema = z.object({
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

    const ctx = await resolveActiveContext(userId);
    const sign = sunSignFromBirthDate(ctx.birthDate);
    if (!sign) {
      throw new Error(
        "Cadastre a data de nascimento no contexto ativo para detectar o signo automaticamente.",
      );
    }

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

    const { getAddonPromptOverride } = await import("./addon-settings.functions");
    const override = await getAddonPromptOverride("sub_daily_horoscope");
    const today = new Date().toISOString().slice(0, 10);
    const prompt = override
      ? override.replace(/\{\{sign\}\}/gi, sign).replace(/\{\{date\}\}/gi, today)
      : buildHoroscopePrompt(sign, today);

    let body = "";
    try {
      const { text } = await generateText({ model, prompt, temperature: 0.85 });
      body = text.trim();
    } catch (e: any) {
      throw new Error("Falha ao gerar horóscopo: " + (e?.message ?? String(e)));
    }

    const who = ctx.fullName ? ` (${ctx.fullName})` : "";
    const message = `🧪 TESTE — Horóscopo de hoje — ${sign}${who}\n\n${body}\n\n— Código Cósmico`;

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
          detail: `test evo HTTP ${res.status}: ${t.slice(0, 180)}`, sign,
        });
        throw new Error(`Evolution falhou (${res.status}): ${t.slice(0, 200)}`);
      }
      await supabaseAdmin.from("horoscope_log").insert({
        user_id: userId, date: today, channel: "whatsapp", status: "sent",
        detail: "test evolution", sign,
      });
      return { ok: true, provider: "evolution", sun_sign: sign };
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
        detail: `test twilio HTTP ${res.status}: ${t.slice(0, 180)}`, sign,
      });
      throw new Error(`Twilio falhou (${res.status}): ${t.slice(0, 200)}`);
    }
    await supabaseAdmin.from("horoscope_log").insert({
      user_id: userId, date: today, channel: "whatsapp", status: "sent",
      detail: "test twilio", sign,
    });
    return { ok: true, provider: "twilio", sun_sign: sign };
  });
