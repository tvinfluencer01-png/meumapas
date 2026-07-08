// Server-only: gera o conteúdo REAL do relatório para pedidos avulsos.
// Usa Lovable AI Gateway para produzir uma análise completa a partir do
// customer_data + report_type, evitando o PDF meramente informativo.
import { generateText } from "ai";
import { getConfiguredProvider } from "@/lib/ai-resolver.server";
import type { SimplePdfBlock } from "@/lib/simple-pdf";

type CD = Record<string, any>;

const TYPE_META: Record<string, { title: string; focus: string }> = {
  mapa_astral: {
    title: "Mapa Astral Completo",
    focus:
      "Interprete Sol, Lua, Ascendente e demais planetas. Se hora/local não vier, dê análise por dia natal (Sol + fase lunar aproximada) explicitando a limitação.",
  },
  numerologia_cabalistica: {
    title: "Numerologia Cabalística",
    focus: "Analise os números cabalísticos derivados do nome e da data de nascimento.",
  },
  tarot: {
    title: "Leitura de Tarot Personalizada",
    focus:
      "Faça uma tiragem de 3 cartas (Passado/Presente/Futuro) usando o Tarot de Marselha, escolhendo cartas coerentes com a pergunta e o momento.",
  },
  mapa_empresarial: {
    title: "Mapa Empresarial",
    focus:
      "Analise a energia numerológica/astrológica da empresa (nome + data de fundação) e recomende ações.",
  },
  leitura_semanal: {
    title: "Leitura Semanal Personalizada",
    focus: "Traga previsões e conselhos para os próximos 7 dias por área de vida.",
  },
  horoscopo: {
    title: "Horóscopo Personalizado",
    focus: "Análise astrológica do período atual com foco nos trânsitos relevantes.",
  },
  synastry: {
    title: "Sinastria Amorosa",
    focus: "Compare os dois nascimentos e analise afinidades, desafios e potenciais do casal.",
  },
  couple_numerology: {
    title: "Numerologia do Casal",
    focus:
      "Calcule os números do consulente e do(a) parceiro(a) e explique compatibilidade, missão e cuidados.",
  },
  annual_forecast: {
    title: "Previsão Anual",
    focus: "Ano pessoal, meses-chave e trânsitos principais do ano em curso ou solicitado.",
  },
  personal_kabbalah: {
    title: "Cabala Pessoal",
    focus: "Sephirot e caminhos da Árvore da Vida ativos no consulente.",
  },
  love: {
    title: "Mapa do Amor",
    focus:
      "Analise Sol, Lua, Vênus e Marte no amor. Padrões afetivos, feridas, tipo ideal de parceiro(a), magnetismo, sexualidade e caminhos para atrair um amor saudável.",
  },
  career: {
    title: "Mapa da Vocação e Carreira",
    focus:
      "Analise Meio-do-Céu, Casa 10, Sol e Saturno. Talentos vocacionais, profissões alinhadas, ciclos de prosperidade profissional, liderança e bloqueios.",
  },
  spiritual: {
    title: "Mapa Espiritual",
    focus:
      "Missão kármica, ferida ancestral, dons mediúnicos, portais de despertar e práticas espirituais alinhadas ao mapa e à numerologia.",
  },
  finance: {
    title: "Mapa da Prosperidade Financeira",
    focus:
      "Padrões financeiros, crenças de escassez/abundância, talentos monetizáveis, ciclos de prosperidade e estratégias concretas de gestão e investimento.",
  },
  family: {
    title: "Mapa Familiar & Ancestral",
    focus:
      "Padrões familiares herdados, papel no clã, ferida ancestral, dinâmicas com pais/irmãos/filhos e rituais de cura da linhagem.",
  },
  health: {
    title: "Mapa da Saúde Integrativa",
    focus:
      "Tendências de vitalidade, pontos sensíveis, padrões emocionais que afetam a saúde, ritmo ideal e práticas integrativas. Nunca dar diagnóstico clínico — sempre reforçar que não substitui acompanhamento médico.",
  },
  friendships: {
    title: "Mapa das Amizades e Círculo Social",
    focus:
      "Padrões sociais, perfis de amigos que combinam, feridas de pertencimento, liderança em grupo e práticas para cultivar círculos verdadeiros.",
  },
  custom: {
    title: "Consulta Personalizada",
    focus: "Interprete os dados fornecidos com profundidade espiritual.",
  },

};

