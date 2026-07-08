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

// Gera uma leitura horoscópica curta via IA (com fallback) usando o trio Sol/Lua/Asc.
async function buildHoroscopeReading(params: {
  sunSign?: string;
  moonSign?: string;
  ascSign?: string;
  weekRange: { start: string; end: string };
  monthLabel: string;
}): Promise<string> {
  const { sunSign, moonSign, ascSign, weekRange, monthLabel } = params;
  const apiKey = process.env.LOVABLE_API_KEY;
  const fallback =
    `Esta semana (${weekRange.start} a ${weekRange.end}), em ${monthLabel}, o céu convida você a honrar o que pulsa em ${sunSign ?? "seu Sol"}, ` +
    `acolher o que sente em ${moonSign ?? "sua Lua"} e expressar no mundo a presença de ${ascSign ?? "seu Ascendente"}. ` +
    `Permita-se pausar, sentir os movimentos sutis e agir com intenção. Pequenos gestos de cuidado e clareza abrem portas maiores.`;
  if (!apiKey) return fallback;
  try {
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");
    const prompt = `Você é um astrólogo experiente. Escreva uma leitura horoscópica em português, em prosa contínua (sem listas), entre 90 e 130 palavras, poética e prática, dirigida diretamente ao leitor ("você"). Mencione a semana atual (${weekRange.start} a ${weekRange.end}) e o mês de ${monthLabel}. Integre o trio Sol em ${sunSign ?? "—"}, Lua em ${moonSign ?? "—"} e Ascendente em ${ascSign ?? "—"}. Traga uma orientação central, um cuidado emocional e um convite de ação concreto. Não use títulos, asteriscos ou emojis.`;
    const { text } = await generateText({ model, prompt });
    const cleaned = text.trim();
    return cleaned.length > 40 ? cleaned : fallback;
  } catch (err) {
    console.error("[buildHoroscopeReading] AI error", err);
    return fallback;
  }
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
    const { userId } = context;
    
    // Charge credits for chart calculation
    const action: CreditAction = "astro_chart";
    const unlimited = await hasUnlimitedAccess(userId, action);
    const cost = unlimited ? 0 : await getCreditCost(action);
    let charged = false;
    if (!unlimited) {
      const ok = await consumeCredits(userId, action, "Cálculo de Mapa Astral");
      if (!ok) {
        throw new Error(`Saldo insuficiente. Gerar o mapa custa ${cost} créditos.`);
      }
      charged = cost > 0;
    }

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
      if (charged) {
        await refundCredits(userId, "astro_chart", {
          reason: err instanceof Error ? `Falha no mapa: ${err.message}`.slice(0, 200) : "Falha no mapa",
          actorLabel: "system:astro",
          originalReference: "Cálculo de Mapa Astral",
        }).catch(() => {});
      }
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

type DeepArea = {
  title: string;
  reading: string;    // interpretação profunda (várias parágrafos)
  opportunities: string; // oportunidades específicas do mapa nessa área
  tips: string[];     // ações práticas concretas (>=5)
  avoid: string[];    // armadilhas a evitar (>=3)
};

type AstroForecast = {
  synthesis: string;   // síntese inicial cinematográfica
  love: DeepArea;
  money: DeepArea;
  health: DeepArea;
  purpose: DeepArea;
  business: DeepArea;
  family: DeepArea;
  spirituality: DeepArea;
  relationships: DeepArea; // amizades e vínculos sociais
  shadows: DeepArea;   // sombras, feridas kármicas, padrões a curar
  nextDays: string;
  week: string;
  month: string;
  year: string;
  closing: string;     // fechamento inspirador
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
  // Modelo mais robusto para gerar leitura extensa e profunda (~40 páginas)
  const model = createLovableAiGatewayProvider(apiKey)("openai/gpt-5.5");

  const ascSign = chart.ascendant != null ? SIGNS[Math.floor(chart.ascendant / 30)] : "—";
  const mcSign = chart.midheaven != null ? SIGNS[Math.floor(chart.midheaven / 30)] : "—";
  const planetsBlock = chart.planets
    .map((p) => `${p.name} em ${p.sign} (${p.degree.toFixed(1)}°)`)
    .join("\n");
  const aspectsBlock = chart.aspects
    .slice(0, 20)
    .map((a) => `${a.a} ${a.aspect} ${a.b} (orbe ${a.orb}°)`)
    .join("\n");

  const today = new Date();
  const todayStr = today.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const week = formatWeekRange(today);
  const monthLabel = formatMonthLabel(today);
  const yearLabel = formatYearLabel(today);

  // ============================================================
  // PROMPT MASTER — Interpretação profunda do Mapa Astral
  // ============================================================
  const system = `Você é o **Oráculo Cósmico**, astrólogo profissional com formação em astrologia psicológica (Jung, Liz Greene, Steven Forrest), evolutiva e cabalística.
Escreve em português brasileiro, tom acolhedor, íntimo, poético e profundamente prático. Nunca prevê eventos certos — mostra tendências, arquétipos e caminhos.
Fala diretamente ao leitor em segunda pessoa ("você"), como um mentor que já leu a alma da pessoa.
NUNCA use markdown, títulos com #, asteriscos, listas com - ou emojis. Apenas texto corrido em parágrafos separados por linha em branco.
Cite planetas, signos, casas e aspectos ESPECÍFICOS do mapa em cada leitura — não escreva genéricos que caberiam a qualquer pessoa.
Cada tip deve ser uma AÇÃO CONCRETA e executável hoje ou nesta semana (ex: "Reserve 20 min toda manhã para escrever 3 páginas sem filtro"), nunca conselho vago.`;

  const prompt = `Data de referência: ${todayStr} · Semana: ${week.start} a ${week.end} · Mês: ${monthLabel} · Ano: ${yearLabel}.

MAPA NATAL DO CONSULENTE
Ascendente: ${ascSign}
Meio do Céu: ${mcSign}
Planetas:
${planetsBlock}

Aspectos principais:
${aspectsBlock}

Resumo interno: ${chart.summary ?? "—"}

MISSÃO
Gere uma interpretação PROFUNDA e EXTENSA do mapa, com foco em oportunidades e ações práticas em cada área da vida. O texto final vai virar um relatório de ~40 páginas.
Cite o Sol, Lua, Ascendente, Mercúrio, Vênus, Marte, Júpiter, Saturno e aspectos relevantes em cada seção, mostrando POR QUE esta pessoa vive cada tema desse jeito.

FORMATO — RESPONDA EXCLUSIVAMENTE COM JSON VÁLIDO (sem markdown, sem cercas, sem texto fora do JSON):
{
  "synthesis": "3 a 4 parágrafos (mín. 500 palavras) — abertura cinematográfica costurando Sol/Lua/Asc/MC, arquétipo dominante, missão desta encarnação e clima do momento atual (${monthLabel}).",

  "love": {
    "title": "Amor e Vínculo Afetivo",
    "reading": "4 a 6 parágrafos (mín. 650 palavras) — como esta pessoa ama, atrai, sabota e floresce no amor à luz de Vênus, Marte, Lua, Casa 5 e 7. Fale sobre o tipo de vínculo que a alma dela busca, o parceiro/a que a complementa, feridas de rejeição e o padrão que ela repete.",
    "opportunities": "2 parágrafos (mín. 200 palavras) — oportunidades reais no amor que este mapa está abrindo AGORA e nos próximos meses.",
    "tips": ["6 a 8 ações concretas e específicas para viver o amor com maturidade (ex: 'Marque um encontro semanal só de silêncio e contato com seu par')"],
    "avoid": ["4 armadilhas específicas a evitar"]
  },

  "money": {
    "title": "Dinheiro, Prosperidade e Abundância",
    "reading": "4 a 6 parágrafos (mín. 650 palavras) — relação com dinheiro à luz de Vênus, Júpiter, Saturno, Casa 2 e 8. Crenças herdadas, talentos monetizáveis, ciclos de escassez/abundância, estilo de gastar e receber.",
    "opportunities": "2 parágrafos (mín. 200 palavras) — janelas de prosperidade que o mapa mostra para o próximo ciclo.",
    "tips": ["6 a 8 ações concretas de gestão financeira, mentalidade e monetização alinhadas ao mapa"],
    "avoid": ["4 armadilhas financeiras"]
  },

  "health": {
    "title": "Saúde, Corpo e Vitalidade",
    "reading": "4 a 5 parágrafos (mín. 550 palavras) — vitalidade, pontos sensíveis do corpo à luz de Sol, Marte, Saturno, Casa 6. Padrões emocionais que impactam o corpo, ritmo ideal, abordagens integrativas. NUNCA dar diagnóstico clínico.",
    "opportunities": "1 a 2 parágrafos (mín. 180 palavras) — oportunidades de cura e regeneração.",
    "tips": ["6 a 8 práticas de saúde integrativa (sono, alimentação, movimento, terapias)"],
    "avoid": ["4 hábitos a rever, sempre reforçando que não substitui acompanhamento médico"]
  },

  "purpose": {
    "title": "Propósito de Vida e Missão da Alma",
    "reading": "4 a 6 parágrafos (mín. 650 palavras) — missão à luz do MC, Sol, Nodos, Casa 10. Dom central que o mundo precisa dessa pessoa, ferida iniciática, chamado kármico.",
    "opportunities": "2 parágrafos (mín. 200 palavras) — sinais concretos de que o propósito está sendo ativado agora.",
    "tips": ["6 a 8 movimentos práticos para encarnar a missão"],
    "avoid": ["4 fugas típicas do propósito"]
  },

  "business": {
    "title": "Negócios, Carreira e Empreendimentos",
    "reading": "4 a 6 parágrafos (mín. 650 palavras) — vocação profissional à luz de MC, Casa 10, Saturno, Marte, Júpiter. Tipo de liderança, nicho, modelo de negócio que combina, sócios ideais.",
    "opportunities": "2 parágrafos (mín. 220 palavras) — oportunidades de carreira e negócio abrindo no próximo ciclo.",
    "tips": ["6 a 8 ações estratégicas para carreira/empreendedorismo"],
    "avoid": ["4 armadilhas profissionais"]
  },

  "family": {
    "title": "Família, Raízes e Ancestralidade",
    "reading": "3 a 5 parágrafos (mín. 500 palavras) — dinâmica com pai, mãe, irmãos, filhos à luz de Casa 4, 10, Lua, Saturno. Padrão herdado, ferida ancestral, papel no clã.",
    "opportunities": "1 a 2 parágrafos (mín. 180 palavras) — caminhos de cura familiar.",
    "tips": ["5 a 7 práticas de harmonização familiar e ancestral"],
    "avoid": ["3 padrões familiares a interromper"]
  },

  "spirituality": {
    "title": "Espiritualidade, Fé e Conexão com o Sagrado",
    "reading": "3 a 5 parágrafos (mín. 500 palavras) — via espiritual à luz de Netuno, Plutão, Júpiter, Casa 9 e 12. Tradições e práticas que ressoam com a alma, dons mediúnicos, caminho de despertar.",
    "opportunities": "1 a 2 parágrafos (mín. 180 palavras) — portais espirituais que se abrem no ciclo atual.",
    "tips": ["5 a 7 práticas espirituais concretas (meditação, ritual, estudo)"],
    "avoid": ["3 desvios espirituais típicos"]
  },

  "relationships": {
    "title": "Amizades e Círculos Sociais",
    "reading": "3 a 4 parágrafos (mín. 400 palavras) — como esta pessoa faz amigos, tipo de círculo saudável, papel em grupo à luz de Mercúrio, Casa 11.",
    "opportunities": "1 parágrafo (mín. 130 palavras) — encontros e círculos que estão chegando.",
    "tips": ["5 práticas de cultivo de vínculo"],
    "avoid": ["3 padrões sociais a rever"]
  },

  "shadows": {
    "title": "Sombras, Feridas e Padrões a Curar",
    "reading": "4 a 5 parágrafos (mín. 550 palavras) — sombra jungiana à luz de Plutão, Lilith, quadraturas e oposições. Ferida central, mecanismo de defesa, o que projeta no outro.",
    "opportunities": "1 a 2 parágrafos (mín. 180 palavras) — o que está pronto para ser integrado agora.",
    "tips": ["5 a 7 práticas de trabalho com a sombra (terapia, escrita, ritual)"],
    "avoid": ["3 fugas da sombra"]
  },

  "nextDays": "3 a 4 parágrafos (mín. 400 palavras) — tendências para os próximos 5 a 7 dias a partir de ${todayStr}. Mencione dias e mês.",
  "week": "3 a 4 parágrafos (mín. 400 palavras) — semana atual (${week.start} a ${week.end}): emoções, foco, relacionamentos, trabalho.",
  "month": "3 a 4 parágrafos (mín. 450 palavras) — mês (${monthLabel}): tema central, oportunidades, cuidados.",
  "year": "4 a 6 parágrafos (mín. 600 palavras) — ano ${yearLabel}: grandes ciclos, áreas de crescimento, decisões importantes.",

  "closing": "2 parágrafos (mín. 250 palavras) — fechamento inspirador, síntese viva, chamado à ação, benção final."
}

REGRAS ABSOLUTAS
1. Cite planetas/signos/aspectos ESPECÍFICOS do mapa em cada seção — nada de leitura genérica.
2. Cumpra o mínimo de palavras de cada campo. Se ficar curto, expanda com exemplos concretos e cenas cotidianas.
3. Cada "tip" começa com um verbo no imperativo suave e é executável em até 30 dias.
4. Nunca prometa evento certo. Use "tende a", "convida", "pede", "abre espaço para".
5. Português brasileiro. Sem markdown. Sem emojis. Sem cabeçalhos.`;

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
      const rawForecast =
        chart.forecast && typeof chart.forecast === "object"
          ? (chart.forecast as Partial<AstroForecast>)
          : {};

      // Tolera previsões parciais/legadas preenchendo campos faltantes com
      // fallback seguro — evita refazer a chamada de IA (que estoura o
      // timeout do worker) e permite exportar mesmo se a IA devolveu JSON
      // incompleto.
      const fallbackArea = (title: string): DeepArea => ({
        title,
        reading:
          `Esta área é interpretada a partir do desenho central do seu mapa: ${chart.summary ?? "a combinação entre seus planetas, signos, ascendente e aspectos principais"}. Observe onde sua energia pede presença, maturidade e escolhas mais conscientes. Use esta leitura como ponto de partida prático para transformar percepção em atitude, sem esperar por certezas absolutas: o mapa mostra tendências, potenciais e convites de desenvolvimento.`,
        opportunities:
          "Há oportunidade de agir com mais clareza, alinhar desejo e responsabilidade, revisar padrões repetidos e escolher movimentos pequenos que sustentem uma mudança real nos próximos 30 dias.",
        tips: [
          "Escolha uma ação simples e mensurável para praticar por sete dias.",
          "Registre no fim do dia onde você sentiu expansão, tensão ou resistência.",
          "Converse com honestidade antes de tomar decisões importantes.",
          "Priorize o que fortalece sua energia em vez do que apenas exige urgência.",
          "Revise acordos, hábitos e expectativas que já não combinam com sua fase atual.",
        ],
        avoid: [
          "Tomar decisões por ansiedade ou pressa.",
          "Ignorar sinais recorrentes do corpo e das emoções.",
          "Repetir padrões antigos esperando resultados diferentes.",
        ],
      });
      const forecast: AstroForecast = {
        synthesis:
          typeof rawForecast.synthesis === "string" && rawForecast.synthesis.trim()
            ? rawForecast.synthesis
            : chart.summary ?? "Síntese não disponível nesta versão da previsão.",
        love: rawForecast.love ?? fallbackArea("Amor e Vínculo Afetivo"),
        money: rawForecast.money ?? fallbackArea("Dinheiro, Prosperidade e Abundância"),
        health: rawForecast.health ?? fallbackArea("Saúde, Corpo e Vitalidade"),
        purpose: rawForecast.purpose ?? fallbackArea("Propósito de Vida e Missão da Alma"),
        business: rawForecast.business ?? fallbackArea("Negócios, Carreira e Empreendimentos"),
        family: rawForecast.family ?? fallbackArea("Família, Raízes e Ancestralidade"),
        spirituality: rawForecast.spirituality ?? fallbackArea("Espiritualidade e Sagrado"),
        relationships: rawForecast.relationships ?? fallbackArea("Amizades e Círculos Sociais"),
        shadows: rawForecast.shadows ?? fallbackArea("Sombras e Padrões a Curar"),
        nextDays: rawForecast.nextDays ?? "—",
        week: rawForecast.week ?? "—",
        month: rawForecast.month ?? "—",
        year: rawForecast.year ?? "—",
        closing:
          rawForecast.closing ?? "Que este mapa ilumine seus próximos passos.",
        generatedAt: rawForecast.generatedAt ?? new Date().toISOString(),
      };




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

      // ============================================================
      // SÍNTESE DE ABERTURA (leitura profunda)
      // ============================================================
      blocks.push({ type: "h2", text: "Síntese profunda do seu mapa" });
      blocks.push({ type: "p", text: forecast.synthesis });

      // ============================================================
      // INTERPRETAÇÃO POR ÁREA DA VIDA
      // ============================================================
      const deepAreas: Array<[string, typeof forecast.love]> = [
        ["Amor", forecast.love],
        ["Dinheiro", forecast.money],
        ["Saúde", forecast.health],
        ["Propósito", forecast.purpose],
        ["Negócios", forecast.business],
        ["Família", forecast.family],
        ["Espiritualidade", forecast.spirituality],
        ["Amizades", forecast.relationships],
        ["Sombras", forecast.shadows],
      ];
      for (const [, area] of deepAreas) {
        if (!area) continue;
        blocks.push({ type: "h2", text: area.title });
        blocks.push({ type: "p", text: area.reading });
        blocks.push({ type: "h3", text: "Oportunidades que o seu mapa está abrindo" });
        blocks.push({ type: "p", text: area.opportunities });
        if (area.tips?.length) {
          blocks.push({ type: "h3", text: "Faça isto" });
          blocks.push({ type: "kv", rows: area.tips.map((t, i) => ({ k: `${i + 1}.`, v: t })) });
        }
        if (area.avoid?.length) {
          blocks.push({ type: "h3", text: "Evite isto" });
          blocks.push({ type: "kv", rows: area.avoid.map((t, i) => ({ k: `${i + 1}.`, v: t })) });
        }
      }

      // ============================================================
      // PREVISÕES TEMPORAIS
      // ============================================================
      const week = formatWeekRange();
      const monthLabel = formatMonthLabel();
      const yearLabel = formatYearLabel();
      const horoscope = await buildHoroscopeReading({
        sunSign: sun?.sign,
        moonSign: moon?.sign,
        ascSign,
        weekRange: { start: week.start, end: week.end },
        monthLabel,
      });
      blocks.push({ type: "h2", text: "Leitura horoscópica" });
      blocks.push({ type: "h3", text: `Semana de ${week.start} a ${week.end}` });
      blocks.push({ type: "p", text: horoscope });

      blocks.push({ type: "h2", text: "Previsões para os próximos dias" });
      blocks.push({ type: "p", text: forecast.nextDays });
      blocks.push({ type: "h2", text: "Previsões para a semana" });
      blocks.push({ type: "h3", text: `${week.start} a ${week.end}` });
      blocks.push({ type: "p", text: forecast.week });
      blocks.push({ type: "h2", text: "Previsões para o mês" });
      blocks.push({ type: "h3", text: monthLabel });
      blocks.push({ type: "p", text: forecast.month });
      blocks.push({ type: "h2", text: "Previsões para o ano" });
      blocks.push({ type: "h3", text: yearLabel });
      blocks.push({ type: "p", text: forecast.year });

      // ============================================================
      // CALENDÁRIO ENERGÉTICO — 30 dias (fases da lua)
      // ============================================================
      blocks.push({ type: "h2", text: "Calendário energético dos próximos 30 dias" });
      blocks.push({
        type: "p",
        text:
          "A fase da Lua a cada dia dá o tom da sua energia interna. Use esta agenda como bússola: dias de Lua Nova pedem intenção e recomeço; Crescente favorece ação e construção; Cheia intensifica emoções e revela verdades; Minguante convida a soltar, revisar e descansar.",
      });
      const moonRows: { k: string; v: string }[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const angle = Astro.MoonPhase(d);
        let label = "Lua Nova";
        if (angle < 45) label = "Lua Nova · intenção";
        else if (angle < 90) label = "Crescente · plantar";
        else if (angle < 135) label = "Quarto Crescente · ação";
        else if (angle < 180) label = "Gibosa Crescente · ajuste";
        else if (angle < 225) label = "Lua Cheia · colheita";
        else if (angle < 270) label = "Gibosa Minguante · gratidão";
        else if (angle < 315) label = "Quarto Minguante · liberar";
        else label = "Minguante · descanso";
        const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", weekday: "short" });
        moonRows.push({ k: dateStr, v: label });
      }
      blocks.push({ type: "kv", rows: moonRows });

      // ============================================================
      // FECHAMENTO
      // ============================================================
      blocks.push({ type: "h2", text: "Bênção final" });
      blocks.push({ type: "p", text: forecast.closing });


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
        brand: "Código Cósmico",
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
    const week = formatWeekRange();
    const monthLabel = formatMonthLabel();
    const yearLabel = formatYearLabel();

    // Trio Sol/Lua/Asc para a leitura horoscópica
    const planets = (chart.planets ?? []) as { name: string; sign: string; degree: number }[];
    const sun = planets.find((p) => p.name === "Sol");
    const moon = planets.find((p) => p.name === "Lua");
    const ascSign = chart.ascendant != null ? SIGNS[Math.floor((chart.ascendant as number) / 30)] : undefined;
    const horoscope = await buildHoroscopeReading({
      sunSign: sun?.sign,
      moonSign: moon?.sign,
      ascSign,
      weekRange: { start: week.start, end: week.end },
      monthLabel,
    });
    blocks.push({ type: "h2", text: "Leitura horoscópica" });
    blocks.push({ type: "h3", text: `Semana de ${week.start} a ${week.end}` });
    blocks.push({ type: "p", text: horoscope });

    blocks.push({ type: "h2", text: "Previsões para os próximos dias" });
    blocks.push({ type: "p", text: forecast.nextDays });
    blocks.push({ type: "h2", text: "Previsões para a semana" });
    blocks.push({ type: "h3", text: `${week.start} a ${week.end}` });
    blocks.push({ type: "p", text: forecast.week });
    blocks.push({ type: "h2", text: "Previsões para o mês" });
    blocks.push({ type: "h3", text: monthLabel });
    blocks.push({ type: "p", text: forecast.month });
    blocks.push({ type: "h2", text: "Previsões para o ano" });
    blocks.push({ type: "h3", text: yearLabel });
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
      brand: "Código Cósmico",
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
