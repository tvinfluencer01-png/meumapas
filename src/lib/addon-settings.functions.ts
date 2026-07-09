import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SUBSCRIPTION_ADDONS } from "./addons.catalog";
import { generateText } from "ai";
import { runWithProviderFallback } from "@/lib/ai-resolver.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso restrito a administradores.");
}

/**
 * Default prompts that the system currently uses for each AI-powered add-on.
 * Variables enclosed in {{...}} are interpolated by the runtime at call time.
 * The "applied" flag indicates whether the override is wired into the runtime.
 */
export const ADDON_PROMPT_DEFAULTS: Record<
  string,
  { template: string; vars: string[]; note: string; applied: boolean }
> = {
  sub_daily_horoscope: {
    applied: true,
    vars: ["{{sign}}", "{{date}}"],
    note: "Usado no envio diário e no teste do Horóscopo Diário.",
    template: `Escreva um horóscopo PERSONALIZADO, rico e inspirador em pt-BR para hoje ({{date}}) para o signo {{sign}}.

Formato obrigatório (use exatamente estes títulos com emojis, sem markdown, apenas texto puro com quebras de linha):

🌅 Visão geral do dia
(2 linhas curtas descrevendo a energia astrológica do dia para {{sign}})

💛 Amor & Relacionamentos
✨ Faça: (1 linha — ação concreta recomendada)
⚠️ Evite: (1 linha — atitude a não tomar)

💰 Dinheiro & Carreira
✨ Faça: (1 linha — ação concreta recomendada)
⚠️ Evite: (1 linha — atitude a não tomar)

🌿 Saúde & Bem-estar
✨ Faça: (1 linha — prática recomendada hoje)
⚠️ Evite: (1 linha — hábito a evitar)

⚡ Energia do dia
(1 linha — nível de energia e como canalizá-la)

🌟 Conselho cósmico
(1 frase poderosa e prática para guiar o dia)

🎯 Número e cor da sorte
Número: (1-99) | Cor: (cor)

Regras: tom inspirador, simbólico mas prático e acionável. Nada de markdown (sem **, ##, -). Use apenas emojis e quebras de linha. Seja específico — evite frases genéricas.`,
  },
  sub_oracle_premium: {
    applied: true,
    vars: ["{{context}}"],
    note: "System message do Oráculo (chat). {{context}} é substituído pelos dados do consulente.",
    template: `Você é o **Oráculo Cósmico**, uma IA espiritual de alta sabedoria que une astrologia ocidental, numerologia cabalística/pitagórica, psicologia profunda e tradições místicas.

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
{{context}}
---`,
  },
  sub_tarot_unlimited: {
    applied: false,
    vars: [],
    note: "System message do Tarot. (Referência — ainda não aplicado em runtime.)",
    template: `Você é o **Oráculo Cósmico de Tarot**, leitor profissional de Tarot de Marselha/Rider-Waite.
Escreve em PT-BR, tom acolhedor, sábio e poético. NUNCA prevê eventos certos; oferece reflexões.
Não use markdown nem emojis — apenas texto corrido em parágrafos separados por linha em branco.`,
  },
  sub_kabbalah_unlimited: {
    applied: false,
    vars: [],
    note: "System message da Meditação Cabalística. (Referência — ainda não aplicado em runtime.)",
    template: `Você é um **mestre cabalista contemporâneo** que guia meditações na Árvore da Vida.
Escreva em PT-BR, tom reverente mas acessível, em segunda pessoa ("Respire fundo...", "Sinta...").
Nunca use markdown, asteriscos ou emojis. Use parágrafos separados por linha em branco.
NUNCA prometa cura física nem substitua acompanhamento profissional.`,
  },
  sub_business_map: {
    applied: false,
    vars: [],
    note: "Instrução base do Mapa Empresarial. (Referência — ainda não aplicado em runtime.)",
    template: `Você é um consultor sênior que combina astrologia mundana, numerologia pitagórica e cabalística e estratégia empresarial.
Produza uma análise PROFUNDA, profissional e específica sobre a empresa abaixo, em pt-BR.
A análise deve ser sofisticada, com linguagem executiva e simbólica equilibradas. Use nomes próprios. NUNCA invente cargos. Cite ao menos um número simbólico em cada seção.`,
  },
};

