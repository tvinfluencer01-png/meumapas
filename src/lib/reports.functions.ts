import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText, Output } from "ai";
import {
  createLovableAiGatewayProvider,
  createOpenAIProvider,
  createAnthropicProvider,
  createGeminiProvider,
} from "@/lib/ai-gateway";
import { computeNumerology, NUMBER_MEANINGS } from "@/lib/numerology";
import { buildReportPdf, type ReportData } from "@/lib/reports-pdf";

const KIND = z.enum(["personality", "love", "career", "spiritual"]);

const REPORT_META: Record<
  z.infer<typeof KIND>,
  { title: string; subtitle: string; focus: string }
> = {
  personality: {
    title: "Mapa da Personalidade",
    subtitle: "Quem voce e na sua essencia mais profunda",
    focus:
      "personalidade, dons naturais, sombras, padroes de comportamento, ferida de origem, talentos a desenvolver e proposito da alma nesta encarnacao.",
  },
  love: {
    title: "Amor e Relacionamento",
    subtitle: "A linguagem do seu coracao e o tipo de vinculo que voce atrai",
    focus:
      "como voce ama e e amado, padroes afetivos, feridas relacionais, tipo ideal de parceiro(a), magnetismo afetivo, sexualidade, ciclos de vinculo, e como atrair amor saudavel.",
  },
  career: {
    title: "Vocacao e Proposito",
    subtitle: "O chamado profissional inscrito no seu mapa",
    focus:
      "talentos vocacionais, missao, areas de prosperidade, lideranca, padroes de bloqueio financeiro e caminho de realizacao material.",
  },
  spiritual: {
    title: "Jornada Espiritual",
    subtitle: "O caminho interior e a evolucao da alma",
    focus:
      "missao karmica, ferida ancestral, dons mediunicos, caminho de despertar, praticas e portais espirituais alinhados ao mapa.",
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
});

export const generateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ kind: KIND }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1) Load user context
    const [{ data: birth }, { data: chart }, { data: settings }] = await Promise.all([
      supabase.from("birth_data").select("*").eq("user_id", userId).eq("is_primary", true).maybeSingle(),
      supabase.from("astro_charts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
    ]);

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
    const system = `Voce e o **Oraculo Cosmico**, escritor espiritual premium em portugues do Brasil.
Escreva textos longos, profundos, poeticos, calorosos, especificos e PESSOAIS (use o primeiro nome do consulente varias vezes).
Cite planetas, signos, aspectos e numeros REAIS recebidos. Nunca fale em termos genericos.
Cada secao deve ter no minimo 3 paragrafos densos. Tom acolhedor, sabio, levemente literario.
Nunca prometa eventos certos nem faca diagnostico clinico.
NAO use markdown nem emojis. Use somente texto corrido com paragrafos separados por linhas em branco.`;

    const prompt = `Gere um RELATORIO PREMIUM do tipo "${meta.title}" focado em ${meta.focus}

Dados do consulente:
Nome: ${birth.full_name}
Nascimento: ${birth.birth_date}${birth.birth_time ? ` ${birth.birth_time}` : ""}
Local: ${birth.city ?? ""}${birth.country ? ", " + birth.country : ""}

Numerologia: ${numBlock}

Mapa Astral:
${astroBlock}

Devolva JSON com:
- intro: abertura cinematografica acolhedora chamando ${birth.full_name} pelo nome (4-6 paragrafos).
- sections: 5 a 6 capitulos com titulo curto e corpo longo (3-5 paragrafos). Capitulos coerentes com o foco do relatorio.
- closing: selo final inspirador e personalizado (2-3 paragrafos).`;

    const { experimental_output } = await generateText({
      model,
      system,
      prompt,
      experimental_output: Output.object({ schema: AiOutput }),
    });

    const ai = experimental_output;

    // 4) Build PDF
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
