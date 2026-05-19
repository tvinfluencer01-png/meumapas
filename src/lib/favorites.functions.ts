import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveActiveSubject } from "@/lib/active-subject";

export const listFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("calendar_favorites")
      .select("id, date, note, created_at")
      .order("date", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      note: z.string().max(280).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("calendar_favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("date", data.date)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("calendar_favorites")
        .delete()
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { action: "removed" as const, date: data.date };
    }

    const { error } = await supabase
      .from("calendar_favorites")
      .insert({ user_id: userId, date: data.date, note: data.note ?? null });
    if (error) throw new Error(error.message);
    return { action: "added" as const, date: data.date };
  });

export const updateFavoriteNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      note: z.string().max(280),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("calendar_favorites")
      .update({ note: data.note })
      .eq("user_id", userId)
      .eq("date", data.date);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { generateText } from "ai";
import * as Astro from "astronomy-engine";

function _reduce(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split("").reduce((a, b) => a + Number(b), 0);
  }
  return n;
}
function _personalDay(dateISO: string, birthISO: string) {
  const [by, bm, bd] = birthISO.split("-").map(Number);
  const [y, m, d] = dateISO.split("-").map(Number);
  const py = _reduce(_reduce(bm) + _reduce(bd) + _reduce(y));
  const pm = _reduce(py + _reduce(m));
  return _reduce(pm + _reduce(d));
}
function _moonLabel(date: Date) {
  const a = Astro.MoonPhase(date);
  if (a < 45) return "Lua Nova";
  if (a < 90) return "Crescente";
  if (a < 135) return "Quarto Crescente";
  if (a < 180) return "Gibosa Crescente";
  if (a < 225) return "Lua Cheia";
  if (a < 270) return "Gibosa Minguante";
  if (a < 315) return "Quarto Minguante";
  return "Minguante";
}

export const generateFavoriteNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const birth = await resolveActiveSubject(supabase, userId);

    const dateObj = new Date(data.date + "T12:00:00Z");
    const pd = birth ? _personalDay(data.date, birth.birth_date) : null;
    const moon = _moonLabel(dateObj);
    const weekday = dateObj.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" });
    const dateLabel = dateObj.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" });

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI indisponível no momento.");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const prompt = `Você é um astrólogo numerólogo cabalístico. Escreva UMA nota pessoal, humanizada e acolhedora em português (PT-BR) para marcar este dia como favorito no calendário energético de ${birth?.full_name ?? "esta pessoa"}.

Dia: ${weekday}, ${dateLabel}
Número pessoal: ${pd ?? "desconhecido"}
Fase da lua: ${moon}

Regras:
- Máximo 240 caracteres (CRÍTICO).
- 1 a 2 frases curtas.
- Tom íntimo, inspirador, sem clichês nem emojis.
- Conecte o número pessoal com a fase da lua de forma sutil.
- Não comece com "Hoje" nem com a data.
- Responda APENAS com o texto da nota, sem aspas, sem markdown.`;

    const { text } = await generateText({ model, prompt });
    const note = text.trim().replace(/^["']|["']$/g, "").slice(0, 280);

    const { data: existing } = await supabase
      .from("calendar_favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("date", data.date)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("calendar_favorites")
        .update({ note })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("calendar_favorites")
        .insert({ user_id: userId, date: data.date, note });
      if (error) throw new Error(error.message);
    }

    return { note };
  });
