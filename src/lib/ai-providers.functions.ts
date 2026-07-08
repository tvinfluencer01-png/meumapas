import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProviderIdSchema = z.enum(["openai", "anthropic", "google"]);

async function resolveKey(
  provider: z.infer<typeof ProviderIdSchema>,
  suppliedKey: string | null | undefined,
): Promise<string | null> {
  const raw = suppliedKey?.trim();
  if (raw) return raw;
  switch (provider) {
    case "openai": return process.env.OPENAI_API_KEY ?? null;
    case "anthropic": return process.env.ANTHROPIC_API_KEY ?? null;
    case "google": return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? null;
  }
}

/** List available models for a provider using the supplied (or env) key. */
export const listProviderModels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ provider: ProviderIdSchema, key: z.string().optional().nullable() }).parse(d),
  )
  .handler(async ({ data }) => {
    const key = await resolveKey(data.provider, data.key);
    if (!key) return { ok: false as const, error: "Chave não configurada", models: [] };

    try {
      if (data.provider === "openai") {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) return { ok: false as const, error: `OpenAI ${res.status}`, models: [] };
        const json = (await res.json()) as { data?: Array<{ id: string }> };
        const models = (json.data ?? [])
          .map((m) => m.id)
          .filter((id) => /^(gpt-|o[13]|chatgpt-)/i.test(id))
          .sort();
        return { ok: true as const, models };
      }
      if (data.provider === "anthropic") {
        const res = await fetch("https://api.anthropic.com/v1/models", {
          headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
        });
        if (!res.ok) return { ok: false as const, error: `Anthropic ${res.status}`, models: [] };
        const json = (await res.json()) as { data?: Array<{ id: string }> };
        return { ok: true as const, models: (json.data ?? []).map((m) => m.id).sort() };
      }
      if (data.provider === "google") {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
        );
        if (!res.ok) return { ok: false as const, error: `Google ${res.status}`, models: [] };
        const json = (await res.json()) as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> };
        const models = (json.models ?? [])
          .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m) => m.name.replace(/^models\//, ""))
          .sort();
        return { ok: true as const, models };
      }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Erro desconhecido", models: [] };
    }
    return { ok: false as const, error: "Provedor desconhecido", models: [] };
  });

/** Test a provider by sending a tiny chat completion. */
export const testProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      provider: ProviderIdSchema,
      key: z.string().optional().nullable(),
      model: z.string().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const key = await resolveKey(data.provider, data.key);
    if (!key) return { ok: false as const, message: "Chave não configurada" };
    const started = Date.now();
    try {
      const { generateText } = await import("ai");
      const {
        createOpenAIProvider,
        createAnthropicProvider,
        createGeminiProvider,
      } = await import("@/lib/ai-gateway");
      let model;
      switch (data.provider) {
        case "openai": model = createOpenAIProvider(key)(data.model || "gpt-5.5"); break;
        case "anthropic": model = createAnthropicProvider(key)(data.model || "claude-3-5-sonnet-latest"); break;
        case "google": model = createGeminiProvider(key)(data.model || "gemini-2.5-flash"); break;
      }
      const { text } = await Promise.race([
        generateText({ model, prompt: "Responda apenas: OK" }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout 15s")), 15_000)),
      ]);
      return {
        ok: true as const,
        message: `Resposta em ${Date.now() - started}ms: ${text.trim().slice(0, 80)}`,
      };
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : "Erro desconhecido" };
    }
  });
