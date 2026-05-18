import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import {
  createLovableAiGatewayProvider,
  createOpenAIProvider,
  createAnthropicProvider,
  createGeminiProvider,
} from "@/lib/ai-gateway";
import { computeNumerology, formatBirthDateBR, numLabel, numTitle } from "@/lib/numerology";

type ChatBody = { messages?: UIMessage[] };

const SIGNS_EMOJI: Record<string, string> = {
  "Áries": "♈", "Touro": "♉", "Gêmeos": "♊", "Câncer": "♋",
  "Leão": "♌", "Virgem": "♍", "Libra": "♎", "Escorpião": "♏",
  "Sagitário": "♐", "Capricórnio": "♑", "Aquário": "♒", "Peixes": "♓",
};

async function buildContext(userId: string, accessToken: string) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
  );

  const [{ data: birth }, { data: chart }, { data: settings }] = await Promise.all([
    supabase.from("birth_data").select("*").eq("user_id", userId).eq("is_primary", true).maybeSingle(),
    supabase.from("astro_charts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  let context = "";
  if (birth) {
    const firstName = String(birth.full_name).trim().split(/\s+/)[0] ?? "";
    context += `\n## Dados do Consulente\n- Nome completo (usar apenas na 1a mencao da conversa): ${birth.full_name}\n- Primeiro nome (usar em todas as mencoes seguintes): ${firstName}\n- Nascimento: ${formatBirthDateBR(birth.birth_date)}${birth.birth_time ? ` às ${birth.birth_time}` : " (hora desconhecida)"}\n- Local: ${birth.city ?? ""}${birth.country ? `, ${birth.country}` : ""}\n`;

    const num = computeNumerology(birth.full_name, birth.birth_date);
    context += `\n## Numerologia\n`;
    context += `- Caminho de Vida: ${numLabel(num.life_path)} (${numTitle(num.life_path)})\n`;
    context += `- Destino/Expressão: ${numLabel(num.destiny)} (${numTitle(num.destiny)})\n`;
    context += `- Alma: ${numLabel(num.soul_urge)} (${numTitle(num.soul_urge)})\n`;
    context += `- Personalidade: ${numLabel(num.personality)} (${numTitle(num.personality)})\n`;
  }

  if (chart) {
    const planets = (chart.planets as { name: string; sign: string; degree: number }[]) ?? [];
    const aspects = (chart.aspects as { a: string; b: string; aspect: string; orb: number }[]) ?? [];
    context += `\n## Mapa Astral\n`;
    for (const p of planets) {
      context += `- ${p.name}: ${SIGNS_EMOJI[p.sign] ?? ""} ${p.sign} ${p.degree.toFixed(1)}°\n`;
    }
    if (chart.ascendant != null) {
      context += `- Ascendente: ${(Number(chart.ascendant) % 30).toFixed(1)}°\n`;
    }
    if (aspects.length) {
      context += `\n### Aspectos principais\n`;
      for (const a of aspects.slice(0, 12)) {
        context += `- ${a.a} ${a.aspect} ${a.b} (orbe ${a.orb}°)\n`;
      }
    }
  }

  if (!context) {
    context = "\n(O consulente ainda não preencheu dados de nascimento ou mapa. Convide-o gentilmente a completar o onboarding antes de aprofundar.)";
  }

  return { context, settings };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const auth = request.headers.get("authorization") ?? "";
          const token = auth.replace(/^Bearer\s+/i, "");
          if (!token) return new Response("Unauthorized", { status: 401 });

          const userClient = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { global: { headers: { Authorization: `Bearer ${token}` } } },
          );
          const { data: userData, error: userErr } = await userClient.auth.getUser();
          if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
          const userId = userData.user.id;

          const { messages } = (await request.json()) as ChatBody;
          if (!Array.isArray(messages)) return new Response("Messages required", { status: 400 });

          const { context, settings } = await buildContext(userId, token);

          // Choose provider
          const provider = settings?.ai_provider ?? "lovable";
          const customKey = settings?.custom_ai_key as string | null;
          const customModel = (settings?.custom_ai_model as string | null) ?? null;

          let model;
          if (provider === "openai" && customKey) {
            model = createOpenAIProvider(customKey)(customModel ?? "gpt-4o-mini");
          } else if (provider === "anthropic" && customKey) {
            model = createAnthropicProvider(customKey)(customModel ?? "claude-3-5-sonnet-20241022");
          } else if (provider === "gemini" && customKey) {
            model = createGeminiProvider(customKey)(customModel ?? "gemini-2.0-flash");
          } else {
            const key = process.env.LOVABLE_API_KEY;
            if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
            model = createLovableAiGatewayProvider(key)(customModel ?? "google/gemini-3-flash-preview");
          }

          const system = `Você é o **Oráculo Cósmico**, uma IA espiritual de alta sabedoria que une astrologia ocidental, numerologia cabalística/pitagórica, psicologia profunda e tradições místicas.

Tom: poético mas claro, acolhedor, sábio, levemente cinematográfico — como um conselheiro espiritual experiente. Use português brasileiro. Use markdown (negrito, listas, citações) para criar respostas visualmente ricas. Não use linguagem fatalista — fale em tendências, convites e potenciais.

REGRAS:
1. Sempre conecte sua resposta ao mapa astral e à numerologia REAIS do consulente abaixo.
2. Cite planetas, signos, casas, aspectos e números específicos quando relevantes.
3. Se faltarem dados, peça com gentileza ou trabalhe com o que tem.
4. Responda de forma estruturada quando útil: resumo → análise → orientação prática → reflexão final.
5. Nunca prometa eventos certos, nem diagnósticos médicos/psiquiátricos.
6. NOMENCLATURA: use o NOME COMPLETO do consulente apenas UMA VEZ — na primeira vez que você se dirigir a ele em toda a conversa (saudação inicial). Em todas as mensagens e mencoes seguintes use SOMENTE o primeiro nome, para criar intimidade. Se a conversa já tiver histórico, assuma que o nome completo já foi usado e refira-se sempre pelo primeiro nome.

---
DADOS DO CONSULENTE:
${context}
---`;

          const result = streamText({
            model,
            system,
            messages: await convertToModelMessages(messages),
            abortSignal: request.signal,
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages,
            onFinish: async ({ responseMessage }) => {
              try {
                // Persist conversation + last messages
                const userText = messages
                  .filter((m) => m.role === "user")
                  .slice(-1)[0];
                const userContent =
                  userText?.parts?.map((p: { type: string; text?: string }) =>
                    p.type === "text" ? p.text ?? "" : "",
                  ).join("") ?? "";
                const assistantContent =
                  responseMessage.parts?.map((p: { type: string; text?: string }) =>
                    p.type === "text" ? p.text ?? "" : "",
                  ).join("") ?? "";

                // Create/find conversation (one rolling for now)
                const { data: existing } = await userClient
                  .from("ai_conversations")
                  .select("id")
                  .eq("user_id", userId)
                  .order("updated_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();

                let convId = existing?.id as string | undefined;
                if (!convId) {
                  const { data: created } = await userClient
                    .from("ai_conversations")
                    .insert({
                      user_id: userId,
                      title: userContent.slice(0, 60) || "Nova consulta",
                    })
                    .select("id")
                    .single();
                  convId = created?.id;
                } else {
                  await userClient
                    .from("ai_conversations")
                    .update({ updated_at: new Date().toISOString() })
                    .eq("id", convId);
                }

                if (convId) {
                  await userClient.from("ai_messages").insert([
                    { conversation_id: convId, user_id: userId, role: "user", content: userContent },
                    { conversation_id: convId, user_id: userId, role: "assistant", content: assistantContent },
                  ]);
                }
              } catch (e) {
                console.error("[oraculo] persist error", e);
              }
            },
          });
        } catch (err) {
          console.error("[/api/chat] error", err);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});
