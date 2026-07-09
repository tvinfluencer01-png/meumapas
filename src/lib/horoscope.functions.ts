import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { runWithProviderFallback } from "@/lib/ai-resolver.server";

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

// Paleta ampla de cores da sorte (evita repetição entre signos/dias)
const LUCKY_COLORS = [
  "Vermelho rubi", "Carmim", "Coral", "Laranja queimado", "Âmbar",
  "Dourado", "Amarelo solar", "Verde-limão", "Verde esmeralda", "Verde jade",
  "Turquesa", "Ciano", "Azul-céu", "Azul royal", "Azul marinho",
  "Índigo", "Violeta", "Lilás", "Magenta", "Rosa-pink",
  "Rosa-quartzo", "Pêssego", "Bordô", "Cobre", "Bronze",
  "Prata", "Cinza-chumbo", "Branco-pérola", "Preto-ônix", "Marrom-café",
];

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Calcula número (1-99) e cor da sorte de forma determinística baseando-se
 * em data de nascimento + signo + data de hoje. Garante variedade diária e
 * personalização por mapa do contexto ativo.
 */
export function computeLuckyForDay(
  birthDate: string | null | undefined,
  sunSign: string,
  today: string,
): { number: number; color: string } {
  const seed = `${birthDate ?? "anon"}|${sunSign}|${today}`;
  const h = hashStr(seed);
  const number = (h % 99) + 1;
  const color = LUCKY_COLORS[(h >>> 8) % LUCKY_COLORS.length];
  return { number, color };
}

// Ângulos/temas para garantir variedade diária — cada dia o astrologo
// escolhe um foco distinto que não repete em ~30 dias.
const DAILY_THEMES = [
  "trânsito da Lua sobre uma casa específica do nativo",
  "aspecto exato da Lua com um planeta natal",
  "ingresso/posição do Sol em relação ao Ascendente",
  "Mercúrio e a comunicação prática do dia",
  "Vênus e gestos de afeto/estética",
  "Marte e onde investir energia hoje",
  "Júpiter e oportunidades de expansão",
  "Saturno e responsabilidades a honrar",
  "Urano e quebras de rotina inesperadas",
  "Netuno e intuição/sonhos",
  "Plutão e transformações profundas",
  "regente do dia da semana e seu recado",
  "fase da Lua atual e como surfá-la",
  "nodo lunar e missão kármica do dia",
  "Quíron e cura emocional",
  "elemento dominante do dia (fogo/terra/ar/água)",
  "casa astrológica em destaque para hoje",
  "aspecto desafiador a ressignificar",
  "trígono harmônico a aproveitar",
  "energia da estação astrológica corrente",
];

function pickThemesForDay(seedKey: string, count = 2): string[] {
  const h = hashStr(seedKey);
  const out: string[] = [];
  const used = new Set<number>();
  let i = 0;
  while (out.length < count && i < 32) {
    const idx = (h + i * 2654435761) % DAILY_THEMES.length;
    if (!used.has(idx)) {
      used.add(idx);
      out.push(DAILY_THEMES[idx]);
    }
    i++;
  }
  return out;
}

type ChartSummary = {
  fullName?: string | null;
  birthDate?: string | null;
  birthTime?: string | null;
  birthCity?: string | null;
  sunSign?: string | null;
  ascendant?: string | null;
  moonSign?: string | null;
  topPlanets?: string | null; // ex: "Sol em Leão (casa 5), Lua em Peixes (casa 12)"
  recentThemes?: string[]; // temas já usados nos últimos dias, a EVITAR
};

