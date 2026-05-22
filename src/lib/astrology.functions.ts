import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import * as Astro from "astronomy-engine";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import {
  consumeCredits,
  refundCredits,
  getCreditCost,
  hasUnlimitedAccess,
  type CreditAction,
} from "@/lib/credits.functions";
import { buildSimplePdf, type SimplePdfBlock } from "@/lib/simple-pdf";
import { safeParseLlmJson } from "@/lib/json-sanitize";
import { PLANET_MEANING, SIGN_MEANING, ASPECT_MEANING, SIGN_GUIDANCE } from "@/lib/astro-meanings";
import {
  resolveBrandingPayload,
  isBrandingEnabledFor,
} from "@/lib/pdf-branding.functions";

// Fire-and-forget structured error logger. Writes to app_logs via service role
// so failures are captured even when the user context is absent.
async function logFnError(
  fn: string,
  err: unknown,
  userId: string | null,
  extra: Record<string, unknown> = {},
) {
  try {
    const message = err instanceof Error ? err.message : String(err ?? "unknown");
    const stack = err instanceof Error ? err.stack ?? null : null;
    await supabaseAdmin.from("app_logs").insert({
      event: "serverfn_error",
      user_id: userId,
      payload: { fn, message, stack, ...extra },
    });
  } catch (logErr) {
    console.error("[logFnError] failed:", logErr);
  }
}

// --- date helpers ----------------------------------------------------------
function getWeekRange(reference = new Date()) {
  const d = new Date(reference);
  const day = d.getDay(); // 0 = domingo, 1 = segunda...
  const diffToMonday = (day + 6) % 7; // quantos dias para voltar à segunda
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function formatWeekRange(reference = new Date()) {
  const { monday, sunday } = getWeekRange(reference);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const start = monday.toLocaleDateString("pt-BR", opts);
  const end = sunday.toLocaleDateString("pt-BR", opts);
  return { start, end, monthLabel: monday.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) };
}

function formatMonthLabel(reference = new Date()) {
  return reference.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function formatYearLabel(reference = new Date()) {
  return String(reference.getFullYear());
}

// --- helpers --------------------------------------------------------------
const SIGNS = [
  "Áries", "Touro", "Gêmeos", "Câncer", "Leão", "Virgem",
  "Libra", "Escorpião", "Sagitário", "Capricórnio", "Aquário", "Peixes",
];

const PLANETS: { name: string; body: Astro.Body }[] = [
  { name: "Sol", body: Astro.Body.Sun },
  { name: "Lua", body: Astro.Body.Moon },
  { name: "Mercúrio", body: Astro.Body.Mercury },
  { name: "Vênus", body: Astro.Body.Venus },
  { name: "Marte", body: Astro.Body.Mars },
  { name: "Júpiter", body: Astro.Body.Jupiter },
  { name: "Saturno", body: Astro.Body.Saturn },
  { name: "Urano", body: Astro.Body.Uranus },
  { name: "Netuno", body: Astro.Body.Neptune },
  { name: "Plutão", body: Astro.Body.Pluto },
];

function signOf(lonDeg: number) {
  const lon = ((lonDeg % 360) + 360) % 360;
  const idx = Math.floor(lon / 30);
  return { sign: SIGNS[idx], degree: lon - idx * 30, longitude: lon };
}

// Equatorial -> ecliptic longitude (J2000 approx, refined enough for natal preview)
function eclipticLongitudeFromEqu(ra_hours: number, dec_deg: number, date: Date) {
  // Obliquity of date (low precision)
  const T = (date.getTime() / 86400000 + 2440587.5 - 2451545.0) / 36525;
  const eps = (23.4392911 - 0.0130042 * T) * Math.PI / 180;
  const ra = (ra_hours * 15) * Math.PI / 180;
  const dec = dec_deg * Math.PI / 180;
  const sinL = Math.sin(ra) * Math.cos(eps) + Math.tan(dec) * Math.sin(eps);
  const cosL = Math.cos(ra);
  let lon = Math.atan2(sinL, cosL) * 180 / Math.PI;
  if (lon < 0) lon += 360;
  return lon;
}

function computeAscendantMC(date: Date, lat: number, lon: number) {
  // Local sidereal time
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  gmst = ((gmst % 360) + 360) % 360;
  const lst = ((gmst + lon) % 360 + 360) % 360;
  const ramc = lst;
  const eps = (23.4392911 - 0.0130042 * T) * Math.PI / 180;
  const phi = lat * Math.PI / 180;
  const ramcRad = ramc * Math.PI / 180;

  const mc = (Math.atan2(Math.sin(ramcRad), Math.cos(ramcRad) * Math.cos(eps) - 0) * 180) / Math.PI;
  const mcLon = ((mc + 360) % 360);

  const asc =
    Math.atan2(
      -Math.cos(ramcRad),
      Math.sin(ramcRad) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps),
    ) * 180 / Math.PI;
  const ascLon = ((asc + 360) % 360);

  return { ascendant: ascLon, midheaven: mcLon };
}

