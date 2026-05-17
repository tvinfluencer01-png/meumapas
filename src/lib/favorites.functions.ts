import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
