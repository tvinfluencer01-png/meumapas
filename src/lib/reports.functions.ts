import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import {
  createLovableAiGatewayProvider,
  createOpenAIProvider,
  createAnthropicProvider,
  createGeminiProvider,
} from "@/lib/ai-gateway";
import { computeNumerology, NUMBER_MEANINGS, formatBirthDateBR, numLabel, numTitle } from "@/lib/numerology";
import { buildReportPdf, type ReportData } from "@/lib/reports-pdf";
import { consumeCredits, hasUnlimitedAccess, getCreditCost, refundCredits, type CreditAction } from "@/lib/credits.functions";

const KIND = z.enum([
  "personality",
  "love",
  "career",
  "spiritual",
  "finance",
  "family",
  "health",
  "friendships",
]);

const REPORT_META: Record<
  z.infer<typeof KIND>,
  { title: string; subtitle: string; focus: string; suggestionHeading: string; suggestionGuide: string }
> = {
  personality: {
    title: "Mapa da Personalidade",
    subtitle: "Quem voce e na sua essencia mais profunda",
    focus:
      "personalidade, dons naturais, sombras, padroes de comportamento, ferida de origem, talentos a desenvolver e proposito da alma nesta encarnacao.",
    suggestionHeading: "Habitos e praticas sugeridas",
    suggestionGuide:
      "habitos diarios, praticas de autoconhecimento, leituras, exercicios e atitudes que potencializam a personalidade desta pessoa (ex: journaling matinal, meditacao guiada, terapia somatica, leitura de Jung). Cada sugestao precisa explicar POR QUE combina com o mapa e a numerologia dela.",
  },
  love: {
    title: "Amor e Relacionamento",
    subtitle: "A linguagem do seu coracao e o tipo de vinculo que voce atrai",
    focus:
      "como voce ama e e amado, padroes afetivos, feridas relacionais, tipo ideal de parceiro(a), magnetismo afetivo, sexualidade, ciclos de vinculo, e como atrair amor saudavel.",
    suggestionHeading: "Perfis afetivos e praticas amorosas sugeridas",
    suggestionGuide:
      "perfis de parceiro(a) que tendem a complementar/harmonizar com esta pessoa (ex: 'Parceiro com Lua em signo de agua', 'Pessoa Caminho de Vida 6'), alem de praticas concretas para a vida afetiva (ex: rituais de encontro, conversas de vulnerabilidade, terapia de casal). Cada sugestao precisa explicar POR QUE combina com o mapa e a numerologia dela.",
  },
  career: {
    title: "Vocacao e Proposito",
    subtitle: "O chamado profissional inscrito no seu mapa",
    focus:
      "talentos vocacionais, missao, areas de prosperidade, lideranca, padroes de bloqueio financeiro e caminho de realizacao material.",
    suggestionHeading: "Profissoes e caminhos sugeridos",
    suggestionGuide:
      "profissoes, carreiras, nichos de atuacao e empreendimentos que se alinham aos talentos desta pessoa (ex: 'Terapeuta holistica', 'Designer de marca', 'Educador independente', 'Consultor estrategico'). Cada sugestao precisa explicar POR QUE combina com o mapa e a numerologia dela.",
  },
  spiritual: {
    title: "Jornada Espiritual",
    subtitle: "O caminho interior e a evolucao da alma",
    focus:
      "missao karmica, ferida ancestral, dons mediunicos, caminho de despertar, praticas e portais espirituais alinhados ao mapa.",
    suggestionHeading: "Praticas espirituais sugeridas",
    suggestionGuide:
      "praticas, tradicoes, rituais e ferramentas espirituais alinhadas a esta alma (ex: 'Meditacao vipassana', 'Trabalho com Tarot de Marselha', 'Yoga kundalini', 'Escrita automatica', 'Reiki nivel 1'). Cada sugestao precisa explicar POR QUE combina com o mapa e a numerologia dela.",
  },
  finance: {
    title: "Questoes Financeiras",
    subtitle: "Sua relacao com dinheiro, prosperidade e abundancia",
    focus:
      "padroes financeiros, crencas de escassez/abundancia, talentos monetizaveis, ciclos de prosperidade, areas de investimento e bloqueios financeiros inscritos no mapa e na numerologia.",
    suggestionHeading: "Praticas e direcoes financeiras sugeridas",
    suggestionGuide:
      "praticas concretas de gestao financeira, mentalidade de prosperidade, fontes de renda alinhadas, posturas com dinheiro e estrategias de investimento (ex: 'Renda recorrente em consultoria', 'Reserva de emergencia em 6 meses', 'Estudo de investimentos de longo prazo', 'Ritual de gratidao financeira semanal'). Cada sugestao precisa explicar POR QUE combina com o mapa e a numerologia dela.",
  },
  family: {
    title: "Vida Familiar",
    subtitle: "Dinamicas do lar, ancestralidade e harmonizacao familiar",
    focus:
      "padroes familiares herdados, ferida ancestral, papel no clã, relacao com pai/mae/irmaos/filhos, dinamicas do lar e caminhos de cura familiar a partir do mapa e da numerologia.",
    suggestionHeading: "Praticas familiares e ancestrais sugeridas",
    suggestionGuide:
      "praticas de harmonizacao familiar, conversas a ter, rituais ancestrais, posturas no lar e dinamicas para cultivar com pais, parceiros, filhos e irmaos (ex: 'Constelacao familiar', 'Carta de reconciliacao a um ancestral', 'Ritual de protecao do lar', 'Rotina de jantar consciente em familia'). Cada sugestao precisa explicar POR QUE combina com o mapa e a numerologia dela.",
  },
  health: {
    title: "Saude",
    subtitle: "Vitalidade do corpo, mente e espirito",
    focus:
      "tendencias de vitalidade, pontos sensiveis do corpo, padroes emocionais que afetam a saude, ritmo ideal de vida e abordagens de cuidado integrativo (corpo-mente-espirito) sugeridos pelo mapa e pela numerologia. Nunca dar diagnostico clinico.",
    suggestionHeading: "Praticas de saude sugeridas",
    suggestionGuide:
      "praticas de saude integrativa, rotinas de sono, alimentacao, movimento, terapias complementares e ritmos diarios (ex: 'Yoga restaurativa 2x/semana', 'Alimentacao anti-inflamatoria', 'Acupuntura mensal', 'Caminhada solar matinal de 20 min'). Cada sugestao precisa explicar POR QUE combina com o mapa e a numerologia dela e reforce sempre que nao substitui acompanhamento medico.",
  },
  friendships: {
    title: "Amizades",
    subtitle: "Seus vinculos sociais e a tribo que voce esta chamado a viver",
    focus:
      "padroes sociais, tipo de amizade que voce atrai e oferece, comportamento em grupo, lideranca social, feridas de pertencimento e como cultivar circulos verdadeiros segundo o mapa e a numerologia.",
    suggestionHeading: "Praticas e perfis de amizade sugeridos",
    suggestionGuide:
      "perfis de amigos que tendem a complementar/harmonizar (ex: 'Amigos com Lua em signo de fogo', 'Pessoas Caminho de Vida 7'), espacos sociais saudaveis, praticas de cultivo de vinculo e posturas em grupo (ex: 'Circulos de mulheres/homens', 'Encontros mensais de livro', 'Conversas de vulnerabilidade'). Cada sugestao precisa explicar POR QUE combina com o mapa e a numerologia dela.",
  },
};