function placidusHouses(asc: number, mc: number) {
  // Equal-house fallback from Asc; precise Placidus requires iterative solver.
  const houses: number[] = [];
  for (let i = 0; i < 12; i++) houses.push(((asc + i * 30) % 360 + 360) % 360);
  // Override the 10th with MC for visual accuracy
  houses[9] = mc;
  return houses;
}

const ASPECTS = [
  { name: "Conjunção", angle: 0, orb: 8 },
  { name: "Oposição", angle: 180, orb: 8 },
  { name: "Trígono", angle: 120, orb: 7 },
  { name: "Quadratura", angle: 90, orb: 7 },
  { name: "Sextil", angle: 60, orb: 5 },
];

function computeAspects(planets: { name: string; longitude: number }[]) {
  const out: { a: string; b: string; aspect: string; orb: number }[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const diff = Math.abs(planets[i].longitude - planets[j].longitude) % 360;
      const angle = diff > 180 ? 360 - diff : diff;
      for (const a of ASPECTS) {
        if (Math.abs(angle - a.angle) <= a.orb) {
          out.push({
            a: planets[i].name,
            b: planets[j].name,
            aspect: a.name,
            orb: Number(Math.abs(angle - a.angle).toFixed(2)),
          });
          break;
        }
      }
    }
  }
  return out;
}

// --- input schema ---------------------------------------------------------
const ChartInput = z.object({
  birthDataId: z.string().uuid().optional(),
  clientProfileId: z.string().uuid().nullable().optional(),
  fullName: z.string().min(1),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  timeUnknown: z.boolean().optional(),
  latitude: z.number(),
  longitude: z.number(),
  timezoneOffset: z.number().min(-14).max(14).default(0),
});

// Health probe — confirms the astrology serverFn is deployed and reachable.
// Used by the UI to disable "Gerar mapa" gracefully when the backend is stale.
export const pingAstro = createServerFn({ method: "GET" }).handler(async () => {
  return { ok: true as const, at: Date.now() };
});

export const computeNatalChart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ChartInput.parse(d))
  .handler(async ({ data, context }) => {
    try {
      const time = data.timeUnknown ? "12:00:00" : (data.birthTime ?? "12:00:00");
      const [h, mi, s] = time.split(":").map(Number);
      const [y, mo, d] = data.birthDate.split("-").map(Number);
      const utcMs =
        Date.UTC(y, mo - 1, d, h, mi, s ?? 0) - data.timezoneOffset * 3600_000;
      const date = new Date(utcMs);

      const observer = new Astro.Observer(data.latitude, data.longitude, 0);

      const planets = PLANETS.map(({ name, body }) => {
        const eq = Astro.Equator(body, date, observer, true, true);
        const lon = eclipticLongitudeFromEqu(eq.ra, eq.dec, date);
        const s = signOf(lon);
        return { name, ...s };
      });

      const { ascendant, midheaven } = computeAscendantMC(
        date,
        data.latitude,
        data.longitude,
      );
      const houses = placidusHouses(ascendant, midheaven).map((deg, i) => ({
        house: i + 1,
        ...signOf(deg),
      }));
      const ascSign = signOf(ascendant);
      const mcSign = signOf(midheaven);

      const aspects = computeAspects(planets);

      const summary =
        `${data.fullName} — Sol em ${planets[0].sign}, Lua em ${planets[1].sign}, Ascendente em ${ascSign.sign}. ` +
        `${aspects.length} aspectos principais detectados.`;

      const { data: saved, error } = await context.supabase
        .from("astro_charts")
        .insert({
          user_id: context.userId,
          birth_data_id: data.birthDataId ?? null,
          client_profile_id: data.clientProfileId ?? null,
          engine: "swiss_ephemeris",
          planets,
          houses,
          aspects,
          ascendant,
          midheaven,
          summary,
        })
        .select()
        .single();

      if (error) {
        console.error("[astro] save error:", error);
        await logFnError("computeNatalChart.persist", error, context.userId, {
          birthDataId: data.birthDataId ?? null,
        });
      }

      return {
        id: saved?.id ?? null,
        planets,
        houses,
        aspects,
        ascendant: { ...ascSign, longitude: ascendant },
        midheaven: { ...mcSign, longitude: midheaven },
        summary,
      };
    } catch (err) {
      await logFnError("computeNatalChart", err, context.userId, {
        birthDataId: data.birthDataId ?? null,
        birthDate: data.birthDate,
      });
      throw err;
    }
  });

