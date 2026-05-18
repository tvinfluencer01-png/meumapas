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

const SectionOutput = z.object({
  title: z.string().min(2),
  body: z.string().min(140),
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
    const isLovable = provider === "lovable" || !(["openai", "anthropic", "gemini"].includes(provider) && customKey);
    const fallbackModels = (
      provider === "openai" && customKey
        ? [modelName, "gpt-5-mini", "gpt-5-nano"]
        : provider === "gemini" && customKey
          ? [modelName, "gemini-2.5-flash", "gemini-2.0-flash"]
          : isLovable && lovableKey
            ? [modelName, "google/gemini-2.5-flash", "google/gemini-3.1-flash-lite-preview"]
            : [modelName]
    ).filter((m, i, arr) => arr.indexOf(m) === i);

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
      for (const candidate of fallbackModels) {
        const candidateModel = candidate === modelName ? model : makeModel(candidate);
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), timeoutMs);
        try {
          const res = await generateText({
            model: candidateModel,
            system,
            prompt,
            abortSignal: ac.signal,
            maxRetries: 0,
          });
          modelName = candidate;
          model = candidateModel;
          return res.text;
        } catch (e) {
          lastErr = e;
          const msg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase();
          const retriable =
            msg.includes("timeout") ||
            msg.includes("aborted") ||
            msg.includes("upstream") ||
            msg.includes("502") ||
            msg.includes("503") ||
            msg.includes("504") ||
            msg.includes("econnreset") ||
            msg.includes("network");
          console.error(`[reports] AI attempt failed (model=${candidate})`, msg);
          if (!retriable) throw e;
        } finally {
          clearTimeout(timer);
        }
      }

      throw lastErr instanceof Error
        ? new Error(errorMessage)
        : new Error("Falha temporaria na IA. Tente novamente.");
    }

    function extractJsonText(text: string) {
      let jsonStr = text.trim();
      const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fence) jsonStr = fence[1].trim();
      const firstBrace = jsonStr.indexOf("{");
      if (firstBrace > 0) jsonStr = jsonStr.slice(firstBrace);
      const lastBrace = jsonStr.lastIndexOf("}");
      if (lastBrace >= 0 && lastBrace < jsonStr.length - 1) jsonStr = jsonStr.slice(0, lastBrace + 1);
      return jsonStr.replace(/[\u0000-\u001F]/g, " ");
    }

    function tryRepairJson(s: string): string {
      let r = s.replace(/,\s*([}\]])/g, "$1");
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

    function parseJsonWithSchema<T>(text: string, schema: z.ZodType<T>, label: string): T {
      const jsonStr = extractJsonText(text);
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        try {
          parsed = JSON.parse(tryRepairJson(jsonStr));
        } catch (e) {
          console.error(`[reports] JSON parse failed (${label})`, e, "len=", text.length, "tail=", text.slice(-300));
          throw new Error("A IA devolveu um formato invalido. Tente novamente.");
        }
      }

      try {
        return schema.parse(parsed);
      } catch (e) {
        console.error(`[reports] schema validation failed (${label})`, e);
        throw new Error("A IA devolveu um formato invalido. Tente novamente.");
      }
    }

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

    const makeSectionPrompt = (
      blueprint: z.infer<typeof BaseAiOutput>["sectionBlueprints"][number],
      index: number,
      blueprints: z.infer<typeof BaseAiOutput>["sectionBlueprints"],
    ) => `${reportContext}

Escreva apenas a secao ${index + 1} de 3 do relatório.
Titulo da secao: ${blueprint.title}
Foco da secao: ${blueprint.focus}
Outras secoes para evitar repeticao: ${blueprints
      .filter((_, currentIndex) => currentIndex !== index)
      .map((item) => item.title)
      .join(", ")}

Responda APENAS com JSON valido neste formato:
{
  "title": "${blueprint.title}",
  "body": "2 ou 3 paragrafos claros, humanos e especificos para ${firstName}",
  "plan": {
    "improve": ["Dia 1: ...", "Dia 2: ...", "Dia 3: ...", "Dia 4: ...", "Dia 5: ...", "Dia 6: ...", "Dia 7: ..."],
    "avoid": ["Dia 1: ...", "Dia 2: ...", "Dia 3: ...", "Dia 4: ...", "Dia 5: ...", "Dia 6: ...", "Dia 7: ..."],
    "follow": ["Dia 1: ...", "Dia 2: ...", "Dia 3: ...", "Dia 4: ...", "Dia 5: ...", "Dia 6: ...", "Dia 7: ..."]
  }
}

Regras:
- O body precisa ser especifico ao tema e ancorado no mapa/numerologia.
- Cada lista do plano deve ter EXATAMENTE 7 itens, de Dia 1 a Dia 7.
- Cada item deve ser curto, concreto e acionavel.
- Nao repita itens das outras secoes.
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
      const sectionText = await callWithRetry({
        prompt: makeSectionPrompt(blueprint, index, base.sectionBlueprints),
        timeoutMs: 10_000,
        errorMessage: "A geração demorou além do limite. Tente novamente; agora o relatório usa um modo mais rápido.",
      });
      sections.push(parseJsonWithSchema(sectionText, SectionOutput, `section-${index + 1}`));
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
