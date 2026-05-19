import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import {
  consumeCredits,
  refundCredits,
  getCreditCost,
  hasUnlimitedAccess,
  type CreditAction,
} from "@/lib/credits.functions";
import { SEFIROT, findSefirah } from "@/lib/kabbalah.tree";
import { buildSimplePdf, type SimplePdfBlock } from "@/lib/simple-pdf";
import { sanitizeJsonString } from "@/lib/json-sanitize";

const SefirahEnum = z.enum(SEFIROT.map((s) => s.id) as [string, ...string[]]);

/* ---------- Generate guided meditation script ---------- */

export const generateKabbalahMeditation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        sefirah: SefirahEnum,
        intention: z.string().trim().max(500).optional().nullable(),
        duration_min: z.number().int().min(5).max(45).default(10),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const action: CreditAction = "kabbalah_meditation";
    const cost = await getCreditCost(action);
    const ok = await consumeCredits(
      userId,
      action,
      `Meditação cabalística ${data.sefirah}`,
    );
    if (!ok) {
      throw new Error(
        `Saldo insuficiente. Esta meditação custa ${cost} créditos. Compre mais em /addons.`,
      );
    }
    const charged = cost > 0;

    try {
      const sef = findSefirah(data.sefirah);
      if (!sef) throw new Error("Sefirá inválida.");

      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");
      const model = createLovableAiGatewayProvider(apiKey)(
        "google/gemini-2.5-flash",
      );

      const system = `Você é um **mestre cabalista contemporâneo** que guia meditações na Árvore da Vida.
Escreva em PT-BR, tom reverente mas acessível, em segunda pessoa ("Respire fundo...", "Sinta...").
Nunca use markdown, asteriscos ou emojis. Use parágrafos separados por linha em branco.
NUNCA prometa cura física nem substitua acompanhamento profissional.`;

      const prompt = `Sefirá: ${sef.name} (${sef.translation}) — Pilar da ${sef.pillar}
Planeta correspondente: ${sef.planet}
Parte do corpo: ${sef.body}
Palavras-chave: ${sef.keywords.join(", ")}
Frase-semente: "${sef.prayer}"

Intenção do meditante: ${data.intention || "Conexão com a energia desta sefirá."}
Duração total: ${data.duration_min} minutos

Responda APENAS com JSON válido (sem cercas de código):
{
  "opening": "1 parágrafo de centramento e respiração (≈1 min)",
  "phases": [
    { "title": "Nome curto da fase", "duration_min": 2, "guidance": "2 a 4 parágrafos guiando a meditação nesta fase" }
  ],
  "closing": "1 parágrafo de fechamento e retorno suave",
  "mantra": "Mantra curto em hebraico transliterado ou em português, com tradução entre parênteses",
  "integration": ["3 a 5 sugestões práticas para integrar a energia desta sefirá no cotidiano"]
}
A soma dos "duration_min" das fases deve ser aproximadamente ${data.duration_min - 2}.
A lista "phases" deve ter entre 3 e 5 itens, cada um focado em um aspecto da sefirá ${sef.name}.`;

      const { text } = await generateText({ model, system, prompt });

      let jsonStr = text.trim();
      const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fence) jsonStr = fence[1].trim();
      const first = jsonStr.indexOf("{");
      const last = jsonStr.lastIndexOf("}");
      if (first >= 0 && last > first) jsonStr = jsonStr.slice(first, last + 1);
      const parsed = JSON.parse(jsonStr) as {
        opening: string;
        phases: { title: string; duration_min: number; guidance: string }[];
        closing: string;
        mantra: string;
        integration: string[];
      };

      const script = JSON.stringify(parsed);

      const { data: row, error: insErr } = await supabaseAdmin
        .from("kabbalah_meditations")
        .insert({
          user_id: userId,
          sefirah: data.sefirah,
          intention: data.intention ?? null,
          script,
          duration_min: data.duration_min,
          ai_model: "google/gemini-2.5-flash",
        })
        .select("id, created_at")
        .single();
      if (insErr) throw new Error(insErr.message);

      return {
        id: row.id,
        sefirah: sef,
        intention: data.intention ?? null,
        duration_min: data.duration_min,
        script: parsed,
        created_at: row.created_at,
      };
    } catch (err) {
      if (charged) {
        await refundCredits(userId, action, {
          reason:
            err instanceof Error
              ? `Falha na meditação: ${err.message}`.slice(0, 200)
              : "Falha na meditação",
          actorLabel: "system:kabbalah",
          originalReference: `Meditação ${data.sefirah}`,
        }).catch((e) => console.error("[kabbalah] refund failed", e));
      }
      throw err;
    }
  });