/* ============================================================
 * Previsões astrais (próximos dias, semana, mês, ano) via IA
 * ============================================================ */

type AstroForecast = {
  nextDays: string;
  week: string;
  month: string;
  year: string;
  generatedAt: string;
};

async function buildForecastWithAI(chart: {
  planets: { name: string; sign: string; degree: number }[];
  ascendant: number | null;
  midheaven: number | null;
  aspects: { a: string; b: string; aspect: string; orb: number }[];
  summary: string | null;
}): Promise<AstroForecast> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");
  const model = createLovableAiGatewayProvider(apiKey)("google/gemini-2.5-flash");

  const ascSign = chart.ascendant != null ? SIGNS[Math.floor(chart.ascendant / 30)] : "—";
  const mcSign = chart.midheaven != null ? SIGNS[Math.floor(chart.midheaven / 30)] : "—";
  const planetsBlock = chart.planets
    .map((p) => `${p.name} em ${p.sign} (${p.degree.toFixed(1)}°)`)
    .join("\n");
  const aspectsBlock = chart.aspects
    .slice(0, 10)
    .map((a) => `${a.a} ${a.aspect} ${a.b} (orbe ${a.orb}°)`)
    .join("\n");

  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const system = `Você é o **Oráculo Cósmico de Astrologia**, astrólogo profissional.
Escreve em PT-BR, tom acolhedor, claro, prático e poético. Nunca prevê eventos certos — oferece tendências e direções.
Sem markdown, sem emojis, apenas texto corrido em parágrafos separados por linha em branco.`;

  const prompt = `Data de referência: ${today}.

Mapa natal do consulente:
Ascendente: ${ascSign}
Meio do Céu: ${mcSign}
Planetas:
${planetsBlock}

Aspectos principais:
${aspectsBlock}

Com base nesse mapa e na fase atual do céu, escreva previsões em PT-BR.
Responda APENAS com JSON válido (sem cercas de código):
{
  "nextDays": "2 a 3 parágrafos sobre tendências para os próximos 5 a 7 dias, com sugestões práticas",
  "week": "2 a 3 parágrafos sobre a semana atual: emoções, foco, relacionamentos, trabalho",
  "month": "2 a 3 parágrafos sobre o mês atual: oportunidades, cuidados, tema central",
  "year": "3 a 4 parágrafos sobre o ano: grandes ciclos, áreas de crescimento, riscos a evitar"
}`;

  const { text } = await generateText({ model, system, prompt });
  const parsed = safeParseLlmJson<Omit<AstroForecast, "generatedAt">>(text);
  return { ...parsed, generatedAt: new Date().toISOString() };
}

export const generateAstroForecast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ chartId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: chart } = await supabaseAdmin
      .from("astro_charts")
      .select("*")
      .eq("id", data.chartId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!chart) throw new Error("Mapa não encontrado");

    const action: CreditAction = "astro_forecast";
    const unlimited = await hasUnlimitedAccess(userId, action);
    const cost = unlimited ? 0 : await getCreditCost(action);
    let charged = false;
    if (!unlimited) {
      const ok = await consumeCredits(userId, action, `Previsões mapa ${chart.id}`);
      if (!ok) throw new Error(`Saldo insuficiente. Esta geração custa ${cost} créditos.`);
      charged = cost > 0;
    }

    try {
      const forecast = await buildForecastWithAI({
        planets: chart.planets as any,
        ascendant: chart.ascendant as number | null,
        midheaven: chart.midheaven as number | null,
        aspects: chart.aspects as any,
        summary: chart.summary,
      });
      await supabaseAdmin
        .from("astro_charts")
        .update({ forecast, forecast_generated_at: forecast.generatedAt })
        .eq("id", chart.id);
      return forecast;
    } catch (err) {
      if (charged) {
        await refundCredits(userId, action, {
          reason: err instanceof Error ? `Falha em previsões: ${err.message}`.slice(0, 200) : "Falha em previsões",
          actorLabel: "system:astro",
          originalReference: `Previsões mapa ${chart.id}`,
        }).catch(() => {});
      }
      await logFnError("generateAstroForecast", err, userId, { chartId: chart.id });
      throw err;
    }
  });

