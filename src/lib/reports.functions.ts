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
import { computeNumerology, NUMBER_MEANINGS, formatBirthDateBR } from "@/lib/numerology";
import { buildReportPdf, type ReportData } from "@/lib/reports-pdf";

const KIND = z.enum(["personality", "love", "career", "spiritual"]);

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
};

const SIGNS_LABEL: Record<string, string> = {
  "Áries": "Aries","Touro":"Touro","Gêmeos":"Gemeos","Câncer":"Cancer",
  "Leão":"Leao","Virgem":"Virgem","Libra":"Libra","Escorpião":"Escorpiao",
  "Sagitário":"Sagitario","Capricórnio":"Capricornio","Aquário":"Aquario","Peixes":"Peixes",
};

const AiOutput = z.object({
  intro: z.string().min(200),
  sections: z
    .array(z.object({ title: z.string().min(2), body: z.string().min(200) }))
    .min(4)
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
      `Caminho de Vida ${num.life_path} (${NUMBER_MEANINGS[num.life_path]?.title})`,
      `Destino ${num.destiny} (${NUMBER_MEANINGS[num.destiny]?.title})`,
      `Alma ${num.soul_urge} (${NUMBER_MEANINGS[num.soul_urge]?.title})`,
      `Personalidade ${num.personality} (${NUMBER_MEANINGS[num.personality]?.title})`,
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
    let modelName = customModel ?? "google/gemini-3-flash-preview";
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
Escreva textos longos, profundos, poeticos, calorosos, especificos e PESSOAIS.
Cite planetas, signos, aspectos e numeros REAIS recebidos. Nunca fale em termos genericos.
Cada secao deve ter no minimo 3 paragrafos densos. Tom acolhedor, sabio, levemente literario.
Nunca prometa eventos certos nem faca diagnostico clinico.
NAO use markdown nem emojis. Use somente texto corrido com paragrafos separados por linhas em branco.

REGRA DE NOMENCLATURA (obrigatoria):
- Use o NOME COMPLETO do consulente ("${birth.full_name}") UMA UNICA VEZ, na primeira mencao do relatorio (idealmente na intro, como saudacao ou abertura solene).
- Em TODAS as mencoes seguintes ao longo de todo o relatorio (intro, sections e closing), use APENAS o primeiro nome ("${firstName}") para criar intimidade e calor.
- Nunca repita o nome completo depois da primeira mencao. Nunca use sobrenomes isolados.`;

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
  "intro": "texto longo, 4 a 6 paragrafos separados por \\n\\n",
  "sections": [{"title": "Titulo curto", "body": "3 a 5 paragrafos longos separados por \\n\\n"}],
  "closing": "2 a 3 paragrafos finais",
  "swot": {
    "strengths": ["forca 1 personalizada", "..."],
    "weaknesses": ["fraqueza 1 personalizada", "..."],
    "opportunities": ["oportunidade 1 personalizada", "..."],
    "threats": ["ameaca/risco 1 personalizado", "..."]
  },
  "recommendations": {
    "improve": ["o que ${firstName} deve MELHORAR (frase curta e acionavel)", "..."],
    "avoid": ["o que ${firstName} deve EVITAR (frase curta e acionavel)", "..."],
    "follow": ["o que ${firstName} deve SEGUIR / cultivar (frase curta e acionavel)", "..."]
  },
  "suggestions": {
    "intro": "1 frase contextualizando a lista para ${firstName}",
    "items": [
      { "name": "Nome curto e direto da sugestao", "why": "1 a 2 frases explicando POR QUE essa sugestao combina com o mapa/numerologia de ${firstName}, citando signo, planeta, aspecto ou numero especifico." }
    ]
  },
  "summary": "Resumo final em 2 paragrafos densos, integrando o que foi dito"
}
A lista "sections" deve ter entre 5 e 6 itens. Cada item de SWOT e recommendations deve ter de 3 a 5 itens, especificos ao mapa e numerologia do consulente.
A lista "suggestions.items" deve ter entre 6 e 8 itens, cada um com "name" curto e "why" explicando a conexao com o mapa real desta pessoa. Tema das sugestoes: ${meta.suggestionGuide}`;

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
      birthLine: `${new Date(birth.birth_date).toLocaleDateString("pt-BR")}${
        birth.birth_time ? ` as ${String(birth.birth_time).slice(0, 5)}` : ""
      }${birth.city ? ` - ${birth.city}` : ""}`,
      signLine: signLine || "Mapa em construcao",
      numerologyLine: `Caminho ${num.life_path} - Destino ${num.destiny} - Alma ${num.soul_urge}`,
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
