// Server-only AI generator for the "Mapa de Personalidade Numerológico"
// Estrutura expandida (paridade com o Mapa Astral Completo): apresentação com
// história da numerologia, storytelling por número, explicações práticas de
// forças/sombras/práticas, plano de 7 dias justificado, síntese e palavra
// final elaboradas. Fallback determinístico se a IA falhar.
import { generateText } from "ai";
import { z } from "zod";
import { runWithProviderFallback } from "@/lib/ai-resolver.server";
import { computeNumerology, numLabel, numTitle, formatBirthDateBR, NUMBER_MEANINGS } from "@/lib/numerology";
import type { SimplePdfBlock } from "@/lib/simple-pdf";
import { buildPersonalityNumerologyBlocks } from "@/lib/numerology-personality-report";

const ItemExplainSchema = z.object({
  point: z.string().min(3),
  explain: z.string().min(120),
});

const NumberSectionSchema = z.object({
  title: z.string().min(2),
  story: z.string().min(700),
  meaning: z.string().min(500),
  strengths: z.array(ItemExplainSchema).min(3).max(6),
  shadows: z.array(ItemExplainSchema).min(3).max(6),
  practices: z.array(ItemExplainSchema).min(3).max(6),
  life_areas: z.object({
    love: z.string().min(220),
    career: z.string().min(220),
    family: z.string().min(220),
    spirituality: z.string().min(220),
  }),
});

const OnePageItemSchema = z.object({
  label: z.string().min(2),
  value: z.string().min(2),
  story: z.string().min(220),
});

const DayPlanSchema = z.object({
  day: z.number().int().min(1).max(7),
  title: z.string().min(3),
  action: z.string().min(40),
  why: z.string().min(180),
  benefits: z.string().min(160),
});

const ReportSchema = z.object({
  intro: z.string().min(1400),
  one_page: z.array(OnePageItemSchema).min(5).max(5),
  sections: z.array(NumberSectionSchema).min(5).max(5),
  synthesis: z.string().min(1000),
  plan: z.array(DayPlanSchema).length(7),
  closing: z.string().min(900),
});

type Report = z.infer<typeof ReportSchema>;