/* ============================================================
 * Exportar PDF completo do Mapa Astral
 * ============================================================ */

export const exportAstroPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      chartId: z.string().uuid(),
      chartImageB64: z.string().min(100).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: chart } = await supabaseAdmin
      .from("astro_charts")
      .select("*")
      .eq("id", data.chartId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!chart) throw new Error("Mapa não encontrado");

    const action: CreditAction = "astro_pdf";
    const unlimited = await hasUnlimitedAccess(userId, action);
    const cost = unlimited ? 0 : await getCreditCost(action);
    let charged = false;
    if (!unlimited) {
      const ok = await consumeCredits(userId, action, `PDF mapa ${chart.id}`);
      if (!ok) throw new Error(`Saldo insuficiente. Este PDF custa ${cost} créditos.`);
      charged = cost > 0;
    }

    try {
      // Garante que existem previsões; gera se não houver
      let forecast = chart.forecast as AstroForecast | null;
      if (!forecast) {
        forecast = await buildForecastWithAI({
          planets: chart.planets as any,
          ascendant: chart.ascendant as number | null,
          midheaven: chart.midheaven as number | null,
          aspects: chart.aspects as any,
          summary: chart.summary,
        });
        await supabaseAdmin
          .from("astro_charts")
          .update({ forecast, forecast_generated_at: forecast.generatedAt })
          .eq("id", chart.id);
      }

      const planets = (chart.planets ?? []) as { name: string; sign: string; degree: number }[];
      const aspects = (chart.aspects ?? []) as { a: string; b: string; aspect: string; orb: number }[];
      const ascSign = chart.ascendant != null ? SIGNS[Math.floor((chart.ascendant as number) / 30)] : "—";
      const mcSign = chart.midheaven != null ? SIGNS[Math.floor((chart.midheaven as number) / 30)] : "—";

      const blocks: SimplePdfBlock[] = [];

      // Resumo do seu céu
      blocks.push({ type: "h2", text: "Resumo do seu céu" });
      const sun = planets.find((p) => p.name === "Sol");
      const moon = planets.find((p) => p.name === "Lua");
      blocks.push({
        type: "p",
        text:
          `${sun ? `Você brilha como ${sun.sign}` : ""}` +
          `${moon ? `, sente o mundo como ${moon.sign}` : ""}` +
          ` e se apresenta com a aura de ${ascSign}. Meio do Céu em ${mcSign}.\n\n` +
          (chart.summary ?? ""),
      });
      blocks.push({
        type: "kv",
        rows: [
          { k: "Ascendente", v: ascSign },
          { k: "Meio do Céu", v: mcSign },
          { k: "Total de aspectos", v: String(aspects.length) },
        ],
      });

      // Mapa visual
      if (data.chartImageB64) {
        blocks.push({ type: "h2", text: "Mapa Astral" });
        blocks.push({ type: "image", pngB64: data.chartImageB64, caption: "Roda zodiacal com posições planetárias e aspectos", maxHeight: 420 });
      }

      // Síntese — trio principal
      blocks.push({ type: "h2", text: "Síntese — Sol, Lua e Ascendente" });
      for (const t of [
        sun && { label: "Sol", sign: sun.sign, role: "Sua essência e propósito" },
        moon && { label: "Lua", sign: moon.sign, role: "Suas emoções e necessidades" },
        { label: "Ascendente", sign: ascSign, role: "Como o mundo te vê" },
      ].filter(Boolean) as { label: string; sign: string; role: string }[]) {
        const g = SIGN_GUIDANCE[t.sign];
        blocks.push({ type: "h3", text: `${t.label} em ${t.sign} — ${t.role}` });
        if (g) {
          blocks.push({
            type: "kv",
            rows: [
              { k: "O que esperar", v: g.expect },
              { k: "Faça agora", v: g.doNow },
              { k: "Evite", v: g.avoid },
              { k: "Sua força", v: g.strength },
            ],
          });
        }
      }

      // Planetas — explicação de cada um
      blocks.push({ type: "h2", text: "Cada planeta no seu mapa" });
      for (const p of planets) {
        const m = PLANET_MEANING[p.name];
        const s = SIGN_MEANING[p.sign];
        blocks.push({ type: "h3", text: `${m?.title ?? p.name} em ${p.sign} ${p.degree.toFixed(1)}°` });
        blocks.push({
          type: "p",
          text: `${m?.short ?? ""} ${s ? `Em ${p.sign}: ${s.short}` : ""}`.trim(),
        });
      }

      // Aspectos principais
      if (aspects.length) {
        blocks.push({ type: "h2", text: "Aspectos principais e o que significam" });
        for (const a of aspects.slice(0, 16)) {
          blocks.push({ type: "h3", text: `${a.a} ${a.aspect} ${a.b} · orbe ${a.orb}°` });
          blocks.push({ type: "p", text: ASPECT_MEANING[a.aspect] ?? "Relação angular entre os astros." });
        }
      }

      // Previsões
      blocks.push({ type: "h2", text: "Previsões para os próximos dias" });
      blocks.push({ type: "p", text: forecast.nextDays });
      blocks.push({ type: "h2", text: "Previsões para a semana" });
      blocks.push({ type: "p", text: forecast.week });
      blocks.push({ type: "h2", text: "Previsões para o mês" });
      blocks.push({ type: "p", text: forecast.month });
      blocks.push({ type: "h2", text: "Previsões para o ano" });
      blocks.push({ type: "p", text: forecast.year });

      // Branding opcional
      const { data: brandRow } = await supabaseAdmin
        .from("pdf_branding")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      const branding = isBrandingEnabledFor(brandRow, "astrology")
        ? await resolveBrandingPayload(brandRow)
        : undefined;

      const pdfBytes = await buildSimplePdf({
        brand: "Cosmic AI",
        eyebrow: "Astrologia · Mapa Natal",
        title: "Seu Mapa Astral",
        subtitle: chart.summary ?? "Relatório completo do seu céu",
        meta: [`Gerado em ${new Date().toLocaleString("pt-BR")}`],
        blocks,
        accentHex: "#d4af37",
        flowing: false,
        branding,
      });

      const path = `${userId}/astro-${chart.id}.pdf`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("reports")
        .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
      if (upErr) throw new Error(upErr.message);

      await supabaseAdmin
        .from("astro_charts")
        .update({ storage_path: path })
        .eq("id", chart.id);

      const base64 = Buffer.from(pdfBytes).toString("base64");
      return { pdfBase64: base64 };
    } catch (err) {
      if (charged) {
        await refundCredits(userId, action, {
          reason: err instanceof Error ? `Falha no PDF do mapa: ${err.message}`.slice(0, 200) : "Falha no PDF do mapa",
          actorLabel: "system:astro",
          originalReference: `PDF mapa ${chart.id}`,
        }).catch(() => {});
      }
      await logFnError("exportAstroPdf", err, userId, { chartId: chart.id });
      throw err;
    }
  });

