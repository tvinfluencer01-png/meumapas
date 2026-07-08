import type { SupabaseClient } from "@supabase/supabase-js";

export type ImageProviderId =
  | "img_pollinations"
  | "img_huggingface"
  | "img_together"
  | "img_openai"
  | "img_stability"
  | "img_replicate";

const DEFAULT_ORDER: ImageProviderId[] = [
  "img_pollinations",
  "img_huggingface",
  "img_together",
  "img_openai",
  "img_stability",
  "img_replicate",
];

function envKey(p: ImageProviderId): string | null {
  switch (p) {
    case "img_pollinations":
      return "public";
    case "img_huggingface":
      return process.env.HUGGINGFACE_API_KEY ?? process.env.HF_API_KEY ?? null;
    case "img_together":
      return process.env.TOGETHER_API_KEY ?? null;
    case "img_openai":
      return process.env.OPENAI_API_KEY ?? null;
    case "img_stability":
      return process.env.STABILITY_API_KEY ?? null;
    case "img_replicate":
      return process.env.REPLICATE_API_TOKEN ?? null;
  }
}

async function callProvider(
  p: ImageProviderId,
  key: string,
  prompt: string,
  size: string,
): Promise<Uint8Array | null> {
  const [wStr, hStr] = size.split("x");
  const w = Number(wStr) || 1024;
  const h = Number(hStr) || 1024;

  if (p === "img_pollinations") {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt,
    )}?width=${w}&height=${h}&nologo=true&enhance=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  if (p === "img_openai") {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-image-1", prompt, size, n: 1 }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const b64 = j?.data?.[0]?.b64_json;
    if (b64) return Buffer.from(b64, "base64");
    const url = j?.data?.[0]?.url;
    if (url) {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    }
    return null;
  }

  if (p === "img_huggingface") {
    const res = await fetch(
      "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: prompt, parameters: { width: w, height: h } }),
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  if (p === "img_together") {
    const res = await fetch("https://api.together.xyz/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "black-forest-labs/FLUX.1-schnell-Free",
        prompt,
        width: w,
        height: h,
        n: 1,
        response_format: "b64_json",
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = j?.data?.[0]?.b64_json;
    return b64 ? Buffer.from(b64, "base64") : null;
  }

  if (p === "img_stability") {
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("output_format", "png");
    form.append("aspect_ratio", w === h ? "1:1" : w > h ? "3:2" : "2:3");
    const res = await fetch(
      "https://api.stability.ai/v2beta/stable-image/generate/core",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, Accept: "image/*" },
        body: form,
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  if (p === "img_replicate") {
    const res = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({ input: { prompt, aspect_ratio: w === h ? "1:1" : w > h ? "3:2" : "2:3" } }),
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = (await res.json()) as { output?: string | string[] };
    const url = Array.isArray(j.output) ? j.output[0] : j.output;
    if (!url) return null;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return new Uint8Array(await r.arrayBuffer());
  }
  return null;
}

/**
 * Generate an image using the first configured image provider (BYOK first,
 * then system env). Order mirrors the Settings → IA (Geração de Imagens) UI.
 */
export async function generateImageWithConfigured(
  supabase: SupabaseClient | null,
  userId: string | null,
  prompt: string,
  size = "1024x1024",
): Promise<Uint8Array> {
  let cfgMap: Record<string, { enabled?: boolean; key?: string }> = {};
  let order: ImageProviderId[] = DEFAULT_ORDER;
  if (supabase && userId) {
    const { data } = await supabase
      .from("user_settings")
      .select("ai_providers_config")
      .eq("user_id", userId)
      .maybeSingle();
    const raw =
      ((data?.ai_providers_config as Record<
        string,
        { enabled?: boolean; key?: string } | string[] | undefined
      > | null) ?? {});
    cfgMap = raw as Record<string, { enabled?: boolean; key?: string }>;
    const savedOrder = raw["__image_order"] as unknown;
    if (Array.isArray(savedOrder)) {
      const seen = new Set<string>();
      const filtered: ImageProviderId[] = [];
      for (const id of [...(savedOrder as string[]), ...DEFAULT_ORDER]) {
        if (typeof id !== "string") continue;
        if (!DEFAULT_ORDER.includes(id as ImageProviderId)) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        filtered.push(id as ImageProviderId);
      }
      if (filtered.length) order = filtered;
    }
  }
  const errors: string[] = [];
  for (const p of order) {

    const cfg = cfgMap[p] ?? {};
    if (cfg.enabled === false) continue;
    const key = (cfg.key && cfg.key.trim()) || envKey(p);
    if (!key) continue;
    try {
      const bytes = await callProvider(p, key, prompt, size);
      if (bytes && bytes.byteLength > 512) return bytes;
      errors.push(`${p}: resposta vazia`);
    } catch (e) {
      errors.push(`${p}: ${(e as Error)?.message ?? String(e)}`);
    }
  }
  throw new Error(
    `Nenhum provedor de imagem disponível. Ative pelo menos um em Configurações → IA (Geração de Imagens). ${errors.join(" | ")}`,
  );
}