function clean(text: string) {
  return text
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

function extractJson(text: string): string | null {
  const t = clean(text);
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return null;
}

export async function buildAiPersonalityNumerologyBlocks(
  fullName: string,
  birthDate: string,
): Promise<{ blocks: SimplePdfBlock[]; headline: string }> {
  const num = computeNumerology(fullName, birthDate);
  const firstName = fullName.trim().split(/\s+/)[0] || "Você";
  const headline =
    `Caminho ${numLabel(num.life_path)} · Destino ${numLabel(num.destiny)} · Alma ${numLabel(num.soul_urge)} · Personalidade ${numLabel(num.personality)}`;

  const numBlock = [
    `Caminho de Vida ${numLabel(num.life_path)} (${numTitle(num.life_path)}) — ${NUMBER_MEANINGS[num.life_path ?? 0]?.essence ?? ""}`,
    `Destino/Expressão ${numLabel(num.destiny)} (${numTitle(num.destiny)}) — ${NUMBER_MEANINGS[num.destiny ?? 0]?.essence ?? ""}`,
    `Motivação da Alma ${numLabel(num.soul_urge)} (${numTitle(num.soul_urge)}) — ${NUMBER_MEANINGS[num.soul_urge ?? 0]?.essence ?? ""}`,
    `Personalidade Externa ${numLabel(num.personality)} (${numTitle(num.personality)}) — ${NUMBER_MEANINGS[num.personality ?? 0]?.essence ?? ""}`,
    `Número do Dia ${numLabel(num.birthday)} (${numTitle(num.birthday)})`,
  ].join("\n");

  const system = `Você é o Oráculo Cósmico, escritor espiritual premium em português do Brasil.
Escreva o "Mapa de Personalidade Numerológico" com PROFUNDIDADE, CALOR HUMANO, ESPERANÇA e linguagem simples.
REGRAS OBRIGATÓRIAS:
- Cite o consulente pelo PRIMEIRO NOME ao longo do texto (nunca o nome completo depois da abertura).
- Sempre traduza termos técnicos entre parênteses, com no máximo 10 palavras.
- Frases curtas e claras. Sem markdown. Sem emojis. Sem HTML.
- Sem prometer eventos certos, sem diagnóstico clínico, sem religião específica.
- Cada explicação deve ser PESSOAL, com exemplos concretos do dia a dia.
- NUNCA repita frases entre seções. Varie metáforas, exemplos e ritmo.
- Escreva com esperança e visão prática — sempre indique COMO aplicar.`;

  const prompt = `Gere o Mapa de Personalidade Numerológico completo para:

Consulente:
- Nome completo (use apenas 1x na abertura): ${fullName}
- Primeiro nome (use daqui em diante): ${firstName}
- Data de nascimento: ${formatBirthDateBR(birthDate)}

Numerologia calculada (USE EXATAMENTE estes valores, não recalcule):
${numBlock}

Devolva APENAS um JSON válido (sem markdown, sem comentários). Estrutura obrigatória:

{
  "intro": "1400+ caracteres. Estrutura em 4 blocos separados por dupla quebra de linha:\\n\\n(1) A história da Numerologia: origem em Pitágoras (século VI a.C.), passagem pela Cabala hebraica, difusão moderna por Mrs. L. Dow Balliett e Juno Jordan. Como se chegou ao entendimento de que os números carregam vibração e arquétipo.\\n\\n(2) Como a numerologia pode ajudar hoje: autoconhecimento, decisões de carreira, relacionamentos, ciclos pessoais, propósito.\\n\\n(3) Análise dos dados do consulente ${firstName}: o que o nome ${fullName} e a data ${formatBirthDateBR(birthDate)} revelam quando lidos juntos — a assinatura vibratória única.\\n\\n(4) Como ler este relatório e por que voltar a ele.",

  "one_page": [
    { "label": "Caminho de Vida", "value": "${numLabel(num.life_path)} — ${numTitle(num.life_path)}", "story": "220+ caracteres: mini-storytelling explicando o que este número específico significa para ${firstName}, com uma cena/exemplo do cotidiano" },
    { "label": "Destino / Expressão", "value": "${numLabel(num.destiny)} — ${numTitle(num.destiny)}", "story": "220+ caracteres, storytelling personalizado" },
    { "label": "Motivação da Alma", "value": "${numLabel(num.soul_urge)} — ${numTitle(num.soul_urge)}", "story": "220+ caracteres, storytelling personalizado" },
    { "label": "Personalidade Externa", "value": "${numLabel(num.personality)} — ${numTitle(num.personality)}", "story": "220+ caracteres, storytelling personalizado" },
    { "label": "Número do Dia", "value": "${numLabel(num.birthday)} — ${numTitle(num.birthday)}", "story": "220+ caracteres, storytelling personalizado" }
  ],

  "sections": [
    {
      "title": "Caminho de Vida ${numLabel(num.life_path)} — ${numTitle(num.life_path)}",
      "story": "700+ caracteres. Storytelling humanizado sobre como este Caminho se manifesta na vida de ${firstName}: cenas, ciclos típicos, exemplos concretos",
      "meaning": "500+ caracteres. Significado profundo do número (arquétipo, missão, lições centrais) aplicado a ${firstName}",
      "strengths": [
        { "point": "força específica (frase curta)", "explain": "120+ caracteres explicando COMO usar essa força no dia a dia, com exemplo concreto" }
      ],
      "shadows": [
        { "point": "sombra específica (frase curta)", "explain": "120+ caracteres explicando COMO integrar essa sombra sem se sabotar, com passo prático" }
      ],
      "practices": [
        { "point": "prática concreta (frase curta)", "explain": "120+ caracteres explicando POR QUE essa prática é útil PARA ESTE NÚMERO e o benefício esperado" }
      ],
      "life_areas": {
        "love": "220+ caracteres personalizados sobre este número no amor",
        "career": "220+ caracteres personalizados sobre este número na carreira",
        "family": "220+ caracteres personalizados sobre este número na família",
        "spirituality": "220+ caracteres personalizados sobre este número na espiritualidade"
      }
    },
    { "title": "Destino ${numLabel(num.destiny)} — ${numTitle(num.destiny)}", "story": "...", "meaning": "...", "strengths": [...], "shadows": [...], "practices": [...], "life_areas": {...} },
    { "title": "Motivação da Alma ${numLabel(num.soul_urge)} — ${numTitle(num.soul_urge)}", "story": "...", "meaning": "...", "strengths": [...], "shadows": [...], "practices": [...], "life_areas": {...} },
    { "title": "Personalidade Externa ${numLabel(num.personality)} — ${numTitle(num.personality)}", "story": "...", "meaning": "...", "strengths": [...], "shadows": [...], "practices": [...], "life_areas": {...} },
    { "title": "Número do Dia ${numLabel(num.birthday)} — ${numTitle(num.birthday)}", "story": "...", "meaning": "...", "strengths": [...], "shadows": [...], "practices": [...], "life_areas": {...} }
  ],

  "synthesis": "1000+ caracteres. STORYTELLING elaborado que costura os 5 números em UMA personalidade viva: como ${firstName} pensa, sente, decide, se relaciona. Use 2-3 CENAS-EXEMPLO concretas mostrando os números em ação. Termine com uma mensagem de ESPERANÇA sobre o potencial único deste mapa.",

  "plan": [
    { "day": 1, "title": "título curto do dia", "action": "ação concreta (ex: 'Reserve 20 minutos de silêncio ao acordar')", "why": "180+ caracteres explicando POR QUE esta ação combina com a numerologia de ${firstName} (cite qual número está sendo trabalhado)", "benefits": "160+ caracteres descrevendo o que ${firstName} vai VER, SENTIR e MELHORAR ao cumprir" },
    { "day": 2, ... }, { "day": 3, ... }, { "day": 4, ... }, { "day": 5, ... }, { "day": 6, ... }, { "day": 7, ... }
  ],

  "closing": "900+ caracteres. Palavra final elaborada e esperançosa. Estrutura em 3 blocos separados por dupla quebra de linha:\\n\\n(1) Retomada do essencial do mapa de ${firstName} com uma metáfora nova (não repita as anteriores).\\n\\n(2) Dicas de melhora baseadas na numerologia — quais benefícios concretos surgem ao seguir os conselhos (relacionamentos mais leves, decisões mais claras, energia recuperada, propósito nítido, etc.).\\n\\n(3) Próximos passos sugeridos: como aprofundar (revisitar o mapa em 3 meses, cruzar com o mapa astral, praticar o plano de 7 dias em ciclos, buscar áreas específicas de estudo). Encerre com uma frase-farol inspiradora."
}`;

  let parsed: Report | null = null;
  try {
    const { result: text } = await runWithProviderFallback(
      null, null,
      async (model) => (await generateText({
        model,
        system,
        prompt,
        abortSignal: AbortSignal.timeout(120_000),
        maxRetries: 0,
      })).text,
      undefined,
    );
    const jsonStr = extractJson(text);
    if (jsonStr) {
      const obj = JSON.parse(jsonStr);
      const validated = ReportSchema.safeParse(obj);
      if (validated.success) parsed = validated.data;
      else console.error("[numerology-ai] schema validation failed", validated.error.issues.slice(0, 3));
    }
  } catch (e) {
    console.error(`[numerology-ai] all providers failed`, e instanceof Error ? e.message : e);
  }

  if (!parsed) {
    return buildPersonalityNumerologyBlocks(fullName, birthDate);
  }

  const blocks: SimplePdfBlock[] = [];

  // Apresentação
  blocks.push({ type: "h2", text: "Apresentação" });
  for (const p of parsed.intro.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)) {
    blocks.push({ type: "p", text: p });
  }

  // Seu mapa em uma página — agora com storytelling por linha
  blocks.push({ type: "h2", text: "Seu mapa em uma página" });
  blocks.push({
    type: "kv",
    rows: parsed.one_page.map((r) => ({ k: r.label, v: r.value })),
  });
  for (const r of parsed.one_page) {
    blocks.push({ type: "h3", text: `${r.label}: ${r.value}` });
    blocks.push({ type: "p", text: r.story });
  }

  // Cada número
  for (const sec of parsed.sections) {
    blocks.push({ type: "h2", text: sec.title });
    for (const p of sec.story.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)) {
      blocks.push({ type: "p", text: p });
    }

    blocks.push({ type: "h3", text: "Significado profundo" });
    for (const p of sec.meaning.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)) {
      blocks.push({ type: "p", text: p });
    }

    blocks.push({ type: "h3", text: "Forças naturais — e como usar" });
    for (const it of sec.strengths) {
      blocks.push({ type: "p", text: `• ${it.point} — ${it.explain}` });
    }

    blocks.push({ type: "h3", text: "Sombras a integrar — e como transformar" });
    for (const it of sec.shadows) {
      blocks.push({ type: "p", text: `• ${it.point} — ${it.explain}` });
    }

    blocks.push({ type: "h3", text: "Práticas recomendadas — e o porquê" });
    for (const it of sec.practices) {
      blocks.push({ type: "p", text: `• ${it.point} — ${it.explain}` });
    }

    blocks.push({ type: "h3", text: "Como este número aparece nas áreas da vida" });
    blocks.push({
      type: "kv",
      rows: [
        { k: "Amor", v: sec.life_areas.love },
        { k: "Carreira", v: sec.life_areas.career },
        { k: "Família", v: sec.life_areas.family },
        { k: "Espiritualidade", v: sec.life_areas.spirituality },
      ],
    });
  }

  // Síntese
  blocks.push({ type: "h2", text: "Síntese: o eixo da sua personalidade" });
  for (const p of parsed.synthesis.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)) {
    blocks.push({ type: "p", text: p });
  }

  // Plano de 7 dias, justificado
  blocks.push({ type: "h2", text: "Plano prático de 7 dias" });
  for (const d of parsed.plan) {
    blocks.push({ type: "h3", text: `Dia ${d.day} — ${d.title}` });
    blocks.push({ type: "p", text: `O que fazer: ${d.action}` });
    blocks.push({ type: "p", text: `Por que fazer: ${d.why}` });
    blocks.push({ type: "p", text: `Benefícios: ${d.benefits}` });
  }

  // Palavra final elaborada
  blocks.push({ type: "h2", text: "Palavra final" });
  for (const p of parsed.closing.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)) {
    blocks.push({ type: "p", text: p });
  }

  return { blocks, headline };
}