/* ============================================================
 * Apagar previsões salvas
 * ============================================================ */
export const deleteAstroForecast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ chartId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("astro_charts")
      .update({ forecast: null, forecast_generated_at: null })
      .eq("id", data.chartId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ============================================================
 * PDF apenas com as previsões (sem custo extra — já foram pagas)
 * ============================================================ */
export const downloadAstroForecastPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ chartId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: chart } = await supabaseAdmin
      .from("astro_charts")
      .select("*")
      .eq("id", data.chartId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!chart) throw new Error("Mapa não encontrado");
    const forecast = chart.forecast as AstroForecast | null;
    if (!forecast) throw new Error("Nenhuma previsão salva para este mapa.");

    const blocks: SimplePdfBlock[] = [];
    blocks.push({ type: "h2", text: "Previsões para os próximos dias" });
    blocks.push({ type: "p", text: forecast.nextDays });
    blocks.push({ type: "h2", text: "Previsões para a semana" });
    blocks.push({ type: "p", text: forecast.week });
    blocks.push({ type: "h2", text: "Previsões para o mês" });
    blocks.push({ type: "p", text: forecast.month });
    blocks.push({ type: "h2", text: "Previsões para o ano" });
    blocks.push({ type: "p", text: forecast.year });

    const { data: brandRow } = await supabaseAdmin
      .from("pdf_branding")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const branding = isBrandingEnabledFor(brandRow, "astrology")
      ? await resolveBrandingPayload(brandRow)
      : undefined;

    const pdfBytes = await buildSimplePdf({
      brand: "Cosmic AI",
      eyebrow: "Astrologia · Previsões",
      title: "Suas previsões astrais",
      subtitle: chart.summary ?? "Tendências para os próximos dias, semana, mês e ano",
      meta: [`Geradas em ${new Date(forecast.generatedAt).toLocaleString("pt-BR")}`],
      blocks,
      accentHex: "#d4af37",
      flowing: false,
      branding,
    });

    const base64 = Buffer.from(pdfBytes).toString("base64");
    return { pdfBase64: base64 };
  });