export function buildHoroscopePrompt(
  sunSign: string,
  today: string,
  lucky?: { number: number; color: string },
  chart?: ChartSummary,
) {
  const luckyLine = lucky
    ? `Número: ${lucky.number} | Cor: ${lucky.color}`
    : `Número: (1-99) | Cor: (cor)`;
  const luckyRule = lucky
    ? `\n\nIMPORTANTE: na seção "🎯 Número e cor da sorte", use EXATAMENTE: "${luckyLine}". Não invente outros valores.`
    : "";

  const seedKey = `${chart?.birthDate ?? "anon"}|${sunSign}|${today}`;
  const themes = pickThemesForDay(seedKey, 2);
  const avoid = (chart?.recentThemes ?? []).slice(0, 10);

  const personLine = chart?.fullName ? `Nativo: ${chart.fullName}.` : "";
  const birthLine = chart?.birthDate
    ? `Nascimento: ${chart.birthDate}${chart.birthTime ? " às " + chart.birthTime : ""}${chart.birthCity ? " em " + chart.birthCity : ""}.`
    : "";
  const chartLine = [
    chart?.sunSign ? `Sol em ${chart.sunSign}` : null,
    chart?.moonSign ? `Lua em ${chart.moonSign}` : null,
    chart?.ascendant ? `Ascendente ${chart.ascendant}` : null,
  ].filter(Boolean).join(" · ");
  const planetsLine = chart?.topPlanets ? `Posições natais relevantes: ${chart.topPlanets}.` : "";
  const avoidLine = avoid.length
    ? `\n\nEVITE repetir os ângulos já usados recentemente: ${avoid.join("; ")}. Traga uma leitura COMPLETAMENTE diferente.`
    : "";

  return `Você é um(a) astrólogo(a) sênior. Escreva o horóscopo de HOJE (${today}) ÚNICO, específico e não-genérico para ${sunSign}.

Contexto do nativo:
${personLine}
${birthLine}
${chartLine ? "Mapa: " + chartLine + "." : ""}
${planetsLine}

Ancore a leitura de hoje em DOIS ângulos astrológicos OBRIGATÓRIOS e distintos:
1) ${themes[0]}
2) ${themes[1]}
Use linguagem astrológica real (planeta, signo, casa, aspecto, fase lunar) — não vagueza motivacional.

Formato obrigatório (use exatamente estes títulos com emojis, sem markdown, apenas texto puro com quebras de linha):

🌅 Visão geral do dia
(2 linhas conectando os 2 ângulos acima à vida prática do nativo)

💛 Amor & Relacionamentos
✨ Faça: (1 linha — ação concreta hoje, ligada ao ângulo astrológico)
⚠️ Evite: (1 linha — atitude específica a não tomar)

💰 Dinheiro & Carreira
✨ Faça: (1 linha — ação concreta hoje)
⚠️ Evite: (1 linha — atitude específica a não tomar)

🌿 Saúde & Bem-estar
✨ Faça: (1 linha — prática específica hoje)
⚠️ Evite: (1 linha — hábito a evitar)

⚡ Energia do dia
(1 linha — nível de energia e onde canalizá-la, citando planeta/casa)

🌟 Conselho cósmico
(1 frase original, sem clichês como "confie no universo" ou "abrace as mudanças")

🎯 Número e cor da sorte
${luckyLine}

Regras rígidas:
- NUNCA use frases genéricas reutilizáveis para qualquer signo. Cada linha deve fazer sentido apenas para ${sunSign} hoje.
- PROIBIDO: "confie no universo", "abrace as mudanças", "energia positiva", "siga seu coração", "tudo flui", "respire fundo e siga", "o universo conspira".
- Sem markdown (sem **, ##, -). Apenas emojis e quebras de linha.
- Tom inspirador, simbólico, mas concreto e acionável.${avoidLine}${luckyRule}`;
}

/** Coleta um resumo do mapa natal do nativo (quando existir) para enriquecer o prompt. */
export async function loadChartSummaryForHoroscope(
  userId: string,
  clientProfileId: string | null,
  birthDate: string | null,
  fullName: string | null,
  sunSign: string,
): Promise<ChartSummary> {
  // Carrega birth_data completo (hora/cidade) para contexto
  let birthTime: string | null = null;
  let birthCity: string | null = null;
  if (clientProfileId) {
    const { data } = await supabaseAdmin
      .from("client_profiles")
      .select("birth_time, city")
      .eq("id", clientProfileId)
      .maybeSingle();
    birthTime = (data?.birth_time as string | null) ?? null;
    birthCity = (data?.city as string | null) ?? null;
  } else {
    const { data } = await supabaseAdmin
      .from("birth_data")
      .select("birth_time, city")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .maybeSingle();
    birthTime = (data?.birth_time as string | null) ?? null;
    birthCity = (data?.city as string | null) ?? null;
  }

  // Carrega o mapa astral, se houver
  let chartQ = supabaseAdmin
    .from("astro_charts")
    .select("planets, ascendant")
    .eq("user_id", userId);
  chartQ = clientProfileId
    ? chartQ.eq("client_profile_id", clientProfileId)
    : chartQ.is("client_profile_id", null);
  const { data: chart } = await chartQ.order("created_at", { ascending: false }).limit(1).maybeSingle();

  let moonSign: string | null = null;
  let ascendant: string | null = null;
  let topPlanets: string | null = null;
  if (chart) {
    const planets = Array.isArray(chart.planets) ? (chart.planets as any[]) : [];
    const moon = planets.find((p) => /lua|moon/i.test(p?.name ?? ""));
    if (moon?.sign) moonSign = String(moon.sign);
    if (chart.ascendant != null) ascendant = String(chart.ascendant);
    const main = ["Sol","Lua","Mercúrio","Vênus","Marte","Júpiter","Saturno"];
    topPlanets = planets
      .filter((p) => main.includes(String(p?.name)))
      .slice(0, 7)
      .map((p) => `${p.name} em ${p.sign ?? "?"}${p.house ? ` (casa ${p.house})` : ""}`)
      .join(", ") || null;
  }

  // Coleta temas já usados nos últimos 14 dias para evitar repetição
  const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const { data: recent } = await supabaseAdmin
    .from("horoscope_log")
    .select("date, detail")
    .eq("user_id", userId)
    .gte("date", since)
    .eq("channel", "ai_theme");
  const recentThemes = (recent ?? [])
    .map((r) => r.detail)
    .filter(Boolean) as string[];

  return {
    fullName,
    birthDate,
    birthTime,
    birthCity,
    sunSign,
    ascendant,
    moonSign,
    topPlanets,
    recentThemes,
  };
}

