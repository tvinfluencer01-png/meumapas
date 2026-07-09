import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProviderIdSchema = z.enum([
  "openai",
  "anthropic",
  "google",
  "groq",
  "mistral",
  "openrouter",
]);

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
    case "groq": return process.env.GROQ_API_KEY ?? null;
    case "mistral": return process.env.MISTRAL_API_KEY ?? null;
    case "openrouter": return process.env.OPENROUTER_API_KEY ?? null;
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
      if (data.provider === "groq" || data.provider === "mistral" || data.provider === "openrouter") {
        const baseURL =
          data.provider === "groq" ? "https://api.groq.com/openai/v1" :
          data.provider === "mistral" ? "https://api.mistral.ai/v1" :
          "https://openrouter.ai/api/v1";
        const res = await fetch(`${baseURL}/models`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) return { ok: false as const, error: `${data.provider} ${res.status}`, models: [] };
        const json = (await res.json()) as { data?: Array<{ id: string }> };
        return { ok: true as const, models: (json.data ?? []).map((m) => m.id).sort() };
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
        createGroqProvider,
        createMistralProvider,
        createOpenRouterProvider,
      } = await import("@/lib/ai-gateway");
      const buildModel = () => {
        switch (data.provider) {
          case "openai": return createOpenAIProvider(key)(data.model || "gpt-4o-mini");
          case "anthropic": return createAnthropicProvider(key)(data.model || "claude-3-5-sonnet-latest");
          case "google": return createGeminiProvider(key)(data.model || "gemini-2.0-flash");
          case "groq": return createGroqProvider(key)(data.model || "llama-3.3-70b-versatile");
          case "mistral": return createMistralProvider(key)(data.model || "mistral-small-latest");
          case "openrouter": return createOpenRouterProvider(key)(data.model || "google/gemini-2.0-flash-exp:free");
        }
      };
      const model = buildModel()!;
      const { text } = await Promise.race([
        generateText({ model, prompt: "Responda apenas: OK" }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout 15s")), 15_000)),
      ]);
      return {
        ok: true as const,
        message: `Resposta em ${Date.now() - started}ms: ${text.trim().slice(0, 80)}`,
      };
    } catch (e) {
      return { ok: false as const, message: friendlyError(e instanceof Error ? e.message : "Erro desconhecido") };
    }
  });
function friendlyError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("timeout")) return "Tempo esgotado (timeout)";
  if (s.includes("429") || s.includes("rate") || s.includes("quota") || s.includes("limit")) return "Limite de uso atingido";
  if (s.includes("401") || s.includes("403") || s.includes("unauthor") || s.includes("invalid") && s.includes("key") || s.includes("api key")) return "Chave inválida ou sem permissão";
  if (s.includes("404") || s.includes("not found") || s.includes("não encontrado") || s.includes("recurso")) return "Modelo/endpoint não disponível para esta chave";
  if (s.includes("500") || s.includes("502") || s.includes("503") || s.includes("504") || s.includes("unavail")) return "Serviço indisponível";
  if (s.includes("network") || s.includes("fetch") || s.includes("enotfound") || s.includes("econnrefused")) return "Falha de rede";
  return raw;
}

const ImageProviderIdSchema = z.enum([
  "img_pollinations",
  "img_huggingface",
  "img_together",
  "img_openai",
  "img_stability",
  "img_replicate",
]);

function resolveImageKey(
  provider: z.infer<typeof ImageProviderIdSchema>,
  supplied: string | null | undefined,
): string | null {
  const raw = supplied?.trim();
  if (raw) return raw;
  switch (provider) {
    case "img_pollinations": return "public";
    case "img_huggingface": return process.env.HUGGINGFACE_API_KEY ?? process.env.HF_API_KEY ?? null;
    case "img_together": return process.env.TOGETHER_API_KEY ?? null;
    case "img_openai": return process.env.OPENAI_API_KEY ?? null;
    case "img_stability": return process.env.STABILITY_API_KEY ?? null;
    case "img_replicate": return process.env.REPLICATE_API_TOKEN ?? null;
  }
}

/** Test an image provider by generating a tiny image. */
export const testImageProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      provider: ImageProviderIdSchema,
      key: z.string().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const key = resolveImageKey(data.provider, data.key);
    if (!key) return { ok: false as const, message: "Chave não configurada" };
    const started = Date.now();
    try {
      const doCall = async (): Promise<{ ok: true; bytes: number } | { ok: false; msg: string }> => {
        const prompt = "a small blue circle on white";
        if (data.provider === "img_pollinations") {
          const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=256&height=256&nologo=true`;
          const r = await fetch(url);
          if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
          const b = await r.arrayBuffer();
          return { ok: true, bytes: b.byteLength };
        }
        if (data.provider === "img_openai") {
          const r = await fetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${key}` },
          });
          if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
          return { ok: true, bytes: 0 };
        }
        if (data.provider === "img_huggingface") {
          const r = await fetch("https://huggingface.co/api/whoami-v2", {
            headers: { Authorization: `Bearer ${key}` },
          });
          if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
          return { ok: true, bytes: 0 };
        }
        if (data.provider === "img_together") {
          const r = await fetch("https://api.together.xyz/v1/models", {
            headers: { Authorization: `Bearer ${key}` },
          });
          if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
          return { ok: true, bytes: 0 };
        }
        if (data.provider === "img_stability") {
          const r = await fetch("https://api.stability.ai/v1/user/account", {
            headers: { Authorization: `Bearer ${key}` },
          });
          if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
          return { ok: true, bytes: 0 };
        }
        if (data.provider === "img_replicate") {
          const r = await fetch("https://api.replicate.com/v1/account", {
            headers: { Authorization: `Bearer ${key}` },
          });
          if (!r.ok) return { ok: false, msg: `HTTP ${r.status}` };
          return { ok: true, bytes: 0 };
        }
        return { ok: false, msg: "Provedor desconhecido" };
      };
      const res = await Promise.race([
        doCall(),
        new Promise<{ ok: false; msg: string }>((resolve) =>
          setTimeout(() => resolve({ ok: false, msg: "timeout 15s" }), 15_000),
        ),
      ]);
      if (!res.ok) return { ok: false as const, message: friendlyError(res.msg) };
      const suffix = res.bytes ? ` (${res.bytes} bytes)` : "";
      return { ok: true as const, message: `Autenticado em ${Date.now() - started}ms${suffix}` };
    } catch (e) {
      return { ok: false as const, message: friendlyError(e instanceof Error ? e.message : "Erro desconhecido") };
    }
  });