/* ---------- Export PDF ---------- */

export const exportKabbalahPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: row } = await supabaseAdmin
      .from("kabbalah_meditations")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) throw new Error("Meditação não encontrada");

    if (row.storage_path) {
      const { data: blob, error: dlErr } = await supabaseAdmin.storage
        .from("reports")
        .download(row.storage_path);
      if (dlErr || !blob) throw new Error(dlErr?.message ?? "Falha ao baixar PDF");
      const buf = new Uint8Array(await blob.arrayBuffer());
      const base64 = Buffer.from(buf).toString("base64");
      return { pdfBase64: base64, cached: true };
    }

    const action: CreditAction = "kabbalah_pdf";
    const unlimited = await hasUnlimitedAccess(userId, action);
    const cost = unlimited ? 0 : await getCreditCost(action);
    let charged = false;
    if (!unlimited) {
      const ok = await consumeCredits(userId, action, `PDF meditação ${row.id}`);
      if (!ok) {
        throw new Error(
          `Saldo insuficiente. Exportar este PDF custa ${cost} créditos.`,
        );
      }
      charged = cost > 0;
    }

    try {
      const sef = findSefirah(row.sefirah);
      const script = JSON.parse(row.script) as {
        opening: string;
        phases: { title: string; duration_min: number; guidance: string }[];
        closing: string;
        mantra: string;
        integration: string[];
      };

      const blocks: SimplePdfBlock[] = [];
      blocks.push({
        type: "kv",
        rows: [
          { k: "Sefirá", v: `${sef?.name ?? row.sefirah} — ${sef?.translation ?? ""}` },
          { k: "Pilar", v: sef?.pillar ?? "—" },
          { k: "Planeta", v: sef?.planet ?? "—" },
          { k: "Corpo", v: sef?.body ?? "—" },
          { k: "Duração", v: `${row.duration_min} minutos` },
        ],
      });
      if (row.intention) {
        blocks.push({ type: "h2", text: "Intenção" });
        blocks.push({ type: "quote", text: row.intention });
      }
      blocks.push({ type: "h2", text: "Abertura" });
      blocks.push({ type: "p", text: script.opening });
      for (const ph of script.phases) {
        blocks.push({
          type: "h2",
          text: `${ph.title} (~${ph.duration_min} min)`,
        });
        blocks.push({ type: "p", text: ph.guidance });
      }
      blocks.push({ type: "h2", text: "Fechamento" });
      blocks.push({ type: "p", text: script.closing });
      blocks.push({ type: "h2", text: "Mantra" });
      blocks.push({ type: "quote", text: script.mantra });
      blocks.push({ type: "h2", text: "Integração na vida diária" });
      blocks.push({ type: "list", items: script.integration });

      const pdfBytes = await buildSimplePdf({
        brand: "Cosmic AI",
        eyebrow: `Meditação Cabalística · ${sef?.name ?? row.sefirah}`,
        title: `Roteiro: ${sef?.translation ?? row.sefirah}`,
        subtitle: sef?.prayer,
        meta: [
          `Gerado em ${new Date(row.created_at).toLocaleString("pt-BR")}`,
        ],
        blocks,
        accentHex: "#3b82f6",
        flowing: true,
      });

      const path = `${userId}/kabbalah-${row.id}.pdf`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("reports")
        .upload(path, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (upErr) throw new Error(upErr.message);

      await supabaseAdmin
        .from("kabbalah_meditations")
        .update({ storage_path: path })
        .eq("id", row.id);

      const base64 = Buffer.from(pdfBytes).toString("base64");
      return { pdfBase64: base64, cached: false };
    } catch (err) {
      if (charged) {
        await refundCredits(userId, action, {
          reason:
            err instanceof Error
              ? `Falha no PDF da meditação: ${err.message}`.slice(0, 200)
              : "Falha no PDF da meditação",
          actorLabel: "system:kabbalah",
          originalReference: `PDF meditação ${row.id}`,
        }).catch((e) => console.error("[kabbalah] refund failed", e));
      }
      throw err;
    }
  });

export const listKabbalahMeditations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("kabbalah_meditations")
      .select("id, sefirah, intention, duration_min, created_at, storage_path")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);
    return data ?? [];
  });

export const deleteKabbalahMeditation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await supabaseAdmin
      .from("kabbalah_meditations")
      .select("storage_path")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (row?.storage_path) {
      await supabaseAdmin.storage.from("reports").remove([row.storage_path]);
    }
    await supabaseAdmin
      .from("kabbalah_meditations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });
