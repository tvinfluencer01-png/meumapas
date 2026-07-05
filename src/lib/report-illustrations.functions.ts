import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Temas fixos que o sistema pode usar dentro dos relatórios.
 * Cada tema pode ter várias ilustrações (rotação aleatória).
 */
export const ILLUSTRATION_THEMES = [
  { value: "cosmos", label: "Cosmos & Universo" },
  { value: "mapa_astral", label: "Mapa Astral" },
  { value: "numerologia", label: "Numerologia" },
  { value: "cabala", label: "Cabala & Árvore da Vida" },
  { value: "tarot", label: "Tarot & Arcanos" },
  { value: "casal", label: "Casal / Sinastria" },
  { value: "amor", label: "Amor & Relacionamentos" },
  { value: "carreira", label: "Carreira & Propósito" },
  { value: "financas", label: "Finanças & Abundância" },
  { value: "familia", label: "Família & Ancestralidade" },
  { value: "saude", label: "Saúde & Corpo" },
  { value: "amizade", label: "Amizades" },
  { value: "previsao_anual", label: "Previsão Anual / Ciclos" },
  { value: "espiritualidade", label: "Espiritualidade & Alma" },
  { value: "meditacao", label: "Meditação & Silêncio" },
  { value: "chakras", label: "Chakras & Energia" },
] as const;

export type IllustrationTheme = (typeof ILLUSTRATION_THEMES)[number]["value"];

export const REPORT_KINDS = [
  "personality", "love", "career", "spiritual", "finance", "family",
  "health", "friendships", "synastry", "couple_numerology",
  "annual_forecast", "personal_kabbalah",
] as const;

const STYLE_SUFFIX =
  "Formato banner horizontal panorâmico (landscape 3:2), composição cinematográfica em faixa larga, estilo ilustração editorial cósmica, aquarela digital com traços dourados e violetas profundos, luz suave, atmosfera onírica e simbólica, sem texto, sem letras, sem rostos identificáveis, alta qualidade, adequado como banner de abertura de capítulo em relatório espiritual em PDF.";

function themePrompt(theme: string, custom?: string) {
  if (custom && custom.trim().length > 10) return `${custom.trim()}. ${STYLE_SUFFIX}`;
  const map: Record<string, string> = {
    cosmos: "Uma vastidão cósmica com galáxias, nebulosas e constelações em tons de dourado e violeta",
    mapa_astral: "Um mapa astral estilizado com signos do zodíaco, planetas e casas astrológicas em roda mandálica",
    numerologia: "Símbolos numéricos flutuando entre geometrias sagradas e ondas de energia",
    cabala: "Árvore da vida cabalística com sephiroth iluminadas e caminhos luminosos",
    tarot: "Cartas de tarot arcanos maiores em atmosfera mística, com luz de vela e tecidos ricos",
    casal: "Duas figuras arquetípicas entrelaçadas por linhas de energia, sob um céu estrelado",
    amor: "Um coração alquímico envolto em rosas e luz, símbolos do casamento sagrado",
    carreira: "Uma escada ascendente entre nuvens cósmicas, engrenagens douradas e uma estrela guia",
    financas: "Moedas de ouro em queda como pétalas, com árvore da abundância e raízes de luz",
    familia: "Uma árvore genealógica com raízes profundas e frutos luminosos, ancestrais em silhueta",
    saude: "Corpo humano estilizado com meridianos de luz e flor de lótus no centro",
    amizade: "Círculo de figuras humanas de mãos dadas ao redor de uma fogueira mágica",
    previsao_anual: "Roda do ano com as quatro estações e trânsitos planetários em movimento",
    espiritualidade: "Figura em meditação com aura dourada, portal cósmico ao fundo",
    meditacao: "Silhueta em posição de lótus sob uma cachoeira de luz estelar",
    chakras: "Sete chakras alinhados em coluna vertebral cósmica, com cores vibrantes",
  };
  const base = map[theme] ?? `Ilustração simbólica sobre o tema ${theme}`;
  return `${base}. ${STYLE_SUFFIX}`;
}

/**
 * Extrai bytes PNG da resposta da IA. Aceita tanto `b64_json` quanto `url`
 * (o gateway pode alternar entre os dois formatos). Retorna null se nenhum
 * for utilizável — o chamador decide como tratar.
 */
async function extractImageBytes(json: any): Promise<Uint8Array | null> {
  const item = json?.data?.[0];
  if (!item) return null;
  const b64: string | undefined = item.b64_json;
  if (b64 && typeof b64 === "string") {
    try {
      return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    } catch {
      // fall through to url
    }
  }
  const url: string | undefined = item.url;
  if (url && typeof url === "string") {
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      const ab = await r.arrayBuffer();
      return new Uint8Array(ab);
    } catch {
      return null;
    }
  }
  return null;
}

async function ensureAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Acesso restrito a administradores");
}

/* ---------------------------- LIST ---------------------------- */

export const listReportIllustrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        theme: z.string().optional(),
        includeInactive: z.boolean().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("report_illustrations")
      .select("id, theme, report_kind, title, prompt, mime, usage_count, active, created_at, storage_path")
      .order("created_at", { ascending: false });
    if (data.theme) q = q.eq("theme", data.theme);
    if (!data.includeInactive) q = q.eq("active", true);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Assina em lote (uma única chamada) para evitar N round-trips do client.
    const paths = (rows ?? [])
      .map((r: any) => r.storage_path)
      .filter((p: string | null): p is string => !!p);
    let urlMap = new Map<string, string>();
    if (paths.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed } = await supabaseAdmin.storage
        .from("report-illustrations")
        .createSignedUrls(paths, 60 * 60);
      for (const s of signed ?? []) {
        if (s.path && s.signedUrl) urlMap.set(s.path, s.signedUrl);
      }
    }
    const items = (rows ?? []).map((r: any) => ({
      ...r,
      dataUrl: r.storage_path ? (urlMap.get(r.storage_path) ?? "") : "",
    }));
    return { items };
  });

export const getIllustrationImage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("report_illustrations")
      .select("storage_path, mime")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Ilustração não encontrada");
    if (!row.storage_path) {
      // legacy row without storage_path — cannot serve reliably
      return { dataUrl: "" };
    }
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("report-illustrations")
      .createSignedUrl(row.storage_path, 60 * 60);
    if (sErr) throw new Error(sErr.message);
    return { dataUrl: signed.signedUrl };
  });

/* ------------------------- GENERATE (admin) ------------------------- */

export const generateReportIllustration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        theme: z.string().min(1).max(60),
        report_kind: z.string().min(1).max(60).optional(),
        title: z.string().max(120).optional(),
        customPrompt: z.string().max(2000).optional(),
        count: z.number().int().min(1).max(4).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const n = data.count ?? 1;
    const prompt = themePrompt(data.theme, data.customPrompt);
    const created: Array<{ id: string; theme: string }> = [];

    for (let i = 0; i < n; i++) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-image-2",
          prompt,
          size: "1536x1024",
          quality: "low",
          n: 1,
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        if (res.status === 429) throw new Error("Limite de geração atingido. Tente novamente em instantes.");
        if (res.status === 402) throw new Error("Créditos de IA esgotados na workspace.");
        throw new Error(`Falha na geração (${res.status}): ${txt.slice(0, 200)}`);
      }
      const json = await res.json();
      const bytes = await extractImageBytes(json);
      if (!bytes) throw new Error("Resposta da IA sem imagem utilizável.");

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const path = `${data.report_kind ?? data.theme}/${crypto.randomUUID()}.png`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("report-illustrations")
        .upload(path, bytes, { contentType: "image/png", upsert: false });
      if (upErr) throw new Error(`Falha ao salvar no storage: ${upErr.message}`);

      const { data: inserted, error } = await supabaseAdmin
        .from("report_illustrations")
        .insert({
          theme: data.theme,
          report_kind: data.report_kind ?? null,
          title: data.title ?? null,
          prompt,
          storage_path: path,
          mime: "image/png",
          created_by: context.userId,
          active: true,
        })
        .select("id, theme")
        .single();
      if (error) {
        // rollback storage para não deixar arquivo órfão
        await supabaseAdmin.storage.from("report-illustrations").remove([path]).catch(() => {});
        throw new Error(`Falha ao registrar ilustração: ${error.message}`);
      }
      created.push(inserted);
    }

    return { created };
  });

