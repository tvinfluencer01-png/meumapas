import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MARKETING_SIGNATURE } from "./marketing.catalog";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso restrito a administradores.");
}

export type MarketingMessage = {
  id: string;
  title: string;
  body: string;
  services: string[];
  enabled: boolean;
  weight: number;
  created_at: string;
  updated_at: string;
};

export const listMarketingMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("marketing_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as MarketingMessage[];
  });

const UpsertSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1, "Título obrigatório").max(120),
  body: z.string().trim().min(1, "Mensagem obrigatória").max(800),
  services: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  weight: z.number().int().min(1).max(100).default(1),
});

export const upsertMarketingMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      title: data.title,
      body: data.body,
      services: data.services,
      enabled: data.enabled,
      weight: data.weight,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("marketing_messages")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("marketing_messages")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id as string };
  });

export const deleteMarketingMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("marketing_messages")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Escolhe uma mensagem de marketing aleatória (ponderada por `weight`) para o serviço.
 * Pode ser chamado de cron/server routes — usa supabaseAdmin direto.
 * Retorna texto pronto pra anexar ao final, já com assinatura "— Código Cósmico".
 */
export async function pickMarketingFooter(
  service: string,
): Promise<string> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("marketing_messages")
      .select("body, weight")
      .eq("enabled", true)
      .contains("services", [service]);
    const rows = (data ?? []) as Array<{ body: string; weight: number }>;
    if (rows.length === 0) return `— ${MARKETING_SIGNATURE}`;
    const total = rows.reduce((a, r) => a + Math.max(1, r.weight), 0);
    let pick = Math.random() * total;
    let chosen = rows[0]!.body;
    for (const r of rows) {
      pick -= Math.max(1, r.weight);
      if (pick <= 0) { chosen = r.body; break; }
    }
    return `${chosen}\n\n— ${MARKETING_SIGNATURE}`;
  } catch {
    return `— ${MARKETING_SIGNATURE}`;
  }
}
