import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { getConfiguredProvider } from "@/lib/ai-resolver.server";
import { computeNumerology, numLabel, numTitle, formatBirthDateBR } from "@/lib/numerology";
import { buildReportPdf, type ReportData } from "@/lib/reports-pdf";
import { consumeCredits, hasUnlimitedAccess, getCreditCost, refundCredits } from "@/lib/credits.functions";

const PartnerSchema = z.object({
  full_name: z.string().min(2).max(120),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  role: z.string().max(80).optional().nullable(),
});

const InputSchema = z.object({
  company_name: z.string().min(2).max(160),
  founding_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  industry: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  partners: z.array(PartnerSchema).min(1).max(8),
});

function safe<T>(x: T | undefined | null, fb: T): T {
  return x == null ? fb : x;
}

function pad(arr: string[], n: number, prefix: string): string[] {
  const out = arr.slice(0, n).map((s) => (s ?? "").toString().trim()).filter(Boolean);
  while (out.length < n) {
    out.push(`${prefix} ${out.length + 1}: refine este ponto com a equipe.`);
  }
  return out;
}

export const generateBusinessReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => InputSchema.parse(d))
  .handler(async function* ({ data, context }) {
    const { userId } = context;
    yield { type: "progress" as const, progress: 5, step: "Validando acesso ao Mapa Empresarial..." };

    // Cobrança: assinatura libera ilimitado; senão consome créditos.
    const action = "report_business";
    const unlimited = await hasUnlimitedAccess(userId, action);
    let charged = false;
    if (!unlimited) {
      const cost = await getCreditCost(action);
      const ok = await consumeCredits(userId, action, "Mapa Empresarial");
      if (!ok) {
        throw new Error(
          `Saldo insuficiente. Este relatório custa ${cost} créditos — ou ative o add-on Mapa Empresarial.`,
        );
      }
      charged = true;
    }

    try {
      yield { type: "progress" as const, progress: 18, step: "Calculando numerologia empresarial e de cada sócio..." };

      const companyNum = computeNumerology(data.company_name, data.founding_date);
      const partnersNum = data.partners.map((p) => ({
        ...p,
        num: computeNumerology(p.full_name, p.birth_date),
      }));

      const partnersBlock = partnersNum
        .map(
          (p, i) =>
            `Sócio ${i + 1}: ${p.full_name} — ${formatBirthDateBR(p.birth_date)}${
              p.role ? ` (papel: ${p.role})` : ""
            }\n  · Caminho ${numLabel(p.num.life_path)} (${numTitle(p.num.life_path)})\n  · Destino ${numLabel(p.num.destiny)} (${numTitle(p.num.destiny)})\n  · Alma ${numLabel(p.num.soul_urge)}\n  · Personalidade ${numLabel(p.num.personality)}`,
        )
        .join("\n");

      yield { type: "progress" as const, progress: 30, step: "Consultando arquétipos e ciclos com IA..." };

      const apiKey = process.env.LOVABLE_API_KEY!;
      const provider = createLovableAiGatewayProvider(apiKey);
      const model = provider.chatModel("openai/gpt-5");

      const prompt = `Você é um consultor sênior que combina astrologia mundana, numerologia pitagórica e cabalística e estratégia empresarial.
Produza uma análise PROFUNDA, profissional e específica sobre a empresa abaixo, em pt-BR.
Responda APENAS um JSON válido seguindo EXATAMENTE este schema (sem comentários, sem markdown):
{
  "intro": "texto de 1600+ caracteres — apresentação do arquétipo da empresa, missão simbólica e cenário atual.",
  "sections": [
    { "title": "Arquétipo e Numerologia Empresarial", "body": "1400+ chars — explora o nome, data de fundação e ciclos numerológicos." },
    { "title": "Sócios — Mapas individuais e talentos", "body": "1400+ chars — analisa cada sócio nominalmente." },
    { "title": "Dinâmica entre sócios — forças, atritos e equilíbrio", "body": "1400+ chars — combinações, riscos, governança recomendada." },
    { "title": "Previsões anuais — oportunidades, ameaças e ciclos", "body": "1400+ chars — 12 meses, marcos, posicionamento." }
  ],
  "closing": "400+ chars — síntese estratégica e convite à ação.",
  "swot": {
    "strengths": ["3 itens específicos"],
    "weaknesses": ["3 itens"],
    "opportunities": ["3 itens"],
    "threats": ["3 itens"]
  },
  "recommendations": {
    "improve": ["3 itens acionáveis"],
    "avoid": ["3 itens"],
    "follow": ["3 itens"]
  },
  "suggestions": {
    "intro": "1 frase",
    "items": [
      { "name": "Iniciativa estratégica", "why": "explica por que combina com a empresa e os sócios — mínimo 30 chars" }
    ]
  },
  "summary": "500+ chars — resumo executivo.",
  "finalPlan": {
    "improve": ["Dia 1: ...", "Dia 2: ...", "Dia 3: ...", "Dia 4: ...", "Dia 5: ...", "Dia 6: ...", "Dia 7: ..."],
    "avoid":   ["Dia 1: ...", "Dia 2: ...", "Dia 3: ...", "Dia 4: ...", "Dia 5: ...", "Dia 6: ...", "Dia 7: ..."],
    "follow":  ["Dia 1: ...", "Dia 2: ...", "Dia 3: ...", "Dia 4: ...", "Dia 5: ...", "Dia 6: ...", "Dia 7: ..."]
  }
}

DADOS DA EMPRESA:
Nome: ${data.company_name}
Fundação: ${formatBirthDateBR(data.founding_date)}
Setor: ${data.industry ?? "—"}
Notas: ${data.notes ?? "—"}
Numerologia da empresa: Caminho ${numLabel(companyNum.life_path)} (${numTitle(companyNum.life_path)}), Destino ${numLabel(companyNum.destiny)}, Alma ${numLabel(companyNum.soul_urge)}, Personalidade ${numLabel(companyNum.personality)}.

SÓCIOS:
${partnersBlock}

A análise deve ser sofisticada, com linguagem executiva e simbólica equilibradas. Use nomes próprios. NUNCA invente cargos. Cite ao menos um número simbólico em cada seção.`;

      yield { type: "progress" as const, progress: 55, step: "Estruturando análise estratégica..." };

      let aiJson: any = null;
      try {
        const { text } = await generateText({ model, prompt });
        const m = text.match(/\{[\s\S]*\}/);
        aiJson = JSON.parse(m ? m[0] : text);
      } catch (e) {
        console.error("[business] AI parse error", e);
        aiJson = null;
      }

      const fallbackSec = (title: string, focus: string) => ({
        title,
        body: `${data.company_name} encontra em ${focus} um campo fértil de aprendizado. Esta seção deve ser refinada com a equipe — utilize o resumo executivo e o SWOT como pontos de partida. Os sócios ${partnersNum
          .map((p) => p.full_name)
          .join(", ")} carregam talentos complementares que pedem governança consciente, rituais claros de decisão e cultivo de propósito comum. A numerologia da empresa indica que o caminho ${numLabel(
          companyNum.life_path,
        )} pede coerência entre discurso e prática.`.repeat(3),
      });

      const sections = Array.isArray(aiJson?.sections) && aiJson.sections.length >= 4
        ? aiJson.sections.slice(0, 4)
        : [
            fallbackSec("Arquétipo e Numerologia Empresarial", "seu DNA simbólico"),
            fallbackSec("Sócios — Mapas individuais e talentos", "os talentos de cada sócio"),
            fallbackSec("Dinâmica entre sócios", "a química do grupo"),
            fallbackSec("Previsões anuais", "os ciclos do próximo ano"),
          ];

      const reportData: ReportData = {
        kind: "business",
        title: "Mapa Empresarial",
        subtitle: `${data.company_name} — análise estratégica simbólica`,
        consultantName: data.company_name,
        birthLine: `Fundação: ${formatBirthDateBR(data.founding_date)}${data.industry ? ` · Setor: ${data.industry}` : ""}`,
        signLine: partnersNum.map((p) => p.full_name).join(" · "),
        numerologyLine: `Caminho ${numLabel(companyNum.life_path)} · Destino ${numLabel(companyNum.destiny)} · Alma ${numLabel(companyNum.soul_urge)} · Personalidade ${numLabel(companyNum.personality)}`,
        intro: safe(aiJson?.intro, `Esta análise apresenta ${data.company_name} sob a lente da numerologia e da astrologia mundana. O objetivo é traduzir símbolos em decisões: identificar o arquétipo da marca, os talentos dos sócios, riscos de governança e os ciclos estratégicos dos próximos doze meses.`).repeat(1),
        sections,
        closing: safe(aiJson?.closing, `${data.company_name} é convidada a operar com clareza simbólica e disciplina executiva. Honre os ciclos numéricos e construa rituais coletivos de decisão.`),
        swot: {
          strengths: pad(aiJson?.swot?.strengths ?? [], 3, "Força"),
          weaknesses: pad(aiJson?.swot?.weaknesses ?? [], 3, "Fragilidade"),
          opportunities: pad(aiJson?.swot?.opportunities ?? [], 3, "Oportunidade"),
          threats: pad(aiJson?.swot?.threats ?? [], 3, "Ameaça"),
        },
        recommendations: {
          improve: pad(aiJson?.recommendations?.improve ?? [], 3, "Melhorar"),
          avoid: pad(aiJson?.recommendations?.avoid ?? [], 3, "Evitar"),
          follow: pad(aiJson?.recommendations?.follow ?? [], 3, "Seguir"),
        },
        suggestions: {
          heading: "Iniciativas estratégicas sugeridas",
          intro: safe(aiJson?.suggestions?.intro, "Estas iniciativas ajudam a ancorar a análise no dia a dia."),
          items: (Array.isArray(aiJson?.suggestions?.items) ? aiJson.suggestions.items : [])
            .slice(0, 5)
            .concat(
              Array.from({ length: 5 }, (_, i) => ({
                name: `Iniciativa ${i + 1}`,
                why: `Ação alinhada aos ciclos da empresa e aos talentos dos sócios.`,
              })),
            )
            .slice(0, 5),
        },
        summary: safe(aiJson?.summary, `Análise simbólico-estratégica de ${data.company_name}.`),
        finalPlan: aiJson?.finalPlan
          ? {
              improve: pad(aiJson.finalPlan.improve ?? [], 7, "Dia"),
              avoid: pad(aiJson.finalPlan.avoid ?? [], 7, "Dia"),
              follow: pad(aiJson.finalPlan.follow ?? [], 7, "Dia"),
            }
          : undefined,
      };

      yield { type: "progress" as const, progress: 82, step: "Diagramando o PDF cinematográfico..." };
      const pdfBytes = await buildReportPdf(reportData);

      yield { type: "progress" as const, progress: 92, step: "Salvando o relatório..." };
      const path = `${userId}/business-${Date.now()}.pdf`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("reports")
        .upload(path, pdfBytes, { contentType: "application/pdf", upsert: false });
      if (upErr) throw new Error("Falha ao salvar o PDF.");

      const { data: row, error: insErr } = await supabaseAdmin
        .from("reports")
        .insert({
          user_id: userId,
          kind: "business",
          title: `Mapa Empresarial — ${data.company_name}`,
          storage_path: path,
          ai_model: "openai/gpt-5",
          summary: reportData.summary.slice(0, 240),
        })
        .select()
        .single();
      if (insErr) {
        console.error("[business] insert report error", insErr);
        throw new Error("Falha ao salvar o relatório na biblioteca.");
      }

      const { data: signed } = await supabaseAdmin.storage
        .from("reports")
        .createSignedUrl(path, 60 * 60);

      yield {
        type: "done" as const,
        progress: 100,
        step: "Pronto!",
        result: {
          id: row?.id ?? null,
          title: `Mapa Empresarial — ${data.company_name}`,
          storagePath: path,
          signedUrl: signed?.signedUrl ?? null,
        },
      };
    } catch (err) {
      if (charged) {
        try {
          await refundCredits(userId, action, {
            reason: err instanceof Error ? err.message.slice(0, 200) : "Falha na geração",
            actorLabel: "system:business",
            originalReference: "Mapa Empresarial",
          });
        } catch (e) {
          console.error("[business] refund failed", e);
        }
      }
      throw err;
    }
  });
