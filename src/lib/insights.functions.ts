import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { generateText } from "ai";
import { SIGN_GUIDANCE } from "@/lib/astro-meanings";
import { computeNumerology, NUMBER_MEANINGS } from "@/lib/numerology";
import { applyActiveChartFilter, resolveActiveSubject } from "@/lib/active-subject";
import * as Astro from "astronomy-engine";

function reduce(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split("").reduce((a, b) => a + Number(b), 0);
  }
  return n;
}
function personalDay(date: Date, birthISO: string) {
  const [, bm, bd] = birthISO.split("-").map(Number);
  const y = date.getUTCFullYear(), m = date.getUTCMonth() + 1, d = date.getUTCDate();
  const py = reduce(reduce(bm) + reduce(bd) + reduce(y));
  const pm = reduce(py + reduce(m));
  return reduce(pm + reduce(d));
}
function moonLabel(angle: number) {
  if (angle < 45) return "Lua Nova";
  if (angle < 90) return "Crescente";
  if (angle < 135) return "Quarto Crescente";
  if (angle < 180) return "Gibosa Crescente";
  if (angle < 225) return "Lua Cheia";
  if (angle < 270) return "Gibosa Minguante";
  if (angle < 315) return "Quarto Minguante";
  return "Minguante";
}

const SIGNS = ["Áries","Touro","Gêmeos","Câncer","Leão","Virgem","Libra","Escorpião","Sagitário","Capricórnio","Aquário","Peixes"];
function sunSignFromDate(d: string) {
  const [, m, day] = d.split("-").map(Number);
  const cutoffs: [number, number, string][] = [
    [1,20,"Capricórnio"],[2,19,"Aquário"],[3,21,"Peixes"],[4,20,"Áries"],
    [5,21,"Touro"],[6,21,"Gêmeos"],[7,23,"Câncer"],[8,23,"Leão"],
    [9,23,"Virgem"],[10,23,"Libra"],[11,22,"Escorpião"],[12,22,"Sagitário"],
  ];
  for (const [mm, dd, sign] of cutoffs) {
    if (m < mm || (m === mm && day <= dd)) return sign;
  }
  return "Capricórnio";
}

export type AIInsightCard = {
  area: string;       // ex: "Trabalho", "Relacionamentos"
  pulse: string;      // como as coisas estão agora (1 frase)
  doNow: string;      // o que fazer agora (1-2 frases acionáveis)
  watchOut: string;   // o que evitar (1 frase)
};

export type AIInsightResult = {
  intro: string;       // 1-2 frases ligando resumo prático ao agora
  cards: AIInsightCard[];
  closing: string;     // 1 frase de fechamento
  context: {
    sunSign: string | null;
    moonSign: string | null;
    ascSign: string | null;
    personalDay: number | null;
    moon: string;
    lifePath: number | null;
    weekdayPt: string;
  };
  hasData: boolean;
  generatedAt: string;
  notice?: string | null;
};


