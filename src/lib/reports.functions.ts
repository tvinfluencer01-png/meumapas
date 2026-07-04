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
import { applyActiveChartFilter, resolveActiveSubject } from "@/lib/active-subject";
import { resolveActiveClientId } from "@/lib/client-profiles.functions";

const KIND = z.enum([
  "personality",
  "love",
  "career",
  "spiritual",
  "finance",
  "family",
  "health",
  "friendships",
  "synastry",
  "couple_numerology",
  "annual_forecast",
  "personal_kabbalah",
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
  synastry: {
    title: "Sinastria Amorosa",
    subtitle: "O encontro entre dois mapas: atrações, tensões e caminhos do casal",
    focus:
      "compatibilidade astrológica entre o consulente e o(a) parceiro(a): aspectos entre planetas dos dois mapas, dinâmica Sol/Lua/Vênus/Marte, pontos de atração, tensões inevitáveis, feridas espelhadas e caminhos concretos de harmonização do vínculo.",
    suggestionHeading: "Práticas sugeridas para o casal",
    suggestionGuide:
      "práticas de casal, rituais compartilhados, conversas específicas, terapias e posturas que ajudam esta combinação de mapas a florescer (ex: 'Rituais semanais de check-in emocional', 'Terapia integrativa de casal', 'Práticas de contato consciente'). Cada sugestão precisa explicar POR QUE combina com os dois mapas envolvidos.",
  },
  couple_numerology: {
    title: "Numerologia do Casal",
    subtitle: "A vibração numérica que une (e desafia) esta parceria",
    focus:
      "compatibilidade numerológica entre os dois nomes e datas: Caminhos de Vida somados, Destino compartilhado, vibração do casal, número da união, ciclos comuns, missão conjunta e desafios kármicos partilhados.",
    suggestionHeading: "Rituais e práticas numerológicas sugeridas ao casal",
    suggestionGuide:
      "práticas numerológicas para o casal (ex: 'Ritual mensal no dia da vibração 6', 'Escrita conjunta no ano pessoal comum', 'Meditações no número da união'). Cada sugestão precisa explicar POR QUE combina com a vibração numérica do casal.",
  },
  annual_forecast: {
    title: "Previsão Anual",
    subtitle: "Os trânsitos, ciclos e ano pessoal projetados para o próximo ciclo",
    focus:
      "previsão dos próximos 12 meses combinando ano pessoal numerológico, trânsitos planetários lentos sobre o mapa natal, ciclos de Júpiter e Saturno, temas dominantes de cada trimestre e janelas de decisão importantes.",
    suggestionHeading: "Práticas e movimentos sugeridos para o ano",
    suggestionGuide:
      "práticas mensais, decisões estratégicas, momentos de recolhimento e expansão, e movimentos concretos alinhados ao ano pessoal e aos trânsitos (ex: 'Reserva emocional em julho', 'Lançamento profissional na janela de Júpiter em casa 10'). Cada sugestão precisa explicar POR QUE combina com o ano-alvo desta pessoa.",
  },
  personal_kabbalah: {
    title: "Cabala Pessoal",
    subtitle: "Sua Árvore da Vida individual e o caminho iniciático inscrito no nome",
    focus:
      "leitura cabalística individual a partir do nome e da data: Sephirot dominantes e ausentes, caminho na Árvore da Vida, arquétipos hebraicos ativos, letras vibratórias do nome e trilhas iniciáticas de evolução espiritual pessoal.",
    suggestionHeading: "Práticas cabalísticas sugeridas",
    suggestionGuide:
      "meditações nas Sephirot pessoais, letras hebraicas para contemplação, salmos alinhados, rituais de purificação e estudos iniciáticos (ex: 'Meditação em Tiphareth às quartas', 'Contemplação da letra Aleph'). Cada sugestão precisa explicar POR QUE combina com a Árvore pessoal desta pessoa.",
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
  body: z.string().min(2200),
});

const SectionPlanOutput = z.object({
  plan: SectionPlanSchema,
});

const SectionOutput = z.object({
  title: z.string().min(2),
  body: z.string().min(2200),
  plan: SectionPlanSchema,
});

const BaseAiOutput = z.object({
  intro: z.string().min(2200),
  sectionBlueprints: z
    .array(z.object({ title: z.string().min(2), focus: z.string().min(60) }))
    .min(3)
    .max(6),
  closing: z.string().min(700),
  swot: SwotSchema,
  recommendations: RecommendationsSchema,
  suggestions: SuggestionsSchema,
  summary: z.string().min(900),
});

const AiOutput = z.object({
  intro: z.string().min(2200),
  sections: z.array(SectionBodyOutput).min(3).max(6),
  closing: z.string().min(700),
  swot: SwotSchema,
  recommendations: RecommendationsSchema,
  suggestions: SuggestionsSchema,
  summary: z.string().min(900),
});

/**
 * Perfil de tamanho por tipo de relatório.
 * Controla quantos capítulos são pedidos à IA e o mínimo de caracteres
 * por bloco, permitindo que cada tipo alcance a faixa de páginas alvo:
 *   - Grandes (25–40 pág): personality, spiritual, personal_kabbalah,
 *     annual_forecast, synastry — 5 capítulos, corpo denso.
 *   - Médios (22–32 pág): love, career, finance, family, health,
 *     friendships, couple_numerology — 4 capítulos.
 */
const REPORT_SIZE_PROFILE: Record<
  z.infer<typeof KIND>,
  { sections: number; introMin: number; sectionMin: number; closingMin: number; summaryMin: number; targetPagesLabel: string }
> = {
  personality:        { sections: 5, introMin: 3200, sectionMin: 3600, closingMin: 1000, summaryMin: 1400, targetPagesLabel: "30 a 40 páginas" },
  love:               { sections: 4, introMin: 2800, sectionMin: 3200, closingMin:  900, summaryMin: 1200, targetPagesLabel: "24 a 32 páginas" },
  career:             { sections: 4, introMin: 2800, sectionMin: 3200, closingMin:  900, summaryMin: 1200, targetPagesLabel: "24 a 32 páginas" },
  spiritual:          { sections: 5, introMin: 3200, sectionMin: 3400, closingMin: 1000, summaryMin: 1400, targetPagesLabel: "28 a 38 páginas" },
  finance:            { sections: 4, introMin: 2800, sectionMin: 3200, closingMin:  900, summaryMin: 1200, targetPagesLabel: "24 a 32 páginas" },
  family:             { sections: 4, introMin: 2800, sectionMin: 3200, closingMin:  900, summaryMin: 1200, targetPagesLabel: "24 a 32 páginas" },
  health:             { sections: 4, introMin: 2800, sectionMin: 3000, closingMin:  900, summaryMin: 1200, targetPagesLabel: "22 a 30 páginas" },
  friendships:        { sections: 4, introMin: 2600, sectionMin: 3000, closingMin:  800, summaryMin: 1100, targetPagesLabel: "22 a 30 páginas" },
  synastry:           { sections: 5, introMin: 3200, sectionMin: 3400, closingMin: 1000, summaryMin: 1400, targetPagesLabel: "28 a 38 páginas" },
  couple_numerology:  { sections: 4, introMin: 2800, sectionMin: 3200, closingMin:  900, summaryMin: 1200, targetPagesLabel: "24 a 32 páginas" },
  annual_forecast:    { sections: 5, introMin: 3200, sectionMin: 3400, closingMin: 1000, summaryMin: 1400, targetPagesLabel: "28 a 38 páginas" },
  personal_kabbalah:  { sections: 5, introMin: 3200, sectionMin: 3400, closingMin: 1000, summaryMin: 1400, targetPagesLabel: "28 a 38 páginas" },
};

/**
 * Ângulos obrigatórios por capítulo. Cada índice recebe um "foco
 * narrativo" distinto para reduzir sobreposição temática entre capítulos.
 * A ordem cobre 6 slots; usamos apenas os N primeiros conforme o perfil.
 */
const CHAPTER_ANGLES: string[] = [
  "PANORAMA SIMBÓLICO — mapeie o cenário geral do tema no mapa astral e na numerologia, apresentando os arquétipos ativos e a energia dominante do ciclo, sem repetir a abertura.",
  "PADRÕES E FERIDAS — investigue as tensões, repetições, sombras e feridas centrais que aparecem NESTA área específica, com aspectos e números concretos, sem repetir termos gerais já usados.",
  "DONS LATENTES E RECURSOS — foque nas forças, talentos e recursos ainda pouco explorados que o mapa revela para este tema, oferecendo exemplos práticos.",
  "MANIFESTAÇÃO NO COTIDIANO — mostre como esses símbolos aparecem no dia a dia (relacionamentos, rotina, corpo, decisões), com cenas concretas e observáveis.",
  "TRAVESSIA E PRÓXIMO CICLO — desenhe o convite evolutivo, o rito de passagem e as decisões maduras que o próximo ciclo pede especificamente nesta área.",
  "INTEGRAÇÃO FINAL — costure aprendizados de todos os capítulos anteriores em uma síntese viva que ainda entrega insights novos.",
];



export const generateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        kind: KIND,
        scope: z.enum(["self", "client"]).optional(),
        partner: z
          .object({
            full_name: z.string().min(2).max(120),
            birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          })
          .optional(),
        year: z.number().int().min(1900).max(2100).optional(),
      })
      .parse(d),
  )
  .handler(async function* ({ data, context }) {
    const { supabase, userId } = context;
    yield { type: "progress" as const, progress: 5, step: "Carregando seus dados cósmicos..." };


    // 1) Load active context — se scope="self", força usar o próprio usuário
    // (ignorando o cliente ativo). Caso contrário, usa o subject ativo.
    const subjectPromise: PromiseLike<any> =
      data.scope === "self"
        ? supabase
            .from("birth_data")
            .select("*")
            .eq("user_id", userId)
            .eq("is_primary", true)
            .maybeSingle()
            .then(({ data: b }: any) =>
              b
                ? {
                    kind: "self" as const,
                    client_profile_id: null,
                    birth_data_id: b.id,
                    full_name: b.full_name,
                    birth_date: b.birth_date,
                    birth_time: b.birth_time,
                    time_unknown: b.time_unknown,
                    city: b.city,
                    country: b.country,
                    latitude: b.latitude != null ? Number(b.latitude) : null,
                    longitude: b.longitude != null ? Number(b.longitude) : null,
                    timezone: b.timezone,
                  }
                : null,
            )
        : resolveActiveSubject(supabase, userId);

    const [{ data: settings }, { data: brandRow }, { data: brandingSub }, birth] = await Promise.all([
      supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("pdf_branding").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_subscriptions").select("status").eq("user_id", userId).eq("addon_id", "sub_branding_pdf").eq("status", "active").maybeSingle(),
      subjectPromise,
    ]);
    const brandingAddonActive = !!brandingSub;

    if (!birth) {
      throw new Error("Complete seus dados de nascimento antes de gerar relatorios.");
    }

    const chartBaseQuery = supabase
      .from("astro_charts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);
    const { data: chart } = await applyActiveChartFilter(
      chartBaseQuery,
      birth.client_profile_id,
    ).maybeSingle();

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

    const mercury = planets.find((p) => p.name === "Mercurio");
    const venus = planets.find((p) => p.name === "Venus");
    const mars = planets.find((p) => p.name === "Marte");
    const jupiter = planets.find((p) => p.name === "Jupiter");
    const saturn = planets.find((p) => p.name === "Saturno");
    const astroAnchors = [
      sun ? `Sol em ${SIGNS_LABEL[sun.sign] ?? sun.sign} (essência e identidade)` : null,
      moon ? `Lua em ${SIGNS_LABEL[moon.sign] ?? moon.sign} (emoções e necessidades)` : null,
      mercury ? `Mercúrio em ${SIGNS_LABEL[mercury.sign] ?? mercury.sign} (mente e linguagem)` : null,
      venus ? `Vênus em ${SIGNS_LABEL[venus.sign] ?? venus.sign} (afeto e vínculos)` : null,
      mars ? `Marte em ${SIGNS_LABEL[mars.sign] ?? mars.sign} (ação e desejo)` : null,
      jupiter ? `Júpiter em ${SIGNS_LABEL[jupiter.sign] ?? jupiter.sign} (expansão e confiança)` : null,
      saturn ? `Saturno em ${SIGNS_LABEL[saturn.sign] ?? saturn.sign} (limites e maturidade)` : null,
    ]
      .filter(Boolean)
      .join(", ");
    const aspectAnchors = aspects
      .slice(0, 4)
      .map((a) => `${a.a} ${a.aspect} ${a.b}`)
      .join(", ");
    const numerologyAnchors = `Caminho de Vida ${numLabel(num.life_path)}, Destino ${numLabel(num.destiny)}, Alma ${numLabel(num.soul_urge)} e Personalidade ${numLabel(num.personality)}`;
    const sizeProfile = REPORT_SIZE_PROFILE[data.kind];
    const CONTENT_MIN = {
      intro: sizeProfile.introMin,
      section: sizeProfile.sectionMin,
      closing: sizeProfile.closingMin,
      summary: sizeProfile.summaryMin,
    } as const;
    const chapterAngles = CHAPTER_ANGLES.slice(0, sizeProfile.sections);


    function ensureMinNarrativeLength(
      text: unknown,
      min: number,
      kind: keyof typeof CONTENT_MIN,
      focus: string,
    ) {
      let output = cleanInlineText(text);
      const supportParagraphs = [
        `${firstName}, quando olhamos com mais calma para ${focus}, reaparecem ${astroAnchors || "os símbolos centrais do seu mapa"}${aspectAnchors ? `, e aspectos como ${aspectAnchors} ajudam a explicar tensões, talentos e repetições que atravessam este tema.` : "."} ${numerologyAnchors} mostram como essa experiência pede presença, coerência e maturidade no cotidiano.`,
        `${firstName}, isso ganha corpo na prática porque sua vida não se move por uma peça só: ela nasce do encontro entre desejo, afeto, pensamento, ritmo e propósito. ${astroAnchors ? `Quando ${astroAnchors.toLowerCase()} se alinham, você encontra direção com mais verdade e menos ruído.` : "Quando suas forças internas se alinham, você encontra direção com mais verdade e menos ruído."}`,
        kind === "intro"
          ? `Esta abertura precisa nomear a espessura simbólica da sua travessia: ${numerologyAnchors} formam um eixo de sentido, enquanto ${aspectAnchors || "os principais movimentos do céu"} revelam onde a vida pede integração entre segurança, expressão, vínculo e ação.`
          : kind === "summary"
            ? `Na síntese, o mais importante é lembrar que seus símbolos não pedem pressa, e sim continuidade. ${numerologyAnchors} mostram que amadurecimento acontece quando consciência vira escolha, e escolha vira constância.`
            : `Por isso, esta leitura não termina na compreensão mental. Ela pede prática, repetição saudável e decisões alinhadas ao que o seu mapa e a sua numerologia já mostram como caminho de crescimento.`,
      ];

      let index = 0;
      while (output.length < min && index < supportParagraphs.length * 3) {
        output = `${output}${output ? " " : ""}${cleanInlineText(supportParagraphs[index % supportParagraphs.length])}`.trim();
        index += 1;
      }

      return output;
    }

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
      modelName = customModel ?? "gemini-2.5-flash-lite";
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

    // Extra context for couple/annual/kabbalah reports
    let extraContextBlock = "";
    if (data.partner && (data.kind === "synastry" || data.kind === "couple_numerology")) {
      const pnum = computeNumerology(data.partner.full_name, data.partner.birth_date);
      const partnerNumBlock = [
        `Caminho de Vida ${numLabel(pnum.life_path)} (${numTitle(pnum.life_path)})`,
        `Destino ${numLabel(pnum.destiny)} (${numTitle(pnum.destiny)})`,
        `Alma ${numLabel(pnum.soul_urge)} (${numTitle(pnum.soul_urge)})`,
        `Personalidade ${numLabel(pnum.personality)} (${numTitle(pnum.personality)})`,
      ].join(" | ");
      const partnerSunSign = (() => {
        const [, m, d] = data.partner.birth_date.split("-").map(Number);
        const c: [number, number, string][] = [
          [1,20,"Capricornio"],[2,19,"Aquario"],[3,21,"Peixes"],[4,20,"Aries"],
          [5,21,"Touro"],[6,21,"Gemeos"],[7,23,"Cancer"],[8,23,"Leao"],
          [9,23,"Virgem"],[10,23,"Libra"],[11,22,"Escorpiao"],[12,22,"Sagitario"],
        ];
        for (const [mm, dd, s] of c) if (m < mm || (m === mm && d <= dd)) return s;
        return "Capricornio";
      })();
      extraContextBlock = `

Parceiro(a) para análise conjunta:
- Nome completo: ${data.partner.full_name}
- Data de nascimento: ${data.partner.birth_date}
- Sol solar (por data): ${partnerSunSign}

Numerologia do(a) parceiro(a):
${partnerNumBlock}`;
    }
    if (data.kind === "annual_forecast") {
      const targetYear = data.year ?? new Date().getFullYear();
      const personalYear = (() => {
        const [, m, d] = birth.birth_date.split("-").map(Number);
        const sum = String(targetYear + m + d).split("").reduce((a: number, b) => a + Number(b), 0);
        let n = sum;
        while (n > 9 && n !== 11 && n !== 22) n = String(n).split("").reduce((a, b) => a + Number(b), 0);
        return n;
      })();
      extraContextBlock = `

Ano-alvo da previsão: ${targetYear}
Ano pessoal numerológico: ${personalYear} (${NUMBER_MEANINGS[personalYear]?.title ?? "—"})`;
    }

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
${astroBlock}${extraContextBlock}`;

    const getFallbackModels = () => {
      const candidates = (
        provider === "openai" && customKey
          ? [modelName, "gpt-5-mini"]
          : provider === "gemini" && customKey
            ? [modelName, "gemini-2.5-flash"]
            : provider === "anthropic" && customKey
              ? [modelName, "claude-3-5-sonnet-20241022"]
              : !isCustomProvider && lovableKey
                ? [modelName, "google/gemini-2.5-flash", "google/gemini-3-flash-preview"]
                : [modelName]
      ).filter((candidate, index, arr) => arr.indexOf(candidate) === index);

      return candidates;
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
        const startedAt = Date.now();
        // Hard wall-clock timeout. Uses AbortSignal.timeout which is honored
        // by fetch in Cloudflare Workers, plus a manual Promise.race fallback
        // in case the SDK swallows the abort signal.
        const signal = AbortSignal.timeout(timeoutMs);
        try {
          console.info(`[reports] AI stage start (model=${candidate}, timeout=${timeoutMs}ms)`);
          const text = await new Promise<string>((resolve, reject) => {
            const timer = setTimeout(
              () => reject(new Error(`AI timeout after ${timeoutMs}ms`)),
              timeoutMs + 200,
            );
            generateText({
              model: candidateModel,
              system,
              prompt,
              abortSignal: signal,
              maxRetries: 0,
            })
              .then((res) => {
                clearTimeout(timer);
                resolve(res.text);
              })
              .catch((err) => {
                clearTimeout(timer);
                reject(err);
              });
          });
          console.info(`[reports] AI stage done (model=${candidate}, elapsed=${Date.now() - startedAt}ms)`);
          modelName = candidate;
          model = candidateModel;
          return text;
        } catch (e) {
          lastErr = e;
          const rawMessage = e instanceof Error ? e.message : String(e);
          const msg = rawMessage.toLowerCase();
          const retriable =
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
          if (!retriable) throw e;
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
        intro: ensureMinNarrativeLength(
          `${firstName}, este relatório nasce do encontro entre o seu mapa astral e a sua numerologia, e abre uma leitura profunda sobre ${meta.title.toLowerCase()}. A proposta aqui não é entregar respostas prontas, mas iluminar os fios simbólicos que sustentam a sua vida nessa área. Você vai reconhecer padrões antigos, dons que ainda não foram nomeados e tensões que pedem cuidado. Cada parágrafo foi pensado para te oferecer linguagem, espelho e direção. Esta abertura te convida a respirar e olhar para si com mais verdade, antes de mergulhar nos próximos capítulos. O que vem a seguir é uma travessia: símbolo virando consciência, e consciência virando escolha concreta.`,
          CONTENT_MIN.intro,
          "intro",
          meta.focus,
        ),
        sectionBlueprints: blueprintDefaults,
        closing: ensureMinNarrativeLength(
          `${firstName}, seu mapa não é sentença: ele mostra tendências, forças e aprendizados. O essencial agora é usar essa clareza com presença, consistência e escolhas mais alinhadas ao que deseja construir. Permita que a leitura amadureça em silêncio, e volte a ela sempre que precisar reencontrar o seu eixo.`,
          CONTENT_MIN.closing,
          "closing",
          meta.focus,
        ),
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
        summary: ensureMinNarrativeLength(
          `${firstName}, a síntese da sua leitura mostra potenciais reais, pontos de atenção e caminhos de amadurecimento. Quando você honra seu ritmo, organiza a energia e faz escolhas conscientes, ${meta.title.toLowerCase()} tende a se tornar uma área de crescimento e não de desgaste. Volte a este resumo sempre que precisar reencontrar o eixo e lembrar do que já sabe sobre si.`,
          CONTENT_MIN.summary,
          "summary",
          meta.focus,
        ),
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
        intro: ensureMinNarrativeLength(cleanInlineText(record.intro) || fallback.intro, CONTENT_MIN.intro, "intro", meta.focus),
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
        closing: ensureMinNarrativeLength(cleanInlineText(record.closing) || fallback.closing, CONTENT_MIN.closing, "closing", meta.focus),
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
        summary: ensureMinNarrativeLength(cleanInlineText(record.summary) || fallback.summary, CONTENT_MIN.summary, "summary", meta.focus),
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
      const focusText = cleanInlineText(blueprint?.focus);
      const fallbackBody = ensureMinNarrativeLength(
        focusText
          ? `${firstName}, esta parte do relatório aprofunda ${focusText} a partir do seu mapa astral e da sua numerologia. O objetivo é traduzir os símbolos em percepção viva, para que você reconheça padrões reais, identifique tensões antigas e entenda o convite que esse momento está fazendo. Aqui não se trata de receita pronta, e sim de espelho: enxergar com mais nitidez como você se move nessa área da vida. Existem forças latentes no seu mapa que ainda pedem espaço para se manifestarem de forma madura, sem dramatização e sem fuga. Ao mesmo tempo, certas feridas tendem a aparecer como ruído ou repetição, e merecem ser olhadas com paciência. O próximo ciclo te convida a transformar consciência em prática constante, com escolhas mais coerentes ao que você é em essência.`
          : `${firstName}, esta parte do relatório aprofunda a leitura do seu mapa e da sua numerologia com linguagem prática e humana. A intenção é te oferecer clareza sobre os padrões que se repetem, as forças que pedem espaço e as feridas que ainda buscam cura. Cada parágrafo aqui foi pensado como um espelho que devolve direção. Use esta seção como um guia de campo: leia devagar, sinta o que ressoa, anote o que provoca. O essencial não é concordar com tudo, é reconhecer onde a sua vida está pedindo um novo gesto. O próximo ciclo te chama para escolhas mais coerentes e maduras.`,
        CONTENT_MIN.section,
        "section",
        focusText || meta.focus,
      );

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {
          title: fallbackTitle,
          body: fallbackBody,
        };
      }

      const record = parsed as Record<string, unknown>;
      return {
        title: cleanInlineText(record.title) || fallbackTitle,
        body: ensureMinNarrativeLength(cleanInlineText(record.body) || fallbackBody, CONTENT_MIN.section, "section", focusText || meta.focus),
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

Monte apenas a ESTRUTURA BASE do relatório com PROFUNDIDADE REAL e EXTENSÃO LONGA. Responda APENAS com JSON valido neste formato:
{
  "intro": "ABERTURA cinematográfica de 6 a 8 parágrafos longos (MÍNIMO 1800 caracteres no total, idealmente entre 2000 e 2600). Comece nomeando ${firstName} pelo nome completo e situando o momento de vida com poesia sóbria. Cite EXPLICITAMENTE Sol, Lua, Mercúrio, Vênus, Marte (e Júpiter/Saturno quando relevantes) com seus signos e o que cada um significa entre parênteses em até 10 palavras. Cite os aspectos principais nominalmente (ex: 'Sol Quadratura Lua') traduzindo entre parênteses. Conecte o Caminho de Vida, Destino, Alma e Personalidade ao tema do relatório. Mostre a tensão central que ${firstName} vive nessa área, o convite simbólico do mapa e o tom da jornada. Linguagem humana, viva, sem clichês esotéricos genéricos. NUNCA entregue menos de 1800 caracteres.",
  "sectionBlueprints": [
    { "title": "Titulo 1", "focus": "Foco aprofundado e específico desta seção (mínimo 60 caracteres)" },
    { "title": "Titulo 2", "focus": "Foco aprofundado e específico desta seção (mínimo 60 caracteres)" },
    { "title": "Titulo 3", "focus": "Foco aprofundado e específico desta seção (mínimo 60 caracteres)" }
  ],
  "closing": "ENCERRAMENTO de 3 a 4 parágrafos densos (MÍNIMO 500 caracteres). Costure de volta o fio simbólico da abertura, reconheça a complexidade da jornada e entregue uma bênção concreta a ${firstName}.",
  "swot": {
    "strengths": ["frase específica e ancorada no mapa", "...", "..."],
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
      { "name": "Sugestao 1", "why": "Por que combina com o mapa e numerologia (mínimo 40 caracteres)" },
      { "name": "Sugestao 2", "why": "..." },
      { "name": "Sugestao 3", "why": "..." },
      { "name": "Sugestao 4", "why": "..." },
      { "name": "Sugestao 5", "why": "..." }
    ]
  },
  "summary": "SÍNTESE final densa de 3 parágrafos (MÍNIMO 600 caracteres) que amarra os 3 capítulos, a SWOT e as recomendações em uma leitura única e memorável para ${firstName}."
}

Regras:
- sectionBlueprints precisa ter EXATAMENTE 3 itens, com temas diferentes e complementares, cada um digno de várias páginas.
- SWOT e recommendations devem ter EXATAMENTE 3 itens por lista, frases específicas (não genéricas).
- suggestions.items deve ter EXATAMENTE 5 itens.
- Tema das sugestoes: ${meta.suggestionGuide}
- Use o nome completo apenas 1x na intro. Depois, use apenas ${firstName}.
- Nada de respostas curtas, superficiais ou repetitivas. Profundidade e EXTENSÃO são obrigatórias.
- Se você entregar uma intro com menos de 1800 caracteres, o relatório será rejeitado.`;

    const makeSectionBodyPrompt = (
      blueprint: z.infer<typeof BaseAiOutput>["sectionBlueprints"][number],
      index: number,
      blueprints: z.infer<typeof BaseAiOutput>["sectionBlueprints"],
    ) => `${compactSectionContext}

Escreva apenas o TEXTO da secao ${index + 1} de 3 do relatório, com PROFUNDIDADE REAL.
Titulo da secao: ${blueprint.title}
Foco da secao: ${blueprint.focus}
Outras secoes para evitar repeticao: ${blueprints
      .filter((_, currentIndex) => currentIndex !== index)
      .map((item) => item.title)
      .join(", ")}

Responda APENAS com JSON valido neste formato:
{
  "title": "${blueprint.title}",
  "body": "7 a 9 parágrafos longos (MÍNIMO 1600 caracteres no total, ideal entre 1800 e 2400). Estruture assim: (1) abertura simbólica conectando o tema ao mapa e numerologia de ${firstName}, citando planetas, signos e números EXPLICITAMENTE; (2) análise dos padrões e tensões reais que aparecem, citando aspectos nominalmente; (3) sombra/ferida específica desta área com exemplo concreto; (4) força latente que pode ser ativada, com exemplo; (5) como esses elementos se manifestam no dia a dia; (6) direção prática e madura para o próximo ciclo. Use exemplos concretos, linguagem viva e cite nominalmente Sol, Lua, Vênus, Marte, Caminho de Vida, Destino, Alma quando relevantes."
}

Regras:
- O body precisa ser denso, específico ao tema e ancorado em planetas, signos ou números reais do mapa de ${firstName}, com MÍNIMO 1600 caracteres.
- Nada de frases genéricas ou repetitivas. Cada parágrafo entrega algo novo.
- Nao use o nome completo. Use apenas ${firstName}.
- Se o body tiver menos de 1600 caracteres, será rejeitado.`;

    yield { type: "progress" as const, progress: 28, step: "Montando a estrutura do relatório..." };
    let base: z.infer<typeof BaseAiOutput>;
    try {
      const baseText = await callWithRetry({
        prompt: basePrompt,
        timeoutMs: 45_000,
        errorMessage: "A geração demorou além do limite. Tente novamente.",
      });
      base = parseJsonWithSchema(baseText, BaseAiOutput, "base", {
        normalize: normalizeBasePayload,
        fallback: normalizeBasePayload(null) as z.infer<typeof BaseAiOutput>,
      });
    } catch (error) {
      console.error("[reports] base generation fallback", error);
      base = normalizeBasePayload(null) as z.infer<typeof BaseAiOutput>;
    }

    // Generate all 3 chapters in PARALLEL to avoid sequential wall-clock timeouts.
    // Each call has its own 40s timeout; running in parallel keeps total time ~40s
    // instead of ~120s, eliminating the "stuck at 60%" hang on the 2nd chapter.
    yield {
      type: "progress" as const,
      progress: 50,
      step: `Escrevendo os 3 capítulos em paralelo...`,
    };

    const sectionPromises = base.sectionBlueprints.map(async (blueprint, index) => {
      try {
        const sectionBodyText = await callWithRetry({
          prompt: makeSectionBodyPrompt(blueprint, index, base.sectionBlueprints),
          timeoutMs: 45_000,
          errorMessage: "A geração demorou além do limite. Tente novamente.",
        });
        return parseJsonWithSchema(sectionBodyText, SectionBodyOutput, `section-body-${index + 1}`, {
          normalize: (parsed) => normalizeSectionPayload(parsed, blueprint),
          fallback: normalizeSectionPayload(null, blueprint) as z.infer<typeof SectionBodyOutput>,
        });
      } catch (error) {
        console.error(`[reports] section generation fallback (${index + 1})`, error);
        return normalizeSectionPayload(null, blueprint) as z.infer<typeof SectionBodyOutput>;
      }
    });

    yield {
      type: "progress" as const,
      progress: 60,
      step: `Tecendo capítulo 1 de 3...`,
    };
    // Heartbeat yields so the client progress bar keeps moving while we await
    // the parallel chapter generations. These are cosmetic; the real work runs
    // concurrently in sectionPromises above.
    const heartbeatTimer = (async function* () {
      const steps = [
        { progress: 63, step: "Tecendo capítulo 2 de 3..." },
        { progress: 66, step: "Tecendo capítulo 3 de 3..." },
        { progress: 69, step: "Aguardando os últimos parágrafos..." },
      ];
      for (const s of steps) {
        await new Promise((r) => setTimeout(r, 8000));
        yield s;
      }
    })();

    const sectionsResultPromise = Promise.all(sectionPromises);
    let sectionsResolved: z.infer<typeof SectionBodyOutput>[] | null = null;
    sectionsResultPromise.then((r) => {
      sectionsResolved = r;
    });

    for await (const beat of heartbeatTimer) {
      if (sectionsResolved) break;
      yield { type: "progress" as const, ...beat };
    }

    const sectionsRaw = await sectionsResultPromise;
    const sections: { title: string; body: string }[] = sectionsRaw.map((s) => ({
      title: s.title,
      body: s.body,
    }));

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
      synastry: true,
      couple_numerology: true,
      annual_forecast: true,
      personal_kabbalah: true,
    };
    let brandingPayload: ReportData["branding"] = undefined;
    if (brandingAddonActive && brandRow?.enabled && kindEnabledMap[data.kind]) {
      async function loadAsset(path: string | null | undefined) {
        if (!path) return { bytes: undefined as Uint8Array | undefined, mime: undefined as "image/png" | "image/jpeg" | undefined };
        try {
          const { data: blob } = await supabaseAdmin.storage.from("pdf-branding").download(path);
          if (!blob) return { bytes: undefined, mime: undefined };
          const ab = await blob.arrayBuffer();
          const mime: "image/png" | "image/jpeg" = path.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
          return { bytes: new Uint8Array(ab), mime };
        } catch (e) {
          console.error("[reports] failed to load branding asset", path, e);
          return { bytes: undefined, mime: undefined };
        }
      }
      const [logoAsset, coverAsset] = await Promise.all([
        loadAsset(brandRow.logo_path as string | null | undefined),
        loadAsset((brandRow as Record<string, unknown>).cover_image_path as string | null | undefined),
      ]);
      brandingPayload = {
        enabled: true,
        logoBytes: logoAsset.bytes,
        logoMime: logoAsset.mime,
        logoWidth: brandRow.logo_width ?? 120,
        logoHeight: brandRow.logo_height ?? 60,
        displayName: brandRow.display_name,
        footerEnabled: brandRow.footer_enabled,
        footerName: brandRow.footer_name,
        footerSite: brandRow.footer_site,
        footerPhone: brandRow.footer_phone,
        coverImageBytes: coverAsset.bytes,
        coverImageMime: coverAsset.mime,
        coverBgColor: (brandRow as Record<string, unknown>).cover_bg_color as string | null | undefined,
        coverAccentColor: (brandRow as Record<string, unknown>).cover_accent_color as string | null | undefined,
        coverTitlePosition: (brandRow as Record<string, unknown>).cover_title_position as "top" | "center" | "bottom" | null | undefined,
        frameStyle: (brandRow as Record<string, unknown>).frame_style as "none" | "simple" | "double" | "ornamental" | null | undefined,
      };
    }

    // Build final 7-day plan based on the summary + recommendations (local, deterministic, fast)
    const buildFinal7DayPlan = () => {
      const expandTo7 = (seeds: string[], prefix: string): string[] => {
        const cleaned = seeds.map((s) => cleanInlineText(s)).filter(Boolean);
        const base = cleaned.length ? cleaned : [`${prefix} alinhado ao seu resumo.`];
        return Array.from({ length: 7 }, (_, i) => {
          const seed = base[i % base.length];
          return `Dia ${i + 1}: ${seed}`;
        });
      };
      return {
        improve: expandTo7(ai.recommendations.improve, "Pratique uma melhoria"),
        avoid: expandTo7(ai.recommendations.avoid, "Evite um padrão"),
        follow: expandTo7(ai.recommendations.follow, "Siga um caminho"),
      };
    };

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
      finalPlan: buildFinal7DayPlan(),
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

    // 6) Save row — vincula ao client_profile_id do contexto ativo
    // (respeitando o add-on de Clientes e o escopo solicitado).
    // Se scope="self", grava como relatório do próprio usuário (client_profile_id=null).
    const activeClientId =
      data.scope === "self" ? null : await resolveActiveClientId(userId);
    const summary = ai.intro.slice(0, 240);
    const { data: row, error: insErr } = await supabase
      .from("reports")
      .insert({
        user_id: userId,
        client_profile_id: activeClientId,
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
      console.error("[generateReport] error", err);



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