/** Retorna os temas escolhidos para o dia (para registrar e evitar repetição futura). */
export function themesForDay(birthDate: string | null, sunSign: string, today: string): string[] {
  return pickThemesForDay(`${birthDate ?? "anon"}|${sunSign}|${today}`, 2);
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
  frequency: z.enum(["daily", "weekly", "alternate"]).default("daily"),
  send_local_hour: z.number().int().min(0).max(23).default(7),
  send_local_minute: z.number().int().min(0).max(59).default(0),
  send_weekday: z.number().int().min(0).max(6).nullable().optional(),
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

    // BRT = UTC-3 (sem horário de verão no Brasil atualmente)
    const sendHourUtc = (data.send_local_hour + 3) % 24;

    const payload = {
      user_id: userId,
      client_profile_id: ctx.clientProfileId,
      enabled: data.enabled,
      channel_email: data.channel_email,
      channel_whatsapp: data.channel_whatsapp,
      sun_sign: sign,
      email: data.email ?? null,
      phone_e164: data.phone_e164 ?? null,
      send_hour_utc: sendHourUtc,
      frequency: data.frequency,
      send_local_hour: data.send_local_hour,
      send_local_minute: data.send_local_minute,
      send_weekday: data.frequency === "weekly" ? (data.send_weekday ?? 1) : null,
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

    const { getAddonPromptOverride } = await import("./addon-settings.functions");
    const override = await getAddonPromptOverride("sub_daily_horoscope");
    const today = new Date().toISOString().slice(0, 10);
    const lucky = computeLuckyForDay(ctx.birthDate, sign, today);
    const chartSummary = await loadChartSummaryForHoroscope(
      userId,
      ctx.clientProfileId,
      ctx.birthDate,
      ctx.fullName,
      sign,
    );
    const themes = themesForDay(ctx.birthDate, sign, today);
    const prompt = override
      ? override
          .replace(/\{\{sign\}\}/gi, sign)
          .replace(/\{\{date\}\}/gi, today)
          .replace(/\{\{lucky_number\}\}/gi, String(lucky.number))
          .replace(/\{\{lucky_color\}\}/gi, lucky.color) +
        `\n\nÂngulos astrológicos obrigatórios de hoje: 1) ${themes[0]}; 2) ${themes[1]}. EVITE temas usados recentemente: ${(chartSummary.recentThemes ?? []).join("; ") || "—"}.\n\nIMPORTANTE: na seção "🎯 Número e cor da sorte", use EXATAMENTE: "Número: ${lucky.number} | Cor: ${lucky.color}". Não invente outros valores.`
      : buildHoroscopePrompt(sign, today, lucky, chartSummary);

    let body = "";
    try {
      const { result } = await runWithProviderFallback(
        supabaseAdmin, userId,
        async (model) => {
          const { text } = await generateText({
            model, prompt, temperature: 1.0, topP: 0.95, seed: hashStr(`${userId}|${today}`),
          });
          if (!text?.trim()) throw new Error("empty");
          return text.trim();
        },
        { addonId: "sub_astrologer_numerologist" },
      );
      body = result;
    } catch (e: any) {
      throw new Error("Falha ao gerar horóscopo: " + (e?.message ?? String(e)));
    }

    // Registra os temas do dia para evitar repetição em execuções futuras
    for (const t of themes) {
      await supabaseAdmin.from("horoscope_log").insert({
        user_id: userId, date: today, channel: "ai_theme", status: "ok",
        detail: t, sign,
      });
    }


    const who = ctx.fullName ? ` (${ctx.fullName})` : "";
    const { pickMarketingFooter } = await import("./marketing.functions");
    const footer = await pickMarketingFooter("horoscope_daily");
    const message = `🧪 TESTE — Horóscopo de hoje — ${sign}${who}\n\n${body}\n\n${footer}`;

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
