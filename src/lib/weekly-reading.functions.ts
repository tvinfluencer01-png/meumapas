import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { generateText } from "ai";
import * as Astro from "astronomy-engine";
import { resolveActiveSubject } from "@/lib/active-subject";

function reduce(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split("").reduce((a, b) => a + Number(b), 0);
  }
  return n;
}
function personalDay(date: Date, birthISO: string) {
  const [, bm, bd] = birthISO.split("-").map(Number);
  const y = date.getUTCFullYear(), m = date.getUTCMonth() + 1, d = date.getUTCDate();
  const py = reduce(reduce(bm) + reduce(bd) + reduce(y));
  const pm = reduce(py + reduce(m));
  return reduce(pm + reduce(d));
}
function moonLabel(angle: number) {
  if (angle < 45) return "Lua Nova";
  if (angle < 90) return "Crescente";
  if (angle < 135) return "Quarto Crescente";
  if (angle < 180) return "Gibosa Crescente";
  if (angle < 225) return "Lua Cheia";
  if (angle < 270) return "Gibosa Minguante";
  if (angle < 315) return "Quarto Minguante";
  return "Minguante";
}
function trendFor(n: number): { label: string; tone: "rise" | "flow" | "release" | "peak" } {
  if (n === 11 || n === 22 || n === 33) return { label: "Portal mestre", tone: "peak" };
  if ([1, 5, 8].includes(n)) return { label: "Movimento e ação", tone: "rise" };
  if ([2, 6, 9].includes(n)) return { label: "Conexão e entrega", tone: "flow" };
  if ([4, 7].includes(n)) return { label: "Estrutura e silêncio", tone: "release" };
  return { label: "Criação e expressão", tone: "flow" };
}

export const getWeeklyReading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { consumeCredits, getCreditCost, hasUnlimitedAccess } = await import("./credits.functions");

    // Cobrança: 1 crédito por leitura, a menos que tenha sub ilimitada
    const action = "weekly_reading";
    const unlimited = await hasUnlimitedAccess(userId, action);
    const cost = unlimited ? 0 : await getCreditCost(action);
    let notice: string | null = null;
    if (!unlimited && cost > 0) {
      const ok = await consumeCredits(userId, action, "Leitura Semanal");
      if (!ok) {
        return {
          days: [] as Array<{ date: string; weekday: string; day: number; personal_day: number | null; moon: { angle: number; label: string }; trend: { label: string; tone: "rise" | "flow" | "release" | "peak" } }>,
          summary: "",
          hasBirth: false,
          notice: `Saldo insuficiente. A leitura semanal custa ${cost} créditos.`,
        };
      }
    }



    const birth = await resolveActiveSubject(supabase, userId);

    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.UTC(
        today.getFullYear(), today.getMonth(), today.getDate() + i, 12, 0, 0,
      ));
      const angle = Astro.MoonPhase(d);
      const pd = birth ? personalDay(d, birth.birth_date) : null;
      const trend = pd ? trendFor(pd) : { label: "Equilíbrio", tone: "flow" as const };
      return {
        date: d.toISOString().slice(0, 10),
        weekday: d.toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" }),
        day: d.getUTCDate(),
        personal_day: pd,
        moon: { angle, label: moonLabel(angle) },
        trend,
      };
    });

    let summary = "";
    const apiKey = process.env.LOVABLE_API_KEY;
    if (apiKey) {
      try {
        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-3-flash-preview");
        const prompt = `Você é um astrólogo e numerólogo cabalístico. Escreva uma leitura semanal curta (3 a 4 frases, máx 70 palavras) em português, poética, prática e personalizada. Identifique o tema central da semana, o dia de maior potência e um conselho final. Não use listas, apenas prosa contínua.

${birth?.full_name ? `Pessoa: ${birth.full_name.split(" ")[0]}` : ""}
Próximos 7 dias:
${days.map((d) => `- ${d.date} (${d.weekday}): dia pessoal ${d.personal_day ?? "?"}, ${d.moon.label}, tendência: ${d.trend.label}`).join("\n")}`;
        const { text } = await generateText({ model, prompt });
        summary = text.trim();
      } catch (err) {
        console.error("[weekly-reading] AI error", err);
      }
    }

    return { days, summary, hasBirth: !!birth };
  });
