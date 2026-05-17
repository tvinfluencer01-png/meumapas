import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { generateText } from "ai";
import * as Astro from "astronomy-engine";

// --- numerology helpers (digit reduction, masters preserved) -------------
function reduce(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split("").reduce((a, b) => a + Number(b), 0);
  }
  return n;
}
function personalDay(dateISO: string, birthISO: string) {
  const [by, bm, bd] = birthISO.split("-").map(Number);
  const [y, m, d] = dateISO.split("-").map(Number);
  const personalYear = reduce(reduce(bm) + reduce(bd) + reduce(y));
  const personalMonth = reduce(personalYear + reduce(m));
  return reduce(personalMonth + reduce(d));
}

// --- moon phase ----------------------------------------------------------
function moonPhase(date: Date) {
  // 0 = new, 90 = first quarter, 180 = full, 270 = last quarter
  const angle = Astro.MoonPhase(date);
  let label = "Lua Nova";
  let icon = "new";
  if (angle < 45) { label = "Lua Nova"; icon = "new"; }
  else if (angle < 90) { label = "Crescente"; icon = "waxing-crescent"; }
  else if (angle < 135) { label = "Quarto Crescente"; icon = "first-quarter"; }
  else if (angle < 180) { label = "Gibosa Crescente"; icon = "waxing-gibbous"; }
  else if (angle < 225) { label = "Lua Cheia"; icon = "full"; }
  else if (angle < 270) { label = "Gibosa Minguante"; icon = "waning-gibbous"; }
  else if (angle < 315) { label = "Quarto Minguante"; icon = "last-quarter"; }
  else { label = "Minguante"; icon = "waning-crescent"; }
  return { angle, label, icon };
}

function intensityFromNum(n: number): "calm" | "balanced" | "intense" | "peak" {
  if (n === 11 || n === 22 || n === 33) return "peak";
  if ([1, 5, 8, 9].includes(n)) return "intense";
  if ([3, 6, 7].includes(n)) return "balanced";
  return "calm";
}

export const getEnergyCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      year: z.number().int().min(1900).max(2200),
      month: z.number().int().min(1).max(12), // 1-12
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Birth data
    const { data: birth } = await supabase
      .from("birth_data")
      .select("birth_date, full_name")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .maybeSingle();

    const daysInMonth = new Date(data.year, data.month, 0).getDate();
    const days: Array<{
      date: string;
      day: number;
      weekday: number;
      personal_day: number | null;
      intensity: "calm" | "balanced" | "intense" | "peak";
      moon: { label: string; icon: string; angle: number };
    }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(data.year, data.month - 1, d, 12, 0, 0));
      const iso = `${data.year}-${String(data.month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const pd = birth ? personalDay(iso, birth.birth_date) : null;
      days.push({
        date: iso,
        day: d,
        weekday: date.getUTCDay(),
        personal_day: pd,
        intensity: pd ? intensityFromNum(pd) : "balanced",
        moon: moonPhase(date),
      });
    }

    // AI insights for next 7 days
    const today = new Date();
    const upcoming = days.filter((x) => {
      const dd = new Date(x.date + "T12:00:00Z");
      const diff = (dd.getTime() - today.getTime()) / 86400000;
      return diff >= -0.5 && diff <= 7;
    }).slice(0, 7);

    type DayInsight = { emotions: string; actions: string; alert: string };
    let insights: Record<string, DayInsight> = {};
    const apiKey = process.env.LOVABLE_API_KEY;
    if (apiKey && upcoming.length > 0) {
      try {
        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-3-flash-preview");
        const prompt = `Você é um astrólogo e numerólogo cabalístico. Para cada dia abaixo, gere 3 mensagens curtas, humanizadas e personalizadas em português:
- "emotions": clima emocional esperado (1 frase, máx 20 palavras, tom acolhedor)
- "actions": 1 ou 2 ações práticas recomendadas (máx 22 palavras, verbos no imperativo suave)
- "alert": um alerta ou cuidado a observar (máx 18 palavras, sem alarmismo)

Considere o número pessoal e a fase da lua de cada dia. Responda APENAS em JSON válido no formato:
{"YYYY-MM-DD":{"emotions":"...","actions":"...","alert":"..."}, ...}
Sem comentários, sem markdown, sem texto antes ou depois.

${upcoming.map((u) => `- ${u.date}: número pessoal ${u.personal_day ?? "?"}, ${u.moon.label}`).join("\n")}`;

        const { text } = await generateText({ model, prompt });
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try { insights = JSON.parse(match[0]); } catch { /* ignore */ }
        }
      } catch (err) {
        console.error("[energy-calendar] AI error", err);
      }
    }

    return { days, insights, hasBirth: !!birth };
  });
