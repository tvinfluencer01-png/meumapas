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

const AiOutput = z.object({
  intro: z.string().min(200),
  sections: z
    .array(
      z.object({
        title: z.string().min(2),
        body: z.string().min(200),
        plan: SectionPlanSchema.optional(),
      }),
    )
    .min(3)
    .max(8),
  closing: z.string().min(120),
  swot: z.object({
    strengths: z.array(z.string().min(3)).min(3).max(6),
    weaknesses: z.array(z.string().min(3)).min(3).max(6),
    opportunities: z.array(z.string().min(3)).min(3).max(6),
    threats: z.array(z.string().min(3)).min(3).max(6),
  }),
  recommendations: z.object({
    improve: z.array(z.string().min(3)).min(3).max(6),
    avoid: z.array(z.string().min(3)).min(3).max(6),
    follow: z.array(z.string().min(3)).min(3).max(6),
  }),
  suggestions: z.object({
    intro: z.string().optional(),
    items: z
      .array(z.object({ name: z.string().min(2), why: z.string().min(20) }))
      .min(5)
      .max(10),
  }),
  summary: z.string().min(200),
});

export const generateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ kind: KIND }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

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

    // Build context block for the AI
    type Planet = { name: string; sign: string; degree: number };
    type Aspect = { a: string; b: string; aspect: string; orb: number };
    const planets = (chart?.planets as Planet[] | undefined) ?? [];
    const aspects = (chart?.aspects as Aspect[] | undefined) ?? [];

    let astroBlock = "(Mapa astral ainda nao calculado)";
    if (planets.length) {
      astroBlock = planets
        .map((p) => `- ${p.name}: ${p.sign} ${p.degree.toFixed(1)}°`)
        .join("\n");
      if (aspects.length) {
        astroBlock +=
          "\n\nAspectos principais:\n" +
          aspects
            .slice(0, 10)
            .map((a) => `- ${a.a} ${a.aspect} ${a.b} (orbe ${a.orb}°)`)
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

    let model;
    let modelName = customModel ?? "google/gemini-3.1-flash-lite-preview";
    if (provider === "openai" && customKey) {
      modelName = customModel ?? "gpt-4o-mini";
      model = createOpenAIProvider(customKey)(modelName);
    } else if (provider === "anthropic" && customKey) {
      modelName = customModel ?? "claude-3-5-sonnet-20241022";
      model = createAnthropicProvider(customKey)(modelName);
    } else if (provider === "gemini" && customKey) {
      modelName = customModel ?? "gemini-2.0-flash";
      model = createGeminiProvider(customKey)(modelName);
    } else {
      const key = process.env.LOVABLE_API_KEY;
      if (!key) throw new Error("LOVABLE_API_KEY ausente");
      model = createLovableAiGatewayProvider(key)(modelName);
    }

    // 3) Generate humanized structured content
    const firstName = String(birth.full_name).trim().split(/\s+/)[0] ?? "";

    const system = `Voce e o **Oraculo Cosmico**, escritor espiritual premium em portugues do Brasil.
Escreva textos profundos, calorosos e PESSOAIS, mas SEMPRE em LINGUAGEM SIMPLES E ACESSIVEL.
Imagine que voce conversa com um amigo querido que nunca estudou astrologia nem numerologia.

DICIONARIO DE TERMOS TECNICOS (use para traduzir, NAO copie literal — adapte ao contexto da frase, mantendo curto entre parenteses):
- Sol: essencia, identidade central, "quem voce e por dentro".
- Lua: emocoes, necessidades intimas, "como seu coracao se sente seguro".
- Ascendente: mascara social, "como o mundo te ve a primeira vista".
- Mercurio: comunicacao e raciocinio, "como sua mente fala e pensa".
- Venus: amor, prazer e estetica, "o que te encanta e como voce ama".
- Marte: acao, desejo, energia, "como voce luta e vai atras das coisas".
- Jupiter: expansao, sorte, fe, "o que faz sua vida crescer".
- Saturno: limites, disciplina, tempo, "as licoes duras que te amadurecem".
- Urano: rupturas e originalidade, "o que te tira da rotina de surpresa".
- Netuno: sonhos, intuicao, ilusao, "a parte sensivel e meio nebulosa".
- Plutao: transformacao profunda, "a forca que te faz renascer".
- Casa (1 a 12): area da vida onde algo acontece, "o palco do tema".
- Conjuncao: dois planetas juntos, "energias que se fundem".
- Trigono: harmonia entre dois planetas, "fluxo natural, dom".
- Sextil: oportunidade leve, "boa quando voce se mexe".
- Quadratura: tensao entre dois planetas, "um atrito que pede acao".
- Oposicao: dois polos puxando, "equilibrio que precisa ser construido".
- Retrogrado: planeta com energia voltada pra dentro, "tempo de revisao".
- Caminho de Vida: numero do proposito, "missao principal da sua vida".
- Numero do Destino: tarefa exterior, "papel que voce veio cumprir no mundo".
- Numero da Alma (Motivacao): desejo profundo, "o que move seu coracao".
- Numero da Personalidade: imagem externa, "como os outros te percebem".
- Numero do Aniversario: dom natural, "talento que ja nasce com voce".
- Numeros mestres (11, 22, 33): alta voltagem espiritual, "potencial grande que pede maturidade".
- Signo de Fogo: impulso, coragem, "energia que acende".
- Signo de Terra: praticidade, corpo, "energia que constroi".
- Signo de Ar: ideias, conexao, "energia que comunica".
- Signo de Agua: emocao, intuicao, "energia que sente".

REGRA DE LINGUAGEM SIMPLES (obrigatoria):
- SEMPRE que citar QUALQUER termo do dicionario acima (ou similar: aspecto, gematria, nodos, parte da fortuna, etc.), inclua na MESMA frase uma traducao CURTA entre parenteses (max 10 palavras) baseada no dicionario, adaptada ao contexto. Ex: "Sol em Escorpiao (sua essencia mais profunda funciona como um detetive emocional)"; "Caminho de Vida 7 (a missao de investigar e entender a vida)".
- NUNCA deixe um termo tecnico sem traducao parentetica, mesmo que ja tenha sido explicado antes — repita a explicacao curta sempre que reaparecer.
- Frases curtas. Evite jargao espiritual hermetico. Nada de "vibracao quantica", "campo aurico" sem explicar.
- Cite planetas, signos, aspectos e numeros REAIS recebidos, mas sempre TRADUZA o significado pratico para a vida da pessoa.
- Cada secao deve ter no minimo 3 paragrafos densos, mas com frases claras e diretas.
- Tom acolhedor, sabio, levemente literario, NUNCA academico ou opaco.
- Nunca prometa eventos certos nem faca diagnostico clinico.
- NAO use markdown nem emojis. Apenas texto corrido com paragrafos separados por linhas em branco.

REGRA DE NOMENCLATURA (obrigatoria):
- Use o NOME COMPLETO do consulente ("${birth.full_name}") UMA UNICA VEZ, na primeira mencao (idealmente na intro).
- Em TODAS as mencoes seguintes use APENAS o primeiro nome ("${firstName}").
- Nunca repita o nome completo. Nunca use sobrenomes isolados.

REGRA DO PLANO DE 7 DIAS (obrigatoria):
- Cada secao TERMINA com um plano de 7 dias com 3 listas: melhorar (improve), evitar (avoid), seguir (follow).
- Cada lista tem EXATAMENTE 7 itens, um para cada dia da semana (Dia 1 a Dia 7).
- Itens curtos, concretos, acionaveis, em linguagem simples (ex: "Escrever 3 gratidoes ao acordar", "Evitar conversa dificil antes do cafe", "Caminhar 20 min ao sol").
- Cada plano deve ser ESPECIFICO ao tema da secao E ancorado em algo do mapa/numerologia do consulente (cite no item quando fizer sentido, com a traducao curta entre parenteses, ex: "Como sua Lua em Cancer (coracao que pede colo) pede acolhimento, almoce com a familia").
- NAO repita os mesmos itens entre secoes.`;

    const prompt = `Gere um RELATORIO PREMIUM do tipo "${meta.title}" focado em ${meta.focus}

Dados do consulente:
Nome completo (usar apenas 1x, na primeira mencao): ${birth.full_name}
Primeiro nome (usar em todas as mencoes seguintes): ${firstName}
Nascimento: ${birth.birth_date}${birth.birth_time ? ` ${birth.birth_time}` : ""}
Local: ${birth.city ?? ""}${birth.country ? ", " + birth.country : ""}

Numerologia: ${numBlock}

Mapa Astral:
${astroBlock}

Responda APENAS com um JSON valido (sem markdown, sem cercas de codigo) no formato:
{
  "intro": "texto longo, 4 a 6 paragrafos separados por \\n\\n, em LINGUAGEM SIMPLES, explicando cada termo tecnico que aparecer",
  "sections": [
    {
      "title": "Titulo curto",
      "body": "3 a 5 paragrafos longos separados por \\n\\n, sempre traduzindo termos tecnicos para palavras do dia a dia",
      "plan": {
        "improve": ["Dia 1: acao concreta...", "Dia 2: ...", "Dia 3: ...", "Dia 4: ...", "Dia 5: ...", "Dia 6: ...", "Dia 7: ..."],
        "avoid":   ["Dia 1: o que nao fazer...", "Dia 2: ...", "Dia 3: ...", "Dia 4: ...", "Dia 5: ...", "Dia 6: ...", "Dia 7: ..."],
        "follow":  ["Dia 1: pratica a cultivar...", "Dia 2: ...", "Dia 3: ...", "Dia 4: ...", "Dia 5: ...", "Dia 6: ...", "Dia 7: ..."]
      }
    }
  ],
  "closing": "2 a 3 paragrafos finais",
  "swot": {
    "strengths": ["forca 1 personalizada", "..."],
    "weaknesses": ["fraqueza 1 personalizada", "..."],
    "opportunities": ["oportunidade 1 personalizada", "..."],
    "threats": ["ameaca/risco 1 personalizado", "..."]
  },
  "recommendations": {
    "improve": ["o que ${firstName} deve MELHORAR (frase curta e acionavel)", "..."],
    "avoid":   ["o que ${firstName} deve EVITAR (frase curta e acionavel)", "..."],
    "follow":  ["o que ${firstName} deve SEGUIR / cultivar (frase curta e acionavel)", "..."]
  },
  "suggestions": {
    "intro": "1 frase contextualizando a lista para ${firstName}",
    "items": [
      { "name": "Nome curto e direto da sugestao", "why": "1 a 2 frases simples explicando POR QUE essa sugestao combina com o mapa/numerologia de ${firstName}, citando signo, planeta, aspecto ou numero e traduzindo o termo." }
    ]
  },
  "summary": "Resumo final em 2 paragrafos densos, em linguagem simples"
}

REGRAS DO JSON:
- "sections" deve ter EXATAMENTE 3 itens (mais densos e focados).
- Cada "sections[i].plan" e OBRIGATORIO e cada uma das listas improve/avoid/follow precisa ter EXATAMENTE 7 itens (um por dia), iniciando com "Dia 1:", "Dia 2:", ... "Dia 7:". Itens curtos (max 15 palavras).
- SWOT e recommendations: 3 itens cada, especificos ao mapa e numerologia.
- "suggestions.items": EXATAMENTE 5 itens. Tema das sugestoes: ${meta.suggestionGuide}`;

    const { text } = await generateText({ model, system, prompt });

    // Extract JSON (some models wrap in code fences)
    let jsonStr = text.trim();
    const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) jsonStr = fence[1].trim();
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace > 0 || lastBrace > 0) jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("[reports] JSON parse failed", e, text.slice(0, 400));
      throw new Error("A IA devolveu um formato invalido. Tente novamente.");
    }
    const ai = AiOutput.parse(parsed);

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

    const pdfBytes = await buildReportPdf(reportData);

    // 5) Upload to storage (admin client; bucket is private)
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

    return {
      id: row?.id ?? null,
      kind: data.kind,
      title: meta.title,
      storagePath: path,
      signedUrl: signed?.signedUrl ?? null,
    };
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
