// Server-only AI generator for the "Mapa de Personalidade Numerológico"
// Uses the same master prompt style as the in-system generator (reports.functions.ts)
// so guest product-order PDFs match the quality delivered to logged-in users.
import { generateText } from "ai";
import { z } from "zod";
import { getConfiguredProvider } from "@/lib/ai-resolver.server";
import { computeNumerology, numLabel, numTitle, formatBirthDateBR, NUMBER_MEANINGS } from "@/lib/numerology";
import type { SimplePdfBlock } from "@/lib/simple-pdf";
import { buildPersonalityNumerologyBlocks } from "@/lib/numerology-personality-report";

const SectionSchema = z.object({
  title: z.string().min(2),
  body: z.string().min(600),
});

const ReportSchema = z.object({
  intro: z.string().min(800),
  sections: z.array(SectionSchema).min(4).max(6),
  strengths: z.array(z.string().min(3)).min(3).max(6),
  shadows: z.array(z.string().min(3)).min(3).max(6),
  practices: z.array(z.string().min(3)).min(5).max(8),
  closing: z.string().min(300),
  summary: z.string().min(300),
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
  // Always compute the deterministic numbers — used in the prompt and as fallback.
  const num = computeNumerology(fullName, birthDate);
  const firstName = fullName.trim().split(/\s+/)[0] || "Você";
  const headline =
    `Caminho ${numLabel(num.life_path)} · Destino ${numLabel(num.destiny)} · Alma ${numLabel(num.soul_urge)} · Personalidade ${numLabel(num.personality)}`;

  let makeModel: (hint?: string | null) => any;
  try {
    ({ model: makeModel } = await getConfiguredProvider(null, null));
  } catch {
    return buildPersonalityNumerologyBlocks(fullName, birthDate);
  }

  const numBlock = [
    `Caminho de Vida ${numLabel(num.life_path)} (${numTitle(num.life_path)}) — ${NUMBER_MEANINGS[num.life_path ?? 0]?.essence ?? ""}`,
    `Destino/Expressão ${numLabel(num.destiny)} (${numTitle(num.destiny)}) — ${NUMBER_MEANINGS[num.destiny ?? 0]?.essence ?? ""}`,
    `Motivação da Alma ${numLabel(num.soul_urge)} (${numTitle(num.soul_urge)}) — ${NUMBER_MEANINGS[num.soul_urge ?? 0]?.essence ?? ""}`,
    `Personalidade Externa ${numLabel(num.personality)} (${numTitle(num.personality)}) — ${NUMBER_MEANINGS[num.personality ?? 0]?.essence ?? ""}`,
    `Número do Dia ${numLabel(num.birthday)} (${numTitle(num.birthday)})`,
  ].join("\n");

  const system = `Você é o Oráculo Cósmico, escritor espiritual premium em português do Brasil.
Escreva o "Mapa de Personalidade Numerológico" com profundidade, calor humano e linguagem simples.
Sempre traduza termos técnicos na mesma frase, entre parênteses, com no máximo 10 palavras.
Frases curtas. Sem markdown. Sem emojis. Sem prometer eventos certos. Sem diagnóstico clínico.
Cite os números do consulente NOMINALMENTE ao longo do texto (ex: "seu Caminho de Vida 7", "sua Alma 3").`;

  const prompt = `Gere o Mapa de Personalidade Numerológico para:

Consulente:
- Nome completo (use apenas 1x na abertura): ${fullName}
- Primeiro nome (use depois): ${firstName}
- Data de nascimento: ${formatBirthDateBR(birthDate)}

Numerologia calculada (use estes valores EXATOS, não recalcule):
${numBlock}

Devolva APENAS um JSON válido (sem markdown, sem comentários) com esta estrutura:
{
  "intro": "string com 800+ caracteres — abertura simbólica que apresenta ${firstName}, conecta o nome, a data e os números principais, e prepara a leitura",
  "sections": [
    { "title": "Caminho de Vida ${numLabel(num.life_path)} — ${numTitle(num.life_path)}", "body": "600+ caracteres analisando o Caminho de Vida com forças, sombras, lições e exemplos concretos" },
    { "title": "Destino ${numLabel(num.destiny)} — ${numTitle(num.destiny)}", "body": "600+ caracteres" },
    { "title": "Motivação da Alma ${numLabel(num.soul_urge)} — ${numTitle(num.soul_urge)}", "body": "600+ caracteres" },
    { "title": "Personalidade Externa ${numLabel(num.personality)} — ${numTitle(num.personality)}", "body": "600+ caracteres" },
    { "title": "Número do Dia ${numLabel(num.birthday)} — ${numTitle(num.birthday)}", "body": "600+ caracteres" }
  ],
  "strengths": ["4 a 6 frases específicas com as principais forças de ${firstName}"],
  "shadows": ["4 a 6 frases específicas com sombras a integrar"],
  "practices": ["5 a 8 práticas concretas, semanais/diárias, explicando por que combinam com este mapa"],
  "closing": "300+ caracteres com palavra final inspiradora e direção concreta",
  "summary": "300+ caracteres sintetizando o eixo central da personalidade de ${firstName}"
}`;

  const gateway = createLovableAiGatewayProvider(apiKey);
  const models = ["google/gemini-2.5-flash", "google/gemini-3-flash-preview"];

  let parsed: Report | null = null;
  for (const modelId of models) {
    try {
      const { text } = await generateText({
        model: gateway(modelId),
        system,
        prompt,
        abortSignal: AbortSignal.timeout(90_000),
        maxRetries: 0,
      });
      const jsonStr = extractJson(text);
      if (!jsonStr) continue;
      const obj = JSON.parse(jsonStr);
      const validated = ReportSchema.safeParse(obj);
      if (validated.success) {
        parsed = validated.data;
        break;
      }
    } catch (e) {
      console.error(`[numerology-ai] model=${modelId} failed`, e instanceof Error ? e.message : e);
    }
  }

  if (!parsed) {
    // Fallback to deterministic high-quality blocks
    return buildPersonalityNumerologyBlocks(fullName, birthDate);
  }

  const blocks: SimplePdfBlock[] = [];
  blocks.push({ type: "h2", text: "Apresentação" });
  blocks.push({ type: "p", text: parsed.intro });

  blocks.push({ type: "h2", text: "Seu mapa em uma página" });
  blocks.push({
    type: "kv",
    rows: [
      { k: "Caminho de Vida", v: `${numLabel(num.life_path)} — ${numTitle(num.life_path)}` },
      { k: "Destino / Expressão", v: `${numLabel(num.destiny)} — ${numTitle(num.destiny)}` },
      { k: "Motivação da Alma", v: `${numLabel(num.soul_urge)} — ${numTitle(num.soul_urge)}` },
      { k: "Personalidade Externa", v: `${numLabel(num.personality)} — ${numTitle(num.personality)}` },
      { k: "Número do Dia", v: `${numLabel(num.birthday)} — ${numTitle(num.birthday)}` },
    ],
  });

  for (const sec of parsed.sections) {
    blocks.push({ type: "h2", text: sec.title });
    const paragraphs = sec.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    for (const p of paragraphs) blocks.push({ type: "p", text: p });
  }

  blocks.push({ type: "h2", text: "Forças naturais" });
  blocks.push({ type: "list", items: parsed.strengths });

  blocks.push({ type: "h2", text: "Sombras a integrar" });
  blocks.push({ type: "list", items: parsed.shadows });

  blocks.push({ type: "h2", text: "Práticas recomendadas" });
  blocks.push({ type: "list", items: parsed.practices });

  blocks.push({ type: "h2", text: "Síntese" });
  blocks.push({ type: "p", text: parsed.summary });

  blocks.push({ type: "h2", text: "Palavra final" });
  blocks.push({ type: "p", text: parsed.closing });

  return { blocks, headline };
}
