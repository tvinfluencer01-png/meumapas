import { generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createLovableAiGatewayProvider,
  createOpenAIProvider,
  createAnthropicProvider,
  createGeminiProvider,
} from "@/lib/ai-gateway";

export type AiProviderId = "lovable" | "openai" | "anthropic" | "google";

const DEFAULT_MODELS: Record<AiProviderId, string> = {
  lovable: "google/gemini-3-flash-preview",
  openai: "gpt-5.5",
  anthropic: "claude-3-5-sonnet-latest",
  google: "gemini-2.5-flash",
};

const DEFAULT_ORDER: AiProviderId[] = ["openai", "lovable", "anthropic", "google"];

function normalizeOrder(order: unknown): AiProviderId[] {
  const seen = new Set<string>();
  const out: AiProviderId[] = [];
  const arr = Array.isArray(order) ? order : [];
  for (const id of [...arr, ...DEFAULT_ORDER]) {
    if (typeof id !== "string") continue;
    if (!(id in DEFAULT_MODELS)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id as AiProviderId);
  }
  return out;
}

function buildModel(
  provider: AiProviderId,
  opts: { customKey?: string | null; customModel?: string | null },
) {
  switch (provider) {
    case "lovable": {
      const key = process.env.LOVABLE_API_KEY;
      if (!key) return null;
      return createLovableAiGatewayProvider(key)(DEFAULT_MODELS.lovable);
    }
    case "openai": {
      const key = opts.customKey || process.env.OPENAI_API_KEY;
      if (!key) return null;
      return createOpenAIProvider(key)(opts.customModel || DEFAULT_MODELS.openai);
    }
    case "anthropic": {
      const key = opts.customKey || process.env.ANTHROPIC_API_KEY;
      if (!key) return null;
      return createAnthropicProvider(key)(opts.customModel || DEFAULT_MODELS.anthropic);
    }
    case "google": {
      const key = opts.customKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!key) return null;
      return createGeminiProvider(key)(opts.customModel || DEFAULT_MODELS.google);
    }
  }
}

export type FallbackResult = { text: string; providerUsed: AiProviderId };

/**
 * Try each configured AI provider in order; return first success.
 * Falls back on timeout, network error, rate limits, or provider errors.
 */
export async function generateWithFallback(
  supabase: SupabaseClient,
  userId: string,
  prompt: string,
  options?: { timeoutMs?: number },
): Promise<FallbackResult> {
  const timeoutMs = options?.timeoutMs ?? 45_000;

  const { data: settings } = await supabase
    .from("user_settings")
    .select("ai_provider_order, ai_provider, custom_ai_key, custom_ai_model")
    .eq("user_id", userId)
    .maybeSingle();

  const rawOrder = (settings?.ai_provider_order as string[] | null) ?? null;
  const withDefault = rawOrder ?? (settings?.ai_provider ? [settings.ai_provider] : []);
  const order = normalizeOrder(withDefault);
  const defaultProvider = order[0];

  const errors: string[] = [];

  for (const provider of order) {
    // custom key applies only to the provider currently selected as user's default
    const useCustom = provider === defaultProvider && settings?.custom_ai_key;
    const model = buildModel(provider, {
      customKey: useCustom ? settings?.custom_ai_key : null,
      customModel: useCustom ? settings?.custom_ai_model : null,
    });
    if (!model) {
      errors.push(`${provider}: not configured`);
      continue;
    }
    try {
      const { text } = await Promise.race([
        generateText({ model, prompt }),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("timeout")), timeoutMs),
        ),
      ]);
      if (!text || !text.trim()) throw new Error("empty response");
      return { text, providerUsed: provider };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[ai-fallback] ${provider} failed:`, msg);
      errors.push(`${provider}: ${msg}`);
      continue;
    }
  }

  throw new Error(`All AI providers failed. ${errors.join(" | ")}`);
}
