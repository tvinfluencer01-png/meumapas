import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createOpenAIProvider,
  createAnthropicProvider,
  createGeminiProvider,
} from "@/lib/ai-gateway";

export type ConfiguredProviderId = "openai" | "anthropic" | "google";

const DEFAULT_MODELS: Record<ConfiguredProviderId, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  google: "gemini-2.5-flash",
};
const DEFAULT_ORDER: ConfiguredProviderId[] = ["openai", "anthropic", "google"];

function envKey(p: ConfiguredProviderId): string | null {
  switch (p) {
    case "openai": return process.env.OPENAI_API_KEY ?? null;
    case "anthropic": return process.env.ANTHROPIC_API_KEY ?? null;
    case "google": return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? null;
  }
}

function makeProvider(p: ConfiguredProviderId, key: string) {
  switch (p) {
    case "openai": return createOpenAIProvider(key);
    case "anthropic": return createAnthropicProvider(key);
    case "google": return createGeminiProvider(key);
  }
}

/** Remove a "vendor/" prefix (e.g. "google/gemini-2.5-flash" → "gemini-2.5-flash"). */
function stripVendorPrefix(m?: string | null): string | null {
  if (!m) return null;
  const idx = m.indexOf("/");
  return idx >= 0 ? m.slice(idx + 1) : m;
}

export type ResolvedProvider = {
  provider: ConfiguredProviderId;
  defaultModel: string;
  /** Build a language model instance; if a hint is passed and starts with "vendor/", the prefix is stripped. */
  model: (hint?: string | null) => ReturnType<ReturnType<typeof createOpenAIProvider>>;
};

/**
 * Resolve the first enabled, credentialed AI provider based on the user's
 * settings (falling back to system env keys when no user is provided or when
 * the user has not saved a key). Throws when no provider is configured.
 */
export async function getConfiguredProvider(
  supabase: SupabaseClient | null,
  userId: string | null,
  options?: { requireUserKey?: boolean; addonId?: string | null },
): Promise<ResolvedProvider> {
  let requireUserKey = options?.requireUserKey === true;

  // If an addonId is given and the user has that addon active AND the admin
  // marked the addon as "require user key" (BYOK), enforce user key.
  if (!requireUserKey && options?.addonId && supabase && userId) {
    try {
      const [{ data: addon }, { data: hasIt }] = await Promise.all([
        supabase
          .from("addon_settings")
          .select("require_user_key")
          .eq("addon_id", options.addonId)
          .maybeSingle(),
        supabase.rpc("has_active_addon", {
          _user_id: userId,
          _addon_id: options.addonId,
        }),
      ]);
      if ((addon as { require_user_key?: boolean } | null)?.require_user_key && hasIt) {
        requireUserKey = true;
      }
    } catch {
      // ignore lookup failures — default behavior applies
    }
  }
  let order: ConfiguredProviderId[] = DEFAULT_ORDER;
  let cfgMap: Record<string, { enabled?: boolean; key?: string; model?: string }> = {};
  let legacyKey: string | null = null;
  let legacyModel: string | null = null;
  let defaultProvider: ConfiguredProviderId | null = null;

  if (supabase && userId) {
    const { data } = await supabase
      .from("user_settings")
      .select("ai_provider_order, ai_provider, custom_ai_key, custom_ai_model, ai_providers_config")
      .eq("user_id", userId)
      .maybeSingle();
    const raw =
      (data?.ai_provider_order as string[] | null) ??
      (data?.ai_provider ? [data.ai_provider] : []);
    const seen = new Set<string>();
    const filtered: ConfiguredProviderId[] = [];
    for (const id of [...raw, ...DEFAULT_ORDER]) {
      if (typeof id !== "string") continue;
      if (!(id in DEFAULT_MODELS)) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      filtered.push(id as ConfiguredProviderId);
    }
    if (filtered.length) order = filtered;
    cfgMap =
      ((data?.ai_providers_config as Record<
        string,
        { enabled?: boolean; key?: string; model?: string }
      > | null) ?? {});
    defaultProvider = order[0] ?? null;
    legacyKey = (data?.custom_ai_key as string | null) ?? null;
    legacyModel = (data?.custom_ai_model as string | null) ?? null;
  }

  for (const p of order) {
    const cfg = cfgMap[p] ?? {};
    if (cfg.enabled === false) continue;
    const userKey =
      (cfg.key && cfg.key.trim()) ||
      (p === defaultProvider ? legacyKey : null) ||
      null;
    const key = userKey || (requireUserKey ? null : envKey(p));
    if (!key) continue;
    const perProviderModel =
      (cfg.model && cfg.model.trim()) ||
      (p === defaultProvider ? legacyModel : null) ||
      DEFAULT_MODELS[p];
    const providerFn = makeProvider(p, key);
    return {
      provider: p,
      defaultModel: perProviderModel,
      model: (hint?: string | null) =>
        providerFn(stripVendorPrefix(hint) || perProviderModel),
    };
  }

  throw new Error(
    requireUserKey
      ? "Este recurso requer sua própria chave de IA. Adicione uma chave (OpenAI, Anthropic ou Google) em Configurações → IA."
      : "Nenhum provedor de IA configurado. Adicione uma chave de OpenAI, Anthropic ou Google em Configurações → IA.",
  );
}

/** Retrieve the API key for a specific provider from user settings or env. */
export async function getConfiguredProviderKey(
  supabase: SupabaseClient | null,
  userId: string | null,
  provider: ConfiguredProviderId,
): Promise<string | null> {
  if (supabase && userId) {
    const { data } = await supabase
      .from("user_settings")
      .select("ai_provider, custom_ai_key, ai_providers_config")
      .eq("user_id", userId)
      .maybeSingle();
    const cfgMap =
      ((data?.ai_providers_config as Record<
        string,
        { enabled?: boolean; key?: string }
      > | null) ?? {});
    const cfgKey = cfgMap[provider]?.key?.trim();
    if (cfgKey) return cfgKey;
    if (data?.ai_provider === provider && data.custom_ai_key) {
      const legacy = String(data.custom_ai_key).trim();
      if (legacy) return legacy;
    }
  }
  return envKey(provider);
}