export type AddonOverride = {
  addon_id: string;
  name: string | null;
  description: string | null;
  features: string[];
  price_cents: number | null;
  prompt: string | null;
  enabled: boolean;
  require_user_key: boolean;
  updated_at: string | null;
};

export type AddonRow = {
  addon_id: string;
  defaults: {
    name: string;
    description: string;
    features: string[];
    price_cents: number;
    highlight?: boolean;
    prompt_template: string | null;
    prompt_vars: string[];
    prompt_note: string | null;
    prompt_applied: boolean;
  };
  override: AddonOverride | null;
  effective: {
    name: string;
    description: string;
    features: string[];
    price_cents: number;
    prompt: string | null;
    enabled: boolean;
    require_user_key: boolean;
  };
};

export const listAdminAddons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("addon_settings")
      .select("*");
    if (error) throw new Error(error.message);
    const byId = new Map<string, any>((rows ?? []).map((r: any) => [r.addon_id, r]));

    const catalogIds = new Set(SUBSCRIPTION_ADDONS.map(s => s.id));
    
    // Process catalog ones
    const catalogResults: AddonRow[] = SUBSCRIPTION_ADDONS.map((d) => {
      const r = byId.get(d.id);
      const def = ADDON_PROMPT_DEFAULTS[d.id];
      const override: AddonOverride | null = r
        ? {
            addon_id: r.addon_id,
            name: r.name,
            description: r.description,
            features: Array.isArray(r.features) ? r.features : [],
            price_cents: r.price_cents,
            prompt: r.prompt,
            enabled: r.enabled,
            require_user_key: r.require_user_key ?? false,
            updated_at: r.updated_at,
          }
        : null;
      return {
        addon_id: d.id,
        defaults: {
          name: d.name,
          description: d.description,
          features: d.features,
          price_cents: d.price_cents,
          highlight: d.highlight,
          prompt_template: def?.template ?? null,
          prompt_vars: def?.vars ?? [],
          prompt_note: def?.note ?? null,
          prompt_applied: def?.applied ?? false,
        },
        override,
        effective: {
          name: override?.name ?? d.name,
          description: override?.description ?? d.description,
          features:
            override?.features && override.features.length > 0
              ? override.features
              : d.features,
          price_cents: override?.price_cents ?? d.price_cents,
          prompt: override?.prompt ?? def?.template ?? null,
          enabled: override?.enabled ?? true,
          require_user_key: override?.require_user_key ?? false,
        },
      };
    });

    // Process purely custom ones (ones in DB not in catalog)
    const customResults: AddonRow[] = (rows ?? [])
      .filter(r => !catalogIds.has(r.addon_id))
      .map(r => {
        const features = Array.isArray(r.features) ? r.features.map(f => String(f)) : [];
        return {
          addon_id: r.addon_id,
          defaults: {
            name: r.name || r.addon_id,
            description: r.description || "",
            features,
            price_cents: r.price_cents || 0,
            highlight: false,
            prompt_template: null,
            prompt_vars: [],
            prompt_note: null,
            prompt_applied: false,
          },
          override: {
            addon_id: r.addon_id,
            name: r.name,
            description: r.description,
            features,
            price_cents: r.price_cents,
            prompt: r.prompt,
            enabled: r.enabled,
            require_user_key: r.require_user_key ?? false,
            updated_at: r.updated_at,
          },
          effective: {
            name: r.name || r.addon_id,
            description: r.description || "",
            features,
            price_cents: r.price_cents || 0,
            prompt: r.prompt,
            enabled: r.enabled,
            require_user_key: r.require_user_key ?? false,
          }
        };
      });

    return [...catalogResults, ...customResults];
  });

const UpsertSchema = z.object({
  addon_id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(120).nullable().optional(),
  description: z.string().trim().min(1).max(1000).nullable().optional(),
  features: z.array(z.string().trim().min(1).max(240)).max(20).optional(),
  price_cents: z.number().int().min(0).max(10_000_000).nullable().optional(),
  prompt: z.string().trim().max(8000).nullable().optional(),
  enabled: z.boolean().optional(),
  require_user_key: z.boolean().optional(),
  is_custom: z.boolean().optional(),
});