function fmt(cd: CD): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(cd)) {
    if (v === null || v === undefined || String(v).trim() === "") continue;
    lines.push(`- ${k}: ${v}`);
  }
  return lines.join("\n");
}

/**
 * Gera blocos de conteúdo REAL do relatório para PDF.
 * Retorna null se a IA não estiver disponível — o chamador pode manter
 * o fallback informativo.
 */
export async function buildAiOrderReportBlocks(
  reportType: string,
  landingTitle: string,
  customerData: CD,
): Promise<SimplePdfBlock[] | null> {
  let makeModel: (hint?: string | null) => any;
  try {
    ({ model: makeModel } = await getConfiguredProvider(null, null));
  } catch {
    return null;
  }

  const meta = TYPE_META[reportType] ?? {
    title: landingTitle || "Relatório Personalizado",
    focus: "Interprete os dados fornecidos com profundidade espiritual e prática.",
  };
  const nome = String(customerData.full_name ?? customerData.name ?? "consulente").trim();
  const dados = fmt(customerData) || "(sem dados adicionais)";

  const system = `Você é o Oráculo Cósmico, escritor espiritual premium em português do Brasil.
Escreva com profundidade, calor humano e linguagem simples. Frases curtas.
Cite o consulente pelo primeiro nome ao longo do texto.
Sem markdown, sem emojis, sem promessas de eventos certos, sem diagnóstico clínico.
Traduza termos técnicos entre parênteses na mesma frase.`;

  const prompt = `Gere o "${meta.title}" para:

Nome: ${nome}
Dados fornecidos:
${dados}

Escopo do relatório: ${meta.focus}

Estrutura obrigatória (use exatamente estes títulos, cada um seguido de 2 a 4 parágrafos densos):
[H2] Abertura para ${nome}
[H2] Panorama Geral
[H2] Análise Detalhada
[H2] Pontos Fortes
[LIST] (5 a 7 itens curtos)
[H2] Sombras e Cuidados
[LIST] (4 a 6 itens curtos)
[H2] Recomendações Práticas
[LIST] (5 a 8 itens curtos e acionáveis)
[H2] Mensagem Final

Regras de formato de saída (siga LITERALMENTE):
- Antes de cada bloco, escreva a etiqueta em uma linha própria: "[H2] Título" para títulos ou "[LIST]" para listas.
- Parágrafos comuns não precisam de etiqueta.
- Itens de lista começam com "- " (hífen + espaço), um por linha, logo após a etiqueta [LIST].
- Não use markdown (nada de #, **, _, >).`;

  let text = "";
  try {
    const res = await generateText({
      model: makeModel("google/gemini-3-flash-preview"),
      system,
      prompt,
    });
    text = (res.text ?? "").trim();
  } catch (e) {
    console.error("[buildAiOrderReportBlocks] gateway error", e);
    return null;
  }
  if (!text) return null;

  return parseTaggedContent(text);
}

function parseTaggedContent(raw: string): SimplePdfBlock[] {
  const blocks: SimplePdfBlock[] = [];
  const lines = raw.split(/\r?\n/);

  let mode: "text" | "list" = "text";
  let paraBuf: string[] = [];
  let listBuf: string[] = [];

  const flushPara = () => {
    const t = paraBuf.join(" ").trim();
    if (t) blocks.push({ type: "p", text: t });
    paraBuf = [];
  };
  const flushList = () => {
    if (listBuf.length) blocks.push({ type: "list", items: listBuf.slice() });
    listBuf = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, "");
    if (!line.trim()) {
      if (mode === "text") flushPara();
      continue;
    }
    const h2 = line.match(/^\s*\[H2\]\s*(.+)$/i);
    if (h2) {
      flushPara(); flushList();
      mode = "text";
      blocks.push({ type: "h2", text: h2[1]!.trim() });
      continue;
    }
    if (/^\s*\[LIST\]\s*$/i.test(line)) {
      flushPara(); flushList();
      mode = "list";
      continue;
    }
    if (mode === "list") {
      const item = line.replace(/^\s*[-•*]\s+/, "").trim();
      if (item) listBuf.push(item);
      continue;
    }
    paraBuf.push(line.trim());
  }
  flushPara(); flushList();

  return blocks;
}