const SIGNS_LABEL: Record<string, string> = {
  "Áries": "Aries","Touro":"Touro","Gêmeos":"Gemeos","Câncer":"Cancer",
  "Leão":"Leao","Virgem":"Virgem","Libra":"Libra","Escorpião":"Escorpiao",
  "Sagitário":"Sagitario","Capricórnio":"Capricornio","Aquário":"Aquario","Peixes":"Peixes",
};

const SectionPlanSchema = z.object({
  improve: z.array(z.string().min(3)).length(7),
  avoid: z.array(z.string().min(3)).length(7),
  follow: z.array(z.string().min(3)).length(7),
});

const SwotSchema = z.object({
  strengths: z.array(z.string().min(3)).length(3),
  weaknesses: z.array(z.string().min(3)).length(3),
  opportunities: z.array(z.string().min(3)).length(3),
  threats: z.array(z.string().min(3)).length(3),
});

const RecommendationsSchema = z.object({
  improve: z.array(z.string().min(3)).length(3),
  avoid: z.array(z.string().min(3)).length(3),
  follow: z.array(z.string().min(3)).length(3),
});

const SuggestionsSchema = z.object({
  intro: z.string().optional(),
  items: z.array(z.object({ name: z.string().min(2), why: z.string().min(20) })).length(5),
});

const SectionBodyOutput = z.object({
  title: z.string().min(2),
  body: z.string().min(120),
});

const SectionPlanOutput = z.object({
  plan: SectionPlanSchema,
});

const SectionOutput = z.object({
  title: z.string().min(2),
  body: z.string().min(120),
  plan: SectionPlanSchema,
});

const BaseAiOutput = z.object({
  intro: z.string().min(120),
  sectionBlueprints: z.array(z.object({ title: z.string().min(2), focus: z.string().min(30) })).length(3),
  closing: z.string().min(80),
  swot: SwotSchema,
  recommendations: RecommendationsSchema,
  suggestions: SuggestionsSchema,
  summary: z.string().min(120),
});

const AiOutput = z.object({
  intro: z.string().min(120),
  sections: z.array(SectionOutput).length(3),
  closing: z.string().min(80),
  swot: SwotSchema,
  recommendations: RecommendationsSchema,
  suggestions: SuggestionsSchema,
  summary: z.string().min(120),
});