export const getAIInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AIInsightResult> => {
    const { supabase, userId } = context;
    const { consumeCredits, getCreditCost, hasUnlimitedAccess } = await import("./credits.functions");

    // Cobrança: 1 crédito por consulta (oracle_answer ou oracle_message)
    const action = "oracle_answer";
    const unlimited = await hasUnlimitedAccess(userId, action);
    const cost = unlimited ? 0 : await getCreditCost(action);
    if (!unlimited && cost > 0) {
      const ok = await consumeCredits(userId, action, "Insights da IA");
      if (!ok) {
        return {
          intro: "",
          cards: [],
          closing: "",
          context: { sunSign: null, moonSign: null, ascSign: null, personalDay: null, moon: "", lifePath: null, weekdayPt: "" },
          hasData: false,
          generatedAt: new Date().toISOString(),
          notice: `Saldo insuficiente. Gerar insights custa ${cost} créditos.`,
        };
      }
    }



    const birth = await resolveActiveSubject(supabase, userId);
    const chartQuery = supabase
      .from("astro_charts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);
    const { data: chart } = await applyActiveChartFilter(chartQuery, birth?.client_profile_id ?? null).maybeSingle();

    const today = new Date();
    const utc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0));
    const moon = moonLabel(Astro.MoonPhase(utc));
    const weekdayPt = today.toLocaleDateString("pt-BR", { weekday: "long" });

    const planets = (chart?.planets as { name: string; sign: string }[] | null) ?? null;
    const sunSign = planets?.find((p) => p.name === "Sol")?.sign ?? (birth ? sunSignFromDate(birth.birth_date) : null);
    const moonSign = planets?.find((p) => p.name === "Lua")?.sign ?? null;
    let ascSign: string | null = null;
    if (chart?.ascendant != null) {
      const idx = Math.floor((Number(chart.ascendant) % 360) / 30);
      ascSign = SIGNS[idx] ?? null;
    }

    const num = birth ? computeNumerology(birth.full_name, birth.birth_date) : null;
    const pd = birth ? personalDay(utc, birth.birth_date) : null;

    const ctx = {
      sunSign, moonSign, ascSign,
      personalDay: pd, moon, lifePath: num?.life_path ?? null, weekdayPt,
    };

    const fallback = (): AIInsightResult => ({
      intro: birth
        ? "Hoje é um convite a aplicar suas forças naturais ao momento que você está vivendo."
        : "Complete seus dados de nascimento para receber insights personalizados.",
      cards: [
        { area: "Trabalho", pulse: "Há demanda por foco e entrega.", doNow: "Escolha uma tarefa-chave e termine antes do fim do dia.", watchOut: "Tentar resolver tudo de uma vez." },
        { area: "Relações", pulse: "As conversas pedem clareza e presença.", doNow: "Diga em voz alta o que vinha pensando para alguém próximo.", watchOut: "Esperar que o outro adivinhe." },
        { area: "Energia interna", pulse: "Seu corpo pede ritmo, não pressa.", doNow: "Reserve 20 minutos de silêncio ou movimento consciente.", watchOut: "Empurrar com café o que falta de descanso." },
      ],
      closing: "Pequenos gestos coerentes hoje constroem o ciclo de amanhã.",
      context: ctx,
      hasData: !!birth,
      generatedAt: new Date().toISOString(),
    });

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey || !birth) return fallback();

    const sunG = sunSign ? SIGN_GUIDANCE[sunSign] : null;
    const moonG = moonSign ? SIGN_GUIDANCE[moonSign] : null;
    const ascG = ascSign ? SIGN_GUIDANCE[ascSign] : null;
    const lifeM = num ? NUMBER_MEANINGS[num.life_path] : null;
    const pdM = pd ? NUMBER_MEANINGS[pd] : null;

    const resumo: string[] = [];
    if (sunSign && sunG) resumo.push(`SOL em ${sunSign} — esperar: ${sunG.expect} | fazer: ${sunG.doNow} | evitar: ${sunG.avoid} | força: ${sunG.strength}`);
    if (moonSign && moonG) resumo.push(`LUA em ${moonSign} — esperar: ${moonG.expect} | fazer: ${moonG.doNow} | evitar: ${moonG.avoid} | força: ${moonG.strength}`);
    if (ascSign && ascG) resumo.push(`ASCENDENTE ${ascSign} — esperar: ${ascG.expect} | fazer: ${ascG.doNow} | evitar: ${ascG.avoid} | força: ${ascG.strength}`);

    const prompt = `Você é um conselheiro espiritual prático que une astrologia e numerologia. Sua tarefa é mostrar como o "resumo prático" do mapa do consulente se aplica HOJE, no contexto atual dele.

## Resumo prático do consulente (use como matéria-prima)
${resumo.join("\n")}
${lifeM ? `Caminho de Vida ${num!.life_path} — ${lifeM.title}: ${lifeM.essence}` : ""}

## Contexto atual
- Hoje: ${weekdayPt}, ${today.toLocaleDateString("pt-BR")}
- Fase da Lua: ${moon}
${pd && pdM ? `- Dia pessoal: ${pd} (${pdM.title}) — ${pdM.essence}` : ""}

## Saída — RESPONDA EXCLUSIVAMENTE COM JSON VÁLIDO neste schema (sem markdown, sem texto fora do JSON):
{
  "intro": "1 a 2 frases conectando o resumo prático ao momento atual, em segunda pessoa.",
  "cards": [
    { "area": "Trabalho & Propósito", "pulse": "1 frase sobre como está esta área AGORA para a pessoa", "doNow": "1 a 2 frases com ação concreta para HOJE ou esta semana", "watchOut": "1 frase com armadilha a evitar" },
    { "area": "Relacionamentos", "pulse": "...", "doNow": "...", "watchOut": "..." },
    { "area": "Energia & Corpo", "pulse": "...", "doNow": "...", "watchOut": "..." }
  ],
  "closing": "1 frase de fechamento, esperançosa e prática."
}

Regras:
- Tom: acolhedor, claro, levemente poético, sem fatalismo.
- Cite signos/números específicos quando agregar.
- Cada campo curto e direto. Nada de listas dentro dos campos.
- Português brasileiro.`;

    try {
      const gateway = createLovableAiGatewayProvider(apiKey);
      const model = gateway("google/gemini-3-flash-preview");
      const { text } = await generateText({ model, prompt });
      const raw = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(raw) as {
        intro: string;
        cards: AIInsightCard[];
        closing: string;
      };
      if (!parsed?.cards?.length) throw new Error("empty cards");
      return {
        intro: String(parsed.intro ?? ""),
        cards: parsed.cards.slice(0, 4).map((c) => ({
          area: String(c.area ?? ""),
          pulse: String(c.pulse ?? ""),
          doNow: String(c.doNow ?? ""),
          watchOut: String(c.watchOut ?? ""),
        })),
        closing: String(parsed.closing ?? ""),
        context: ctx,
        hasData: true,
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error("[ai-insights] error", err);
      return fallback();
    }
  });