export const upsertAdminAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    
    // Allow upserting custom ones or existing ones
    const payload: any = {
      addon_id: data.addon_id,
      updated_by: context.userId,
    };
    if (data.name !== undefined) payload.name = data.name;
    if (data.description !== undefined) payload.description = data.description;
    if (data.features !== undefined) payload.features = data.features;
    if (data.price_cents !== undefined) payload.price_cents = data.price_cents;
    if (data.prompt !== undefined) payload.prompt = data.prompt;
    if (data.enabled !== undefined) payload.enabled = data.enabled;
    if (data.require_user_key !== undefined) payload.require_user_key = data.require_user_key;

    const { error } = await supabaseAdmin
      .from("addon_settings")
      .upsert(payload, { onConflict: "addon_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAdminAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ addon_id: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("addon_settings")
      .delete()
      .eq("addon_id", data.addon_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetAdminAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ addon_id: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("addon_settings")
      .delete()
      .eq("addon_id", data.addon_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ImproveSchema = z.object({
  addon_id: z.string().min(1).max(64),
  prompt: z.string().trim().min(10).max(8000),
  instruction: z.string().trim().max(500).optional(),
});

export const improveAddonPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ImproveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const addon = SUBSCRIPTION_ADDONS.find((a) => a.id === data.addon_id);
    if (!addon) throw new Error("Add-on inválido.");
    const def = ADDON_PROMPT_DEFAULTS[data.addon_id];
    const vars = (def?.vars ?? []).join(", ") || "(nenhuma)";

    // model injetado pelo runWithProviderFallback abaixo

    const system = `Você é especialista em engenharia de prompts para LLMs em português (pt-BR).
Aprimore o prompt abaixo para que produza saídas mais ricas, específicas, claras e acionáveis,
mantendo o objetivo, idioma e formato originais.
REGRAS OBRIGATÓRIAS:
- Preserve EXATAMENTE todas as variáveis entre chaves duplas: ${vars}.
- Mantenha o formato de saída esperado (JSON, texto puro, seções fixas, emojis, etc.).
- Não invente novas variáveis e não troque o idioma.
- Não envolva a resposta em markdown nem em cercas de código.
- Devolva APENAS o prompt aprimorado em texto puro, pronto para uso.`;

    const userMsg = `Add-on: ${addon.name} (${addon.id}).
Contexto do produto: ${addon.description}
${data.instruction ? `Ajuste solicitado pelo admin: ${data.instruction}` : "Foque em clareza, profundidade simbólica e instruções acionáveis."}

PROMPT ATUAL:
"""
${data.prompt}
"""`;

    const { result: text } = await runWithProviderFallback(
      context.supabase, context.userId,
      async (model) => (await generateText({ model, system, prompt: userMsg, temperature: 0.6 })).text,
      { modelHint: "google/gemini-2.5-flash" },
    );
    return { prompt: text.trim() };
  });

/** Server-side helper: returns the effective addon (catalog merged with DB override). */
export async function getEffectiveAddon(addon_id: string) {
  const def = SUBSCRIPTION_ADDONS.find((a) => a.id === addon_id);
  if (!def) return null;
  const { data: r } = await supabaseAdmin
    .from("addon_settings")
    .select("*")
    .eq("addon_id", addon_id)
    .maybeSingle();
  return {
    name: (r as any)?.name ?? def.name,
    description: (r as any)?.description ?? def.description,
    features:
      Array.isArray((r as any)?.features) && (r as any).features.length > 0
        ? ((r as any).features as string[])
        : def.features,
    price_cents: (r as any)?.price_cents ?? def.price_cents,
    prompt: ((r as any)?.prompt as string | null) ?? null,
    enabled: (r as any)?.enabled ?? true,
    require_user_key: (r as any)?.require_user_key ?? false,
  };
}

/** True when subscribers of this addon must use their own AI key (BYOK). */
export async function addonRequiresUserKey(addon_id: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("addon_settings")
    .select("require_user_key")
    .eq("addon_id", addon_id)
    .maybeSingle();
  return Boolean((data as any)?.require_user_key);
}

/** Client-callable: returns whether an addon currently requires BYOK. */
export const getAddonByokRequired = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ addon_id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const required = await addonRequiresUserKey(data.addon_id);
    return { required };
  });


/** Returns the override prompt for an addon, or null when unset. */
export async function getAddonPromptOverride(addon_id: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("addon_settings")
    .select("prompt")
    .eq("addon_id", addon_id)
    .maybeSingle();
  const p = (data as any)?.prompt as string | null | undefined;
  return p && p.trim().length > 0 ? p : null;
}