/* ------------------------- TOGGLE / DELETE ------------------------- */

export const toggleReportIllustration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("report_illustrations")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteReportIllustration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("report_illustrations")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------- ROTATION HELPER ------------------------- */

/**
 * Sorteia uma ilustração ativa para o tema (ou report_kind) informado.
 * Usada pelo pipeline de PDF quando existirem >= 1 ilustração salva.
 * Incrementa o usage_count para métricas.
 */
export const pickReportIllustration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        theme: z.string().optional(),
        report_kind: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("report_illustrations")
      .select("id, storage_path, mime, usage_count")
      .eq("active", true)
      .not("storage_path", "is", null)
      .limit(50);
    if (data.report_kind) q = q.eq("report_kind", data.report_kind);
    else if (data.theme) q = q.eq("theme", data.theme);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return { picked: null };

    const chosen = rows[Math.floor(Math.random() * rows.length)];
    await supabaseAdmin
      .from("report_illustrations")
      .update({ usage_count: (chosen.usage_count ?? 0) + 1 })
      .eq("id", chosen.id);

    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("report-illustrations")
      .createSignedUrl(chosen.storage_path as string, 60 * 60);
    if (sErr) throw new Error(sErr.message);

    return { picked: { id: chosen.id, dataUrl: signed.signedUrl } };
  });

/* ------------------------- BULK SEED (admin) ------------------------- */

const THEME_BY_KIND: Record<string, string> = {
  personality: "cosmos",
  love: "amor",
  career: "carreira",
  spiritual: "espiritualidade",
  finance: "financas",
  family: "familia",
  health: "saude",
  friendships: "amizade",
  synastry: "casal",
  couple_numerology: "casal",
  annual_forecast: "previsao_anual",
  personal_kabbalah: "cabala",
};

async function generateOne(theme: string, report_kind: string, userId: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente");
  const prompt = themePrompt(theme);
  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-image-2",
      prompt,
      size: "1536x1024",
      quality: "low",
      n: 1,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Falha (${res.status}) em ${report_kind}: ${txt.slice(0, 160)}`);
  }
  const json = await res.json();
  const bytes = await extractImageBytes(json);
  if (!bytes) throw new Error(`Sem imagem utilizável para ${report_kind}`);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const path = `${report_kind}/${crypto.randomUUID()}.png`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("report-illustrations")
    .upload(path, bytes, { contentType: "image/png", upsert: false });
  if (upErr) throw new Error(`Storage: ${upErr.message}`);
  const { error } = await supabaseAdmin.from("report_illustrations").insert({
    theme,
    report_kind,
    title: null,
    prompt,
    storage_path: path,
    mime: "image/png",
    created_by: userId,
    active: true,
  });
  if (error) {
    await supabaseAdmin.storage.from("report-illustrations").remove([path]).catch(() => {});
    throw new Error(`DB: ${error.message}`);
  }
}

export const seedIllustrationsForAllKinds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ perKind: z.number().int().min(1).max(5).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const perKind = data.perKind ?? 3;
    const kinds = Object.keys(THEME_BY_KIND);
    const results: Array<{ kind: string; ok: number; failed: number; error?: string }> = [];
    for (const kind of kinds) {
      const theme = THEME_BY_KIND[kind];
      let ok = 0;
      let failed = 0;
      let lastErr: string | undefined;
      for (let i = 0; i < perKind; i++) {
        try {
          await generateOne(theme, kind, context.userId);
          ok++;
        } catch (e: any) {
          failed++;
          lastErr = e?.message ?? String(e);
        }
      }
      results.push({ kind, ok, failed, error: lastErr });
    }
    const total = results.reduce((s, r) => s + r.ok, 0);
    return { total, results };
  });
