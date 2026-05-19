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
import { SPREADS, drawSpread, type SpreadId } from "@/lib/tarot.deck";
import { buildSimplePdf, type SimplePdfBlock } from "@/lib/simple-pdf";

const SpreadEnum = z.enum(["card_day", "three", "celtic"]);

const ACTION_FOR_SPREAD: Record<SpreadId, CreditAction> = {
  card_day: "tarot_card_day",
  three: "tarot_three",
  celtic: "tarot_celtic",
};

/* ---------- Generate tarot reading (consumes credits) ---------- */

export const generateTarotReading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        spread: SpreadEnum,
        question: z.string().trim().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const action = ACTION_FOR_SPREAD[data.spread];
    const unlimited = await hasUnlimitedAccess(userId, action);
    const cost = unlimited ? 0 : await getCreditCost(action);
    let charged = false;
    if (!unlimited) {
      const ok = await consumeCredits(
        userId,
        action,
        `Tarot ${SPREADS[data.spread].label}`,
      );
      if (!ok) {
        throw new Error(
          `Saldo insuficiente. Esta leitura custa ${cost} créditos. Compre mais em /addons.`,
        );
      }
      charged = cost > 0;
    }

    try {
      const draw = drawSpread(data.spread);
      const spread = SPREADS[data.spread];

      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");
      const model = createLovableAiGatewayProvider(apiKey)(
        "google/gemini-2.5-flash",
      );

      const cardsBlock = draw
        .map((c, i) => {
          const orient = c.reversed ? "INVERTIDA" : "Em pé";
          const kw = (c.reversed ? c.card.reversed : c.card.upright).join(", ");
          return `${i + 1}. ${c.position} — ${c.card.name} (${orient}) :: ${kw}`;
        })
        .join("\n");

      const system = `Você é o **Oráculo Cósmico de Tarot**, leitor profissional de Tarot de Marselha/Rider-Waite.
Escreve em PT-BR, tom acolhedor, sábio e poético. NUNCA prevê eventos certos; oferece reflexões.
Não use markdown nem emojis — apenas texto corrido em parágrafos separados por linha em branco.`;

      const prompt = `Tipo de tiragem: ${spread.label}
${data.question ? `Pergunta do consulente: "${data.question}"` : "Sem pergunta específica."}

Cartas sorteadas (na ordem das posições):
${cardsBlock}

Responda APENAS com JSON válido (sem cercas de código):
{
  "summary": "1 parágrafo de abertura conectando todas as cartas em narrativa única",
  "perCard": [
    { "position": "${draw[0].position}", "card": "${draw[0].card.name}", "reading": "2 a 3 parágrafos de leitura específica e personalizada para esta posição" }
    ${draw.length > 1 ? ", ..." : ""}
  ],
  "advice": "1 a 2 parágrafos de conselho prático e espiritual",
  "affirmation": "1 frase curta de afirmação para o consulente repetir"
}
A lista "perCard" deve ter EXATAMENTE ${draw.length} item(ns), na MESMA ordem das cartas sorteadas acima.`;

      const { text } = await generateText({ model, system, prompt });

      let jsonStr = text.trim();
      const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fence) jsonStr = fence[1].trim();
      const first = jsonStr.indexOf("{");
      const last = jsonStr.lastIndexOf("}");
      if (first >= 0 && last > first) jsonStr = jsonStr.slice(first, last + 1);
      const parsed = JSON.parse(jsonStr) as {
        summary: string;
        perCard: { position: string; card: string; reading: string }[];
        advice: string;
        affirmation: string;
      };

      const interpretation = JSON.stringify(parsed);

      const { data: row, error: insErr } = await supabaseAdmin
        .from("tarot_readings")
        .insert({
          user_id: userId,
          spread: data.spread,
          question: data.question ?? null,
          cards: draw,
          interpretation,
          ai_model: "google/gemini-2.5-flash",
        })
        .select("id, created_at")
        .single();
      if (insErr) throw new Error(insErr.message);

      return {
        id: row.id,
        spread: data.spread,
        spread_label: spread.label,
        question: data.question ?? null,
        cards: draw,
        interpretation: parsed,
        created_at: row.created_at,
      };
    } catch (err) {
      if (charged) {
        await refundCredits(userId, action, {
          reason:
            err instanceof Error
              ? `Falha na leitura de tarot: ${err.message}`.slice(0, 200)
              : "Falha na leitura de tarot",
          actorLabel: "system:tarot",
          originalReference: `Tarot ${SPREADS[data.spread].label}`,
        }).catch((e) => console.error("[tarot] refund failed", e));
      }
      throw err;
    }
  });