export const generateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ kind: KIND }).parse(d))
  .handler(async function* ({ data, context }) {
    const { supabase, userId } = context;
    yield { type: "progress" as const, progress: 5, step: "Carregando seus dados cósmicos..." };


    // 1) Load user context
    const [{ data: birth }, { data: chart }, { data: settings }, { data: brandRow }, { data: brandingSub }] = await Promise.all([
      supabase.from("birth_data").select("*").eq("user_id", userId).eq("is_primary", true).maybeSingle(),
      supabase.from("astro_charts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("pdf_branding").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_subscriptions").select("status").eq("user_id", userId).eq("addon_id", "sub_branding_pdf").eq("status", "active").maybeSingle(),
    ]);
    const brandingAddonActive = !!brandingSub;

    if (!birth) {
      throw new Error("Complete seus dados de nascimento antes de gerar relatorios.");
    }

    // Charge credits unless user has unlimited reports subscription
    const action: CreditAction = `report_${data.kind}` as CreditAction;
    const unlimited = await hasUnlimitedAccess(userId, action);
    let charged = false;
    if (!unlimited) {
      const cost = await getCreditCost(action);
      const ok = await consumeCredits(userId, action, `Relatório ${data.kind}`);
      if (!ok) {
        throw new Error(
          `Saldo insuficiente. Este relatório custa ${cost} créditos. Compre mais em /addons.`,
        );
      }
      charged = true;
    }

    try {

    const num = computeNumerology(birth.full_name, birth.birth_date);
    const meta = REPORT_META[data.kind];
    yield { type: "progress" as const, progress: 18, step: "Calculando numerologia e mapa astral..." };


    // Build context block for the AI
    type Planet = { name: string; sign: string; degree: number };
    type Aspect = { a: string; b: string; aspect: string; orb: number };
    const planets = (chart?.planets as Planet[] | undefined) ?? [];
    const aspects = (chart?.aspects as Aspect[] | undefined) ?? [];

    let astroBlock = "(Mapa astral ainda nao calculado)";
    if (planets.length) {
      const priorityPlanets = ["Sol", "Lua", "Mercurio", "Venus", "Marte", "Jupiter", "Saturno"];
      const compactPlanets = priorityPlanets
        .map((name) => planets.find((p) => p.name === name))
        .filter((p): p is Planet => Boolean(p));

      astroBlock = (compactPlanets.length ? compactPlanets : planets.slice(0, 7))
        .map((p) => `- ${p.name}: ${p.sign}`)
        .join("\n");

      if (aspects.length) {
        astroBlock +=
          "\n\nAspectos principais:\n" +
          aspects
            .slice(0, 6)
            .map((a) => `- ${a.a} ${a.aspect} ${a.b}`)
            .join("\n");
      }
    }

    const numBlock = [
      `Caminho de Vida ${numLabel(num.life_path)} (${numTitle(num.life_path)})`,
      `Destino ${numLabel(num.destiny)} (${numTitle(num.destiny)})`,
      `Alma ${numLabel(num.soul_urge)} (${numTitle(num.soul_urge)})`,
      `Personalidade ${numLabel(num.personality)} (${numTitle(num.personality)})`,
    ].join(" | ");

    const sun = planets.find((p) => p.name === "Sol");
    const moon = planets.find((p) => p.name === "Lua");
    const ascSign =
      chart?.ascendant != null
        ? `Asc ${Math.floor(((Number(chart.ascendant) % 360) + 360) % 360 / 30)}`
        : null;
    const signLine = [
      sun ? `Sol em ${SIGNS_LABEL[sun.sign] ?? sun.sign}` : null,
      moon ? `Lua em ${SIGNS_LABEL[moon.sign] ?? moon.sign}` : null,
      ascSign ? "Ascendente calculado" : null,
    ]
      .filter(Boolean)
      .join("  -  ");

    // 2) Choose AI provider
    const provider = settings?.ai_provider ?? "lovable";
    const customKey = settings?.custom_ai_key as string | null;
    const customModel = (settings?.custom_ai_model as string | null) ?? null;
    const isCustomProvider = ["openai", "anthropic", "gemini"].includes(provider) && !!customKey;

    let modelName = customModel ?? "google/gemini-3-flash-preview";
    const lovableKey = process.env.LOVABLE_API_KEY;

    const makeModel = (candidate: string): ReturnType<ReturnType<typeof createLovableAiGatewayProvider>> => {
      if (provider === "openai" && customKey) {
        return createOpenAIProvider(customKey)(candidate);
      }
      if (provider === "anthropic" && customKey) {
        return createAnthropicProvider(customKey)(candidate);
      }
      if (provider === "gemini" && customKey) {
        return createGeminiProvider(customKey)(candidate);
      }
      if (!lovableKey) throw new Error("LOVABLE_API_KEY ausente");
      return createLovableAiGatewayProvider(lovableKey)(candidate);
    };

    if (provider === "openai" && customKey) {
      modelName = customModel ?? "gpt-5-mini";
    } else if (provider === "anthropic" && customKey) {
      modelName = customModel ?? "claude-3-5-sonnet-20241022";
    } else if (provider === "gemini" && customKey) {
      modelName = customModel ?? "gemini-2.5-flash";
    } else {
      modelName = customModel?.startsWith("google/") ? customModel : "google/gemini-2.5-flash";
    }

    let model = makeModel(modelName);

    // 3) Generate humanized structured content
    const firstName = String(birth.full_name).trim().split(/\s+/)[0] ?? "";

    const system = `Voce e o Oraculo Cosmico, um escritor espiritual premium em portugues do Brasil.
Escreva com profundidade, calor humano e linguagem simples.
Sempre traduza termos tecnicos na mesma frase, entre parenteses, com no maximo 10 palavras.
Frases curtas. Sem markdown. Sem emojis. Sem prometer eventos certos. Sem diagnostico clinico.`;

    const reportContext = `Relatorio: ${meta.title}
Foco: ${meta.focus}

Consulente:
- Nome completo (usar so 1x na intro): ${birth.full_name}
- Primeiro nome (usar depois): ${firstName}
- Nascimento: ${birth.birth_date}${birth.birth_time ? ` ${birth.birth_time}` : ""}
- Local: ${birth.city ?? ""}${birth.country ? ", " + birth.country : ""}

Numerologia:
${numBlock}

Mapa astral:
${astroBlock}`;

    // Robust call: per-attempt timeout + fallback model on persistent upstream timeouts.
    const skippedModels = new Set<string>();

    const getFallbackModels = () => {
      const candidates = (
        provider === "openai" && customKey
          ? [modelName, "gpt-5-mini", "gpt-5-nano"]
          : provider === "gemini" && customKey
            ? [modelName, "gemini-2.5-flash", "gemini-2.0-flash"]
            : provider === "anthropic" && customKey
              ? [modelName, "claude-3-5-sonnet-20241022"]
              : !isCustomProvider && lovableKey
                ? [modelName, "google/gemini-3-flash-preview", "google/gemini-3.1-flash-lite-preview"]
                : [modelName]
      ).filter((candidate, index, arr) => arr.indexOf(candidate) === index);

      return candidates.filter((candidate) => !skippedModels.has(candidate));
    };

    async function callWithRetry({
      prompt,
      timeoutMs,
      errorMessage,
    }: {
      prompt: string;
      timeoutMs: number;
      errorMessage: string;
    }) {
      let lastErr: unknown;
      const fallbackModels = getFallbackModels();
      for (const candidate of fallbackModels) {
        const candidateModel = candidate === modelName ? model : makeModel(candidate);
        const ac = new AbortController();
        let didTimeout = false;
        const timer = setTimeout(() => {
          didTimeout = true;
          ac.abort();
        }, timeoutMs);
        const startedAt = Date.now();
        try {
          console.info(`[reports] AI stage start (model=${candidate}, timeout=${timeoutMs}ms)`);
          const res = await Promise.race([
            generateText({
              model: candidateModel,
              system,
              prompt,
              abortSignal: ac.signal,
              maxRetries: 0,
            }),
            new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error(`AI timeout after ${timeoutMs}ms`)), timeoutMs + 50);
            }),
          ]);
          console.info(`[reports] AI stage done (model=${candidate}, elapsed=${Date.now() - startedAt}ms)`);
          modelName = candidate;
          model = candidateModel;
          return res.text;
        } catch (e) {
          lastErr = e;
          const rawMessage = e instanceof Error ? e.message : String(e);
          const msg = rawMessage.toLowerCase();
          const retriable =
            didTimeout ||
            msg.includes("timeout") ||
            msg.includes("aborted") ||
            msg.includes("upstream") ||
            msg.includes("unsupported parameter") ||
            msg.includes("not supported with this model") ||
            msg.includes("502") ||
            msg.includes("503") ||
            msg.includes("504") ||
            msg.includes("econnreset") ||
            msg.includes("network");
          console.error(
            `[reports] AI attempt failed (model=${candidate}, elapsed=${Date.now() - startedAt}ms)`,
            rawMessage,
          );
          if (retriable) {
            skippedModels.add(candidate);
            if (candidate === modelName) {
              const nextFastModel = fallbackModels.find((item) => item !== candidate && !skippedModels.has(item));
              if (nextFastModel) {
                modelName = nextFastModel;
                model = makeModel(nextFastModel);
              }
            }
          }
          if (!retriable) throw e;
        } finally {
          clearTimeout(timer);
          ac.abort();
        }
      }

      throw lastErr instanceof Error
        ? new Error(errorMessage)
        : new Error("Falha temporaria na IA. Tente novamente.");
    }

    function cleanInlineText(value: unknown) {
      return String(value ?? "")
        .replace(/```(?:json)?/gi, "")
        .replace(/```/g, "")
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\u2026/g, "...")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function extractJsonCandidates(text: string) {
      const trimmed = text.trim();
      const candidates = new Set<string>();
      if (trimmed) candidates.add(trimmed);

      const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fence?.[1]) candidates.add(fence[1].trim());

      for (const [open, close] of [["{", "}"], ["[", "]"]] as const) {
        const start = trimmed.indexOf(open);
        const end = trimmed.lastIndexOf(close);
        if (start >= 0 && end > start) {
          candidates.add(trimmed.slice(start, end + 1).trim());
        }
      }

      return [...candidates].map((candidate) => cleanInlineText(candidate));
    }

    function tryRepairJson(s: string): string {
      let r = cleanInlineText(s)
        .replace(/,\s*([}\]])/g, "$1")
        .replace(/:\s*undefined\b/g, ": null")
        .replace(/\r?\n/g, " ")
        .replace(/\t/g, " ");

      const quotes = (r.match(/"/g) || []).length;
      if (quotes % 2 === 1) r += '"';
      const opens = (r.match(/\{/g) || []).length;
      const closes = (r.match(/\}/g) || []).length;
      const opensB = (r.match(/\[/g) || []).length;
      const closesB = (r.match(/\]/g) || []).length;
      r = r.replace(/,\s*$/, "");
      r += "]".repeat(Math.max(0, opensB - closesB));
      r += "}".repeat(Math.max(0, opens - closes));
      return r;
    }

    function parseJsonLenient(text: string) {
      let lastError: unknown;
      for (const candidate of extractJsonCandidates(text)) {
        for (const variant of [candidate, tryRepairJson(candidate)]) {
          try {
            return JSON.parse(variant);
          } catch (error) {
            lastError = error;
          }
        }
      }

      throw lastError instanceof Error ? lastError : new Error("Falha ao interpretar JSON da IA");
    }

    function normalizePlanList(value: unknown) {
      const arr = Array.isArray(value) ? value : [];
      return arr
        .map((item, index) => {
          const text = cleanInlineText(item);
          const fallback = `Dia ${index + 1}: Aja com clareza e constância.`;
          if (!text) return fallback;
          return /^dia\s+\d+:/i.test(text) ? text : `Dia ${index + 1}: ${text}`;
        })
        .filter(Boolean)
        .slice(0, 7);
    }

    function normalizeStringList(value: unknown, size: number, fallbackFactory: (index: number) => string) {
      const items = (Array.isArray(value) ? value : [])
        .map((item) => cleanInlineText(typeof item === "string" ? item : typeof item === "object" && item ? Object.values(item).join(" ") : item))
        .filter(Boolean)
        .slice(0, size);

      while (items.length < size) {
        items.push(fallbackFactory(items.length));
      }

      return items;
    }

    function createFallbackBasePayload() {
      const blueprintDefaults = [
        {
          title: `Panorama de ${meta.title}`,
          focus: `Leitura geral sobre ${meta.focus}`,
        },
        {
          title: "Padrões e bloqueios centrais",
          focus: `Identificar sombras, travas e repetições dentro de ${meta.focus}`,
        },
        {
          title: "Direções práticas para o próximo ciclo",
          focus: `Traduzir ${meta.focus} em movimentos concretos, maduros e sustentáveis`,
        },
      ];

      return {
        intro: `${firstName}, este relatório traduz seu mapa astral e sua numerologia para a área de ${meta.title.toLowerCase()}. A proposta aqui é revelar padrões, potenciais e tensões com linguagem clara e humana. Você receberá uma leitura simbólica, mas também prática, para transformar percepção em direção concreta.`,
        sectionBlueprints: blueprintDefaults,
        closing: `${firstName}, seu mapa não é sentença: ele mostra tendências, forças e aprendizados. O essencial agora é usar essa clareza com presença, consistência e escolhas mais alinhadas ao que deseja construir.`,
        swot: {
          strengths: normalizeStringList([], 3, () => "Sensibilidade para perceber padrões importantes."),
          weaknesses: normalizeStringList([], 3, () => "Tendência a oscilar entre impulso e excesso de análise."),
          opportunities: normalizeStringList([], 3, () => "Momento fértil para reorganizar prioridades com consciência."),
          threats: normalizeStringList([], 3, () => "Ruídos emocionais e dispersão podem atrasar decisões."),
        },
        recommendations: {
          improve: normalizeStringList([], 3, () => "Transforme percepção em rotina simples e contínua."),
          avoid: normalizeStringList([], 3, () => "Evite decisões apressadas guiadas por carência ou medo."),
          follow: normalizeStringList([], 3, () => "Siga o que amplia estabilidade, presença e coerência."),
        },
        suggestions: {
          intro: `${firstName}, estas direções ajudam a ancorar sua leitura no cotidiano.`,
          items: Array.from({ length: 5 }, (_, index) => ({
            name: `${meta.suggestionHeading} ${index + 1}`,
            why: `Esta sugestão reforça ${meta.focus} de forma prática, ajudando ${firstName} a criar consistência, clareza e escolhas mais alinhadas ao próprio mapa e numerologia.`,
          })),
        },
        summary: `${firstName}, a síntese da sua leitura mostra potenciais reais, pontos de atenção e caminhos de amadurecimento. Quando você honra seu ritmo, organiza a energia e faz escolhas conscientes, ${meta.title.toLowerCase()} tende a se tornar uma área de crescimento e não de desgaste.`,
      };
    }

    function normalizeBasePayload(parsed: unknown) {
      const fallback = createFallbackBasePayload();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;

      const record = parsed as Record<string, unknown>;
      const swot = (record.swot && typeof record.swot === "object" && !Array.isArray(record.swot) ? record.swot : {}) as Record<string, unknown>;
      const recommendations = (record.recommendations && typeof record.recommendations === "object" && !Array.isArray(record.recommendations)
        ? record.recommendations
        : {}) as Record<string, unknown>;
      const suggestions = (record.suggestions && typeof record.suggestions === "object" && !Array.isArray(record.suggestions)
        ? record.suggestions
        : {}) as Record<string, unknown>;
      const sectionBlueprints = Array.isArray(record.sectionBlueprints) ? record.sectionBlueprints : [];

      return {
        intro: cleanInlineText(record.intro) || fallback.intro,
        sectionBlueprints: normalizeStringList(sectionBlueprints, 3, (index) => fallback.sectionBlueprints[index]?.title ?? `Capítulo ${index + 1}`).map((title, index) => {
          const source = sectionBlueprints[index];
          if (source && typeof source === "object" && !Array.isArray(source)) {
            const sourceRecord = source as Record<string, unknown>;
            return {
              title: cleanInlineText(sourceRecord.title) || title,
              focus: cleanInlineText(sourceRecord.focus) || fallback.sectionBlueprints[index]?.focus || fallback.sectionBlueprints[0].focus,
            };
          }

          return fallback.sectionBlueprints[index] ?? { title, focus: fallback.sectionBlueprints[0].focus };
        }),
        closing: cleanInlineText(record.closing) || fallback.closing,
        swot: {
          strengths: normalizeStringList(swot.strengths, 3, (index) => fallback.swot.strengths[index]),
          weaknesses: normalizeStringList(swot.weaknesses, 3, (index) => fallback.swot.weaknesses[index]),
          opportunities: normalizeStringList(swot.opportunities, 3, (index) => fallback.swot.opportunities[index]),
          threats: normalizeStringList(swot.threats, 3, (index) => fallback.swot.threats[index]),
        },
        recommendations: {
          improve: normalizeStringList(recommendations.improve, 3, (index) => fallback.recommendations.improve[index]),
          avoid: normalizeStringList(recommendations.avoid, 3, (index) => fallback.recommendations.avoid[index]),
          follow: normalizeStringList(recommendations.follow, 3, (index) => fallback.recommendations.follow[index]),
        },
        suggestions: {
          intro: cleanInlineText(suggestions.intro) || fallback.suggestions.intro,
          items: normalizeStringList(suggestions.items, 5, (index) => fallback.suggestions.items[index].why).map((item, index) => {
            const source = Array.isArray(suggestions.items) ? suggestions.items[index] : null;
            if (source && typeof source === "object" && !Array.isArray(source)) {
              const sourceRecord = source as Record<string, unknown>;
              return {
                name: cleanInlineText(sourceRecord.name) || fallback.suggestions.items[index].name,
                why: cleanInlineText(sourceRecord.why) || item || fallback.suggestions.items[index].why,
              };
            }

            return {
              name: fallback.suggestions.items[index].name,
              why: item || fallback.suggestions.items[index].why,
            };
          }),
        },
        summary: cleanInlineText(record.summary) || fallback.summary,
      };
    }

    function createLocalSectionPlan(
      blueprint: z.infer<typeof BaseAiOutput>["sectionBlueprints"][number],
      sectionBody: string,
    ) {
      const cleanBody = sectionBody.replace(/\s+/g, " ").trim();
      const shortBody = cleanBody.slice(0, 220);
      const makeItems = (prefix: string, seed: string) =>
        Array.from({ length: 7 }, (_, index) => `Dia ${index + 1}: ${prefix} ${seed}`.trim());

      const focusSeed = blueprint.focus.replace(/[.;:]+$/g, "").slice(0, 90);
      const bodySeed = shortBody
        ? `apoiado no que surgiu em "${shortBody}${cleanBody.length > 220 ? "..." : ""}"`
        : `seguindo o foco em ${focusSeed}`;

      return {
        plan: {
          improve: makeItems("Fortaleça uma ação prática", bodySeed),
          avoid: makeItems("Evite excessos e decisões impulsivas", `para proteger ${focusSeed}`),
          follow: makeItems("Mantenha constância no que já funciona", `e aprofunde ${focusSeed}`),
        },
      };
    }

    function normalizeSectionPayload(parsed: unknown, blueprint?: z.infer<typeof BaseAiOutput>["sectionBlueprints"][number]) {
      const fallbackTitle = cleanInlineText(blueprint?.title) || "Capítulo";
      const fallbackBody = cleanInlineText(blueprint?.focus)
        ? `${firstName}, esta parte do relatório aprofunda ${cleanInlineText(blueprint?.focus)} com base no seu mapa e na sua numerologia. O objetivo é transformar símbolos em percepção prática, para que você reconheça padrões, ajuste escolhas e avance com mais consciência no próximo ciclo.`
        : `${firstName}, esta parte do relatório aprofunda a leitura do seu mapa e da sua numerologia com linguagem prática e humana. A intenção é te oferecer clareza, direção e consciência para agir com mais coerência.`;

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {
          title: fallbackTitle,
          body: fallbackBody,
        };
      }

      const record = parsed as Record<string, unknown>;
      return {
        title: cleanInlineText(record.title) || fallbackTitle,
        body: cleanInlineText(record.body) || fallbackBody,
      };
    }

    function parseJsonWithSchema<T>(
      text: string,
      schema: z.ZodType<T>,
      label: string,
      options?: {
        normalize?: (parsed: unknown) => unknown;
        fallback?: T;
      },
    ): T {
      let parsed: unknown;
      try {
        parsed = parseJsonLenient(text);
      } catch (e) {
        console.error(`[reports] JSON parse failed (${label})`, e, "len=", text.length, "tail=", text.slice(-300));
        if (options?.fallback) {
          console.info(`[reports] using fallback payload after parse failure (${label})`);
          return schema.parse(options.fallback);
        }
        throw new Error("A IA devolveu um formato invalido. Tente novamente.");
      }

      if (options?.normalize) {
        parsed = options.normalize(parsed);
      }

      const result = schema.safeParse(parsed);
      if (result.success) return result.data;

      console.error(`[reports] schema validation failed (${label})`, result.error);
      if (options?.fallback) {
        console.info(`[reports] using fallback payload after schema failure (${label})`);
        return schema.parse(options.fallback);
      }

      throw new Error("A IA devolveu um formato invalido. Tente novamente.");
    }

    const compactSectionContext = `Relatorio: ${meta.title}
Foco geral: ${meta.focus}
Nome para tratamento: ${firstName}
Numerologia: ${numBlock}
Assinatura astral: ${signLine || astroBlock}`;

    const basePrompt = `${reportContext}

Monte apenas a ESTRUTURA BASE do relatório e responda APENAS com JSON valido neste formato:
{
  "intro": "2 paragrafos em linguagem simples",
  "sectionBlueprints": [
    { "title": "Titulo 1", "focus": "Qual o foco pratico desta secao" },
    { "title": "Titulo 2", "focus": "Qual o foco pratico desta secao" },
    { "title": "Titulo 3", "focus": "Qual o foco pratico desta secao" }
  ],
  "closing": "1 ou 2 paragrafos finais",
  "swot": {
    "strengths": ["...", "...", "..."],
    "weaknesses": ["...", "...", "..."],
    "opportunities": ["...", "...", "..."],
    "threats": ["...", "...", "..."]
  },
  "recommendations": {
    "improve": ["...", "...", "..."],
    "avoid": ["...", "...", "..."],
    "follow": ["...", "...", "..."]
  },
  "suggestions": {
    "intro": "1 frase curta para ${firstName}",
    "items": [
      { "name": "Sugestao 1", "why": "Por que combina com o mapa e numerologia" },
      { "name": "Sugestao 2", "why": "..." },
      { "name": "Sugestao 3", "why": "..." },
      { "name": "Sugestao 4", "why": "..." },
      { "name": "Sugestao 5", "why": "..." }
    ]
  },
  "summary": "Resumo final forte e simples"
}

Regras:
- sectionBlueprints precisa ter EXATAMENTE 3 itens, com temas diferentes e complementares.
- SWOT e recommendations devem ter EXATAMENTE 3 itens por lista.
- suggestions.items deve ter EXATAMENTE 5 itens.
- Tema das sugestoes: ${meta.suggestionGuide}
- Use o nome completo apenas 1x na intro. Depois, use apenas ${firstName}.`;

    const makeSectionBodyPrompt = (
      blueprint: z.infer<typeof BaseAiOutput>["sectionBlueprints"][number],
      index: number,
      blueprints: z.infer<typeof BaseAiOutput>["sectionBlueprints"],
    ) => `${compactSectionContext}

Escreva apenas o TEXTO da secao ${index + 1} de 3 do relatório.
Titulo da secao: ${blueprint.title}
Foco da secao: ${blueprint.focus}
Outras secoes para evitar repeticao: ${blueprints
      .filter((_, currentIndex) => currentIndex !== index)
      .map((item) => item.title)
      .join(", ")}

Responda APENAS com JSON valido neste formato:
{
  "title": "${blueprint.title}",
  "body": "2 ou 3 paragrafos claros, humanos e especificos para ${firstName}"
}

Regras:
- O body precisa ser especifico ao tema e ancorado no mapa/numerologia.
- Nao use o nome completo. Use apenas ${firstName}.`;

    yield { type: "progress" as const, progress: 28, step: "Montando a estrutura do relatório..." };
    const baseText = await callWithRetry({
      prompt: basePrompt,
      timeoutMs: 16_000,
      errorMessage: "A geração demorou além do limite. Tente novamente; agora o relatório usa um modo mais rápido.",
    });
    const base = parseJsonWithSchema(baseText, BaseAiOutput, "base");

    const sections: z.infer<typeof SectionOutput>[] = [];
    for (const [index, blueprint] of base.sectionBlueprints.entries()) {
      yield {
        type: "progress" as const,
        progress: 44 + index * 10,
        step: `Escrevendo capítulo ${index + 1} de 3...`,
      };
      const sectionBodyText = await callWithRetry({
        prompt: makeSectionBodyPrompt(blueprint, index, base.sectionBlueprints),
        timeoutMs: 7_500,
        errorMessage: "A geração demorou além do limite. Tente novamente; agora o relatório usa um modo mais rápido.",
      });
      const sectionBody = parseJsonWithSchema(sectionBodyText, SectionBodyOutput, `section-body-${index + 1}`);

      yield {
        type: "progress" as const,
        progress: 48 + index * 10,
        step: `Montando plano do capítulo ${index + 1}...`,
      };
      const sectionPlan = createLocalSectionPlan(blueprint, sectionBody.body);

      sections.push({
        title: sectionBody.title,
        body: sectionBody.body,
        plan: sectionPlan.plan,
      });
    }

    yield { type: "progress" as const, progress: 72, step: "Validando a leitura recebida..." };
    const ai = AiOutput.parse({
      intro: base.intro,
      sections,
      closing: base.closing,
      swot: base.swot,
      recommendations: base.recommendations,
      suggestions: base.suggestions,
      summary: base.summary,
    });

    // 4) Build PDF
    // Load branding logo bytes (if add-on enabled, kind is enabled, and a logo is configured)
    const kindEnabledMap: Record<z.infer<typeof KIND>, boolean> = {
      personality: brandRow?.enabled_personality ?? true,
      love: brandRow?.enabled_love ?? true,
      career: brandRow?.enabled_career ?? true,
      spiritual: brandRow?.enabled_spiritual ?? true,
      finance: true,
      family: true,
      health: true,
      friendships: true,
    };
    let brandingPayload: ReportData["branding"] = undefined;
    if (brandingAddonActive && brandRow?.enabled && kindEnabledMap[data.kind]) {
      let logoBytes: Uint8Array | undefined;
      let logoMime: "image/png" | "image/jpeg" | undefined;
      if (brandRow.logo_path) {
        try {
          const { data: blob } = await supabaseAdmin.storage
            .from("pdf-branding")
            .download(brandRow.logo_path);
          if (blob) {
            const ab = await blob.arrayBuffer();
            logoBytes = new Uint8Array(ab);
            logoMime = brandRow.logo_path.toLowerCase().endsWith(".png")
              ? "image/png"
              : "image/jpeg";
          }
        } catch (e) {
          console.error("[reports] failed to load branding logo", e);
        }
      }
      brandingPayload = {
        enabled: true,
        logoBytes,
        logoMime,
        logoWidth: brandRow.logo_width ?? 120,
        logoHeight: brandRow.logo_height ?? 60,
        displayName: brandRow.display_name,
        footerEnabled: brandRow.footer_enabled,
        footerName: brandRow.footer_name,
        footerSite: brandRow.footer_site,
        footerPhone: brandRow.footer_phone,
      };
    }

    const reportData: ReportData = {
      kind: data.kind,
      title: meta.title,
      subtitle: meta.subtitle,
      consultantName: birth.full_name,
      birthLine: `${formatBirthDateBR(birth.birth_date)}${
        birth.birth_time ? ` as ${String(birth.birth_time).slice(0, 5)}` : ""
      }${birth.city ? ` - ${birth.city}` : ""}`,
      signLine: signLine || "Mapa em construcao",
      numerologyLine: `Caminho ${numLabel(num.life_path)} - Destino ${numLabel(num.destiny)} - Alma ${numLabel(num.soul_urge)}`,
      intro: ai.intro,
      sections: ai.sections,
      closing: ai.closing,
      swot: ai.swot,
      recommendations: ai.recommendations,
      suggestions: {
        heading: meta.suggestionHeading,
        intro: ai.suggestions.intro,
        items: ai.suggestions.items,
      },
      summary: ai.summary,
      branding: brandingPayload,
    };

    yield { type: "progress" as const, progress: 82, step: "Diagramando seu PDF cinematográfico..." };
    const pdfBytes = await buildReportPdf(reportData);

    // 5) Upload to storage (admin client; bucket is private)
    yield { type: "progress" as const, progress: 92, step: "Salvando seu relatório..." };
    const path = `${userId}/${data.kind}-${Date.now()}.pdf`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("reports")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: false });
    if (upErr) {
      console.error("[reports] upload error", upErr);
      throw new Error("Falha ao salvar o PDF.");
    }

    // 6) Save row
    const summary = ai.intro.slice(0, 240);
    const { data: row, error: insErr } = await supabase
      .from("reports")
      .insert({
        user_id: userId,
        kind: data.kind,
        title: meta.title,
        storage_path: path,
        ai_model: modelName,
        summary,
      })
      .select()
      .single();
    if (insErr) console.error("[reports] insert error", insErr);

    // 7) Signed URL (valid 1h)
    const { data: signed } = await supabaseAdmin.storage
      .from("reports")
      .createSignedUrl(path, 60 * 60);

    yield {
      type: "done" as const,
      progress: 100,
      step: "Pronto!",
      result: {
        id: row?.id ?? null,
        kind: data.kind,
        title: meta.title,
        storagePath: path,
        signedUrl: signed?.signedUrl ?? null,
      },
    };
    return;
    } catch (err) {
      // Auto-refund on failure so user does not lose credits for a broken PDF.
      if (charged) {
        try {
          await refundCredits(userId, action, {
            reason:
              err instanceof Error
                ? `Falha na geração do relatório: ${err.message}`.slice(0, 200)
                : "Falha na geração do relatório",
            actorLabel: "system:reports",
            originalReference: `Relatório ${data.kind}`,
          });
        } catch (refundErr) {
          console.error("[reports] auto-refund failed", refundErr);
        }
      }
      throw err;
    }
  });

export const getReportUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("reports")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("Relatorio nao encontrado");
    const { data: signed } = await supabaseAdmin.storage
      .from("reports")
      .createSignedUrl(row.storage_path, 60 * 60);
    return { signedUrl: signed?.signedUrl ?? null };
  });

export const deleteReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("reports")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.storage_path) {
      await supabaseAdmin.storage.from("reports").remove([row.storage_path]);
    }
    await context.supabase.from("reports").delete().eq("id", data.id);
    return { ok: true };
  });
