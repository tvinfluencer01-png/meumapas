import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createOpenAIProvider,
  createAnthropicProvider,
  createGeminiProvider,
  createGroqProvider,
  createMistralProvider,
  createOpenRouterProvider,
} from "@/lib/ai-gateway";

export type ConfiguredProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "mistral"
  | "openrouter";

const DEFAULT_MODELS: Record<ConfiguredProviderId, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  google: "gemini-2.0-flash",
  groq: "llama-3.3-70b-versatile",
  mistral: "mistral-small-latest",
  openrouter: "google/gemini-2.0-flash-exp:free",
};
const DEFAULT_ORDER: ConfiguredProviderId[] = [
  "openai",
  "anthropic",
  "google",
  "groq",
  "mistral",
  "openrouter",
];

function envKey(p: ConfiguredProviderId): string | null {
  switch (p) {
    case "openai": return process.env.OPENAI_API_KEY ?? null;
    case "anthropic": return process.env.ANTHROPIC_API_KEY ?? null;
    case "google": return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? null;
    case "groq": return process.env.GROQ_API_KEY ?? null;
    case "mistral": return process.env.MISTRAL_API_KEY ?? null;
    case "openrouter": return process.env.OPENROUTER_API_KEY ?? null;
  }
}

function makeProvider(p: ConfiguredProviderId, key: string) {
  switch (p) {
    case "openai": return createOpenAIProvider(key);
    case "anthropic": return createAnthropicProvider(key);
    case "google": return createGeminiProvider(key);
    case "groq": return createGroqProvider(key);
    case "mistral": return createMistralProvider(key);
    case "openrouter": return createOpenRouterProvider(key);
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

/**
 * Resolve TODOS os provedores configurados na ordem de prioridade do usuário,
 * pulando os desabilitados/sem credencial. Usado por `runWithProviderFallback`.
 */
export async function getConfiguredProviders(
  supabase: SupabaseClient | null,
  userId: string | null,
  options?: { requireUserKey?: boolean; addonId?: string | null },
): Promise<ResolvedProvider[]> {
  let requireUserKey = options?.requireUserKey === true;
  if (!requireUserKey && options?.addonId && supabase && userId) {
    try {
      const [{ data: addon }, { data: hasIt }] = await Promise.all([
        supabase.from("addon_settings").select("require_user_key").eq("addon_id", options.addonId).maybeSingle(),
        supabase.rpc("has_active_addon", { _user_id: userId, _addon_id: options.addonId }),
      ]);
      if ((addon as { require_user_key?: boolean } | null)?.require_user_key && hasIt) requireUserKey = true;
    } catch { /* ignore */ }
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
      if (typeof id !== "string" || !(id in DEFAULT_MODELS) || seen.has(id)) continue;
      seen.add(id);
      filtered.push(id as ConfiguredProviderId);
    }
    if (filtered.length) order = filtered;
    cfgMap = ((data?.ai_providers_config as any) ?? {});
    defaultProvider = order[0] ?? null;
    legacyKey = (data?.custom_ai_key as string | null) ?? null;
    legacyModel = (data?.custom_ai_model as string | null) ?? null;
  }

  const out: ResolvedProvider[] = [];
  for (const p of order) {
    const cfg = cfgMap[p] ?? {};
    if (cfg.enabled === false) continue;
    const userKey = (cfg.key && cfg.key.trim()) || (p === defaultProvider ? legacyKey : null) || null;
    const key = userKey || (requireUserKey ? null : envKey(p));
    if (!key) continue;
    const perProviderModel =
      (cfg.model && cfg.model.trim()) ||
      (p === defaultProvider ? legacyModel : null) ||
      DEFAULT_MODELS[p];
    const providerFn = makeProvider(p, key);
    out.push({
      provider: p,
      defaultModel: perProviderModel,
      model: (hint?: string | null) => {
        // Only honor the hint if it targets THIS provider (e.g. "google/..." for google).
        // Otherwise it would try a Google model on Anthropic/OpenAI and always fail.
        let name = perProviderModel;
        if (hint) {
          const slash = hint.indexOf("/");
          const vendor = slash >= 0 ? hint.slice(0, slash) : null;
          if (!vendor || vendor === p) name = stripVendorPrefix(hint) || perProviderModel;
        }
        return providerFn(name);
      },
    });
  }
  return out;
}

export type ProviderAttempt = { provider: ConfiguredProviderId; ok: boolean; error?: string };

/**
 * Executa `run(model)` para cada provider configurado na ordem, retornando o
 * primeiro sucesso. Se todos falharem, lança um erro consolidado.
 */
export async function runWithProviderFallback<T>(
  supabase: SupabaseClient | null,
  userId: string | null,
  run: (model: ReturnType<ResolvedProvider["model"]>, provider: ConfiguredProviderId) => Promise<T>,
  options?: { requireUserKey?: boolean; addonId?: string | null; modelHint?: string | null },
): Promise<{ result: T; provider: ConfiguredProviderId; attempts: ProviderAttempt[] }> {
  const providers = await getConfiguredProviders(supabase, userId, options);
  if (!providers.length) {
    throw new Error(
      options?.requireUserKey
        ? "Este recurso requer sua própria chave de IA. Adicione uma chave em Configurações → IA."
        : "Nenhum provedor de IA configurado. Adicione uma chave em Configurações → IA.",
    );
  }
  const attempts: ProviderAttempt[] = [];
  for (const p of providers) {
    try {
      const model = p.model(options?.modelHint ?? null);
      const result = await run(model, p.provider);
      attempts.push({ provider: p.provider, ok: true });
      console.info(`[ai-fallback] success with ${p.provider} (${attempts.length}/${providers.length})`);
      return { result, provider: p.provider, attempts };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[ai-fallback] ${p.provider} failed: ${msg}`);
      attempts.push({ provider: p.provider, ok: false, error: msg });
    }
  }
  const summary = attempts.map((a) => `${a.provider}: ${a.error}`).join(" | ");
  throw new Error(`Todos os provedores de IA falharam. ${summary}`);
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