/* ---------- Export PDF for a reading ---------- */

export const exportTarotPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: reading } = await supabaseAdmin
      .from("tarot_readings")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!reading) throw new Error("Leitura não encontrada");

    // If already exported, download from storage and return as base64 to
    // bypass adblockers that block direct *.supabase.co URLs.
    if (reading.storage_path) {
      const { data: blob, error: dlErr } = await supabaseAdmin.storage
        .from("reports")
        .download(reading.storage_path);
      if (dlErr || !blob) throw new Error(dlErr?.message ?? "Falha ao baixar PDF");
      const buf = new Uint8Array(await blob.arrayBuffer());
      const base64 = Buffer.from(buf).toString("base64");
      return { pdfBase64: base64, cached: true };
    }


    const action: CreditAction = "tarot_pdf";
    const unlimited = await hasUnlimitedAccess(userId, action);
    const cost = unlimited ? 0 : await getCreditCost(action);
    let charged = false;
    if (!unlimited) {
      const ok = await consumeCredits(userId, action, `PDF tarot ${reading.id}`);
      if (!ok) {
        throw new Error(
          `Saldo insuficiente. Exportar este PDF custa ${cost} créditos.`,
        );
      }
      charged = cost > 0;
    }

    try {
      const interp = JSON.parse(reading.interpretation) as {
        summary: string;
        perCard: { position: string; card: string; reading: string }[];
        advice: string;
        affirmation: string;
      };
      const cards = (reading.cards as {
        position: string;
        card: { name: string };
        reversed: boolean;
      }[]) ?? [];
      const spreadLabel =
        SPREADS[reading.spread as SpreadId]?.label ?? reading.spread;

      const blocks: SimplePdfBlock[] = [];
      blocks.push({ type: "h2", text: "Cartas sorteadas" });
      blocks.push({
        type: "list",
        items: cards.map(
          (c) =>
            `${c.position}: ${c.card.name}${c.reversed ? " (invertida)" : ""}`,
        ),
      });
      blocks.push({ type: "h2", text: "Visão geral" });
      blocks.push({ type: "p", text: interp.summary });
      for (const item of interp.perCard) {
        blocks.push({ type: "h2", text: `${item.position} — ${item.card}` });
        blocks.push({ type: "p", text: item.reading });
      }
      blocks.push({ type: "h2", text: "Conselho" });
      blocks.push({ type: "p", text: interp.advice });
      blocks.push({ type: "h2", text: "Afirmação" });
      blocks.push({ type: "quote", text: interp.affirmation });

      const pdfBytes = await buildSimplePdf({
        brand: "Cosmic AI",
        eyebrow: `Tarot · ${spreadLabel}`,
        title: "Leitura de Tarot",
        subtitle: reading.question ?? "Sem pergunta específica",
        meta: [
          `Realizada em ${new Date(reading.created_at).toLocaleString("pt-BR")}`,
        ],
        blocks,
        accentHex: "#a855f7",
      });

      const path = `${userId}/tarot-${reading.id}.pdf`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("reports")
        .upload(path, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (upErr) throw new Error(upErr.message);

      await supabaseAdmin
        .from("tarot_readings")
        .update({ storage_path: path })
        .eq("id", reading.id);

      const { data: signed } = await supabaseAdmin.storage
        .from("reports")
        .createSignedUrl(path, 60 * 60);
      return { signedUrl: signed?.signedUrl ?? null, cached: false };
    } catch (err) {
      if (charged) {
        await refundCredits(userId, action, {
          reason:
            err instanceof Error
              ? `Falha no PDF de tarot: ${err.message}`.slice(0, 200)
              : "Falha no PDF de tarot",
          actorLabel: "system:tarot",
          originalReference: `PDF tarot ${reading.id}`,
        }).catch((e) => console.error("[tarot] refund failed", e));
      }
      throw err;
    }
  });

/* ---------- List & delete ---------- */

export const listTarotReadings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("tarot_readings")
      .select("id, spread, question, cards, created_at, storage_path")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);
    return data ?? [];
  });

export const deleteTarotReading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await supabaseAdmin
      .from("tarot_readings")
      .select("storage_path")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (row?.storage_path) {
      await supabaseAdmin.storage.from("reports").remove([row.storage_path]);
    }
    await supabaseAdmin
      .from("tarot_readings")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });
