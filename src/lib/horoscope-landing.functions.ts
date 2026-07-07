import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sunSignFromBirthDate } from "@/lib/horoscope.functions";


const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

/* ---------- Helpers ---------- */

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return "";
  return "+" + digits;
}

function genActivationCode(): string {
  // 6 chars alphanumeric maiúsculos, sem 0/O/1/I para não confundir.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (let i = 0; i < 6; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function buildWhatsAppUrl(numberE164: string, keyword: string, code: string): string {
  const num = numberE164.replace(/\D+/g, "");
  const text = encodeURIComponent(`${keyword} ${code}`);
  return `https://wa.me/${num}?text=${text}`;
}

/* ---------- PUBLIC: read landing settings (safe fields) ---------- */

export const getHoroscopeLandingSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("horoscope_landing_settings")
      .select(
        "enabled, trial_days, whatsapp_number_e164, activation_keyword, hero_title, hero_subtitle, consent_text, success_message, cta_button_label",
      )
      .eq("id", true)
      .maybeSingle();

    return {
      settings: data ?? {
        enabled: true,
        trial_days: 7,
        whatsapp_number_e164: "",
        activation_keyword: "ATIVAR",
        hero_title: "Receba seu Horóscopo Diário no WhatsApp — 7 dias grátis",
        hero_subtitle:
          "Toda manhã, uma leitura astrológica personalizada do seu signo direto no seu celular.",
        consent_text:
          "Concordo em receber mensagens diárias do meu horóscopo por WhatsApp e e-mail.",
        success_message:
          "Falta só um passo: envie a mensagem no WhatsApp para confirmar seu cadastro.",
        cta_button_label: "Concluir cadastro no WhatsApp",
      },
    };
  },
);

/* ---------- PUBLIC: submit lead ---------- */

const SubmitSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone_e164: z
    .string()
    .trim()
    .transform(normalizePhone)
    .refine((v) => PHONE_REGEX.test(v), {
      message: "Telefone em formato internacional, ex: +5511999998888",
    }),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data em formato AAAA-MM-DD")
    .nullable()
    .optional(),
  consent_marketing: z.literal(true, {
    errorMap: () => ({
      message: "É necessário aceitar receber mensagens para continuar.",
    }),
  }),
  source: z.string().max(64).nullable().optional(),
  utm: z.record(z.string()).nullable().optional(),
});

export const submitHoroscopeLead = createServerFn({ method: "POST" })
  .inputValidator((d) => SubmitSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: settings } = await (supabaseAdmin as any)
      .from("horoscope_landing_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    if (!settings?.enabled) {
      throw new Error("A promoção de 7 dias grátis está temporariamente pausada.");
    }
    if (!settings.whatsapp_number_e164) {
      throw new Error(
        "O número de WhatsApp da promoção ainda não está configurado. Tente novamente em instantes.",
      );
    }

    // Anti-abuso simples: no máx 3 leads por telefone em 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await (supabaseAdmin as any)
      .from("horoscope_free_leads")
      .select("id", { count: "exact", head: true })
      .eq("phone_e164", data.phone_e164)
      .gte("created_at", since);
    if ((recentCount ?? 0) >= 3) {
      throw new Error("Já registramos várias tentativas para este número. Tente amanhã.");
    }

    // Se já existe um lead ATIVO para o telefone, reusa
    const { data: existingActive } = await (supabaseAdmin as any)
      .from("horoscope_free_leads")
      .select("id, activation_code, status")
      .eq("phone_e164", data.phone_e164)
      .in("status", ["pending_confirmation", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let activationCode: string;
    let leadId: string;

    if (existingActive) {
      activationCode = existingActive.activation_code;
      leadId = existingActive.id;
    } else {
      activationCode = genActivationCode();
      const ua = getRequestHeader("user-agent") ?? null;
      let ip: string | null = null;
      try {
        ip = getRequestIP({ xForwardedFor: true }) ?? null;
      } catch {}

      const insertPayload = {
        full_name: data.full_name,
        email: data.email.toLowerCase(),
        phone_e164: data.phone_e164,
        birth_date: data.birth_date ?? null,
        sun_sign: sunSignFromBirthDate(data.birth_date ?? null),
        consent_marketing: true,
        consent_text: settings.consent_text,
        consent_ip: ip,
        consent_user_agent: ua,
        consent_at: new Date().toISOString(),
        status: "pending_confirmation",
        activation_code: activationCode,
        trial_days: Number(settings.trial_days) || 7,
        source: data.source ?? "landing",
        utm: data.utm ?? null,
      };

      const { data: inserted, error } = await (supabaseAdmin as any)
        .from("horoscope_free_leads")
        .insert(insertPayload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      leadId = inserted.id;
    }

    const whatsappUrl = buildWhatsAppUrl(
      settings.whatsapp_number_e164,
      settings.activation_keyword,
      activationCode,
    );

    return {
      leadId,
      activationCode,
      whatsappUrl,
      keyword: settings.activation_keyword,
      whatsappNumber: settings.whatsapp_number_e164,
      successMessage: settings.success_message,
      ctaLabel: settings.cta_button_label,
    };
  });

/* ---------- ADMIN: settings ---------- */

const SettingsSchema = z.object({
  enabled: z.boolean(),
  trial_days: z.number().int().min(1).max(60),
  whatsapp_number_e164: z.string().trim().transform(normalizePhone).refine(
    (v) => v === "" || PHONE_REGEX.test(v),
    { message: "Número em formato internacional, ex: +5511999998888" },
  ),
  activation_keyword: z.string().trim().min(2).max(24),
  hero_title: z.string().trim().min(3).max(160),
  hero_subtitle: z.string().trim().min(3).max(400),
  consent_text: z.string().trim().min(10).max(800),
  confirmation_reply: z.string().trim().min(5).max(800),
  success_message: z.string().trim().min(5).max(400),
  cta_button_label: z.string().trim().min(2).max(80),
  trial_end_message: z.string().trim().min(5).max(600),
  trial_end_link: z.string().trim().url().or(z.literal("")),
  send_local_hour: z.number().int().min(0).max(23),
  send_local_minute: z.number().int().min(0).max(59),
  retry_after_minutes: z.number().int().min(1).max(1440).optional(),
  max_retries: z.number().int().min(0).max(10).optional(),
  expiry_reminder_minutes_before: z.number().int().min(1).max(1440).optional(),
  expiry_reminder_template: z.string().trim().min(10).max(1000).optional(),
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Acesso restrito.");
}

export const adminGetHoroscopeLandingSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("horoscope_landing_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    return { settings: data };
  });

export const adminUpdateHoroscopeLandingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SettingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("horoscope_landing_settings")
      .update(data)
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- ADMIN: list leads ---------- */

const ListSchema = z.object({
  page: z.number().int().min(1).default(1),
  status: z.string().nullable().optional(),
  search: z.string().nullable().optional(),
});

export const adminListHoroscopeLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ListSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pageSize = 25;
    const from = (data.page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = (supabaseAdmin as any)
      .from("horoscope_free_leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(`full_name.ilike.${s},email.ilike.${s},phone_e164.ilike.${s},activation_code.ilike.${s}`);
    }
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    return {
      rows: rows ?? [],
      total: count ?? 0,
      page: data.page,
      pageSize,
    };
  });

/* ---------- ADMIN: manually activate / delete ---------- */

export const adminActivateHoroscopeLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lead } = await (supabaseAdmin as any)
      .from("horoscope_free_leads")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!lead) throw new Error("Lead não encontrado.");

    const trialDays = Number(lead.trial_days) || 7;
    const startsOn = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endsOn = new Date(startsOn.getTime() + (trialDays - 1) * 24 * 60 * 60 * 1000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    const { error } = await (supabaseAdmin as any)
      .from("horoscope_free_leads")
      .update({
        status: "active",
        activated_at: new Date().toISOString(),
        trial_starts_on: iso(startsOn),
        trial_ends_on: iso(endsOn),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteHoroscopeLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("horoscope_free_leads")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- ADMIN: auto-configure Evolution webhook ---------- */

export const adminConfigureEvolutionWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: evo } = await (supabaseAdmin as any)
      .from("evolution_settings").select("*").eq("id", true).maybeSingle();
    if (!evo?.enabled || !evo?.base_url || !evo?.global_api_key || !evo?.instance_name) {
      throw new Error("Configure Evolution (base_url, api_key, instance) e ative antes.");
    }

    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
    const webhookUrl = "https://codigocosmico.com.br/api/public/hooks/horoscope-activation";

    const base_url = String(evo.base_url).replace(/\/+$/, "");
    const instance = encodeURIComponent(evo.instance_name);

    const attempt = async (body: any) => {
      const r = await fetch(`${base_url}/webhook/set/${instance}`, {
        method: "POST",
        headers: { apikey: evo.global_api_key, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return { ok: r.ok, status: r.status, text: await r.text().catch(() => "") };
    };

    // Evolution v2 shape
    let res = await attempt({
      webhook: {
        enabled: true,
        url: webhookUrl,
        byEvents: false,
        base64: false,
        headers: { apikey: anonKey, "Content-Type": "application/json" },
        events: ["MESSAGES_UPSERT"],
      },
    });
    if (!res.ok) {
      // Evolution v1 flat shape
      res = await attempt({
        url: webhookUrl,
        enabled: true,
        webhook_by_events: false,
        webhook_base64: false,
        events: ["MESSAGES_UPSERT"],
      });
    }
    if (!res.ok) {
      throw new Error(`Falha ao configurar webhook (HTTP ${res.status}): ${res.text.slice(0, 200)}`);
    }

    return { ok: true, webhookUrl, instance: evo.instance_name };
  });

/* ---------- ADMIN: test Evolution webhook end-to-end ---------- */

const TestSchema = z.object({
  phone_e164: z.string().trim().transform(normalizePhone).refine(
    (v) => PHONE_REGEX.test(v),
    { message: "Telefone em formato internacional, ex: +5511999998888" },
  ),
});

export const adminTestEvolutionWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => TestSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: evo } = await (supabaseAdmin as any)
      .from("evolution_settings").select("*").eq("id", true).maybeSingle();
    if (!evo?.enabled || !evo?.base_url || !evo?.global_api_key || !evo?.instance_name) {
      throw new Error("Configure Evolution (base_url, api_key, instance) e ative antes.");
    }

    const base_url = String(evo.base_url).replace(/\/+$/, "");
    const instance = encodeURIComponent(evo.instance_name);
    const startedAt = new Date().toISOString();

    // 1) Consulta configuração atual do webhook na Evolution
    let webhookConfig: any = null;
    let webhookFindError: string | null = null;
    try {
      const r = await fetch(`${base_url}/webhook/find/${instance}`, {
        headers: { apikey: evo.global_api_key },
      });
      const txt = await r.text();
      try { webhookConfig = JSON.parse(txt); } catch { webhookConfig = txt; }
      if (!r.ok) webhookFindError = `HTTP ${r.status}: ${txt.slice(0, 180)}`;
    } catch (e: any) {
      webhookFindError = String(e?.message ?? e);
    }

    // 2) Envia mensagem de teste para o número informado
    const marker = "TESTE-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const text = `🧪 Teste Cosmic ${marker}\nSe você receber isso no WhatsApp, a instância "${evo.instance_name}" está enviando corretamente.`;
    let sendOk = false;
    let sendError: string | null = null;
    try {
      const r = await fetch(`${base_url}/message/sendText/${instance}`, {
        method: "POST",
        headers: { apikey: evo.global_api_key, "Content-Type": "application/json" },
        body: JSON.stringify({ number: data.phone_e164.replace(/\D+/g, ""), text }),
      });
      sendOk = r.ok;
      if (!r.ok) sendError = `HTTP ${r.status}: ${(await r.text().catch(() => "")).slice(0, 180)}`;
    } catch (e: any) {
      sendError = String(e?.message ?? e);
    }

    // 3) Poll app_logs por evento 'evo_webhook_received' após startedAt (até ~15s)
    let webhookHit: any = null;
    for (let i = 0; i < 15 && !webhookHit; i++) {
      await new Promise((res) => setTimeout(res, 1000));
      const { data: rows } = await (supabaseAdmin as any)
        .from("app_logs")
        .select("id, event, payload, created_at")
        .eq("event", "evo_webhook_received")
        .gte("created_at", startedAt)
        .order("created_at", { ascending: false })
        .limit(1);
      if (rows?.length) webhookHit = rows[0];
    }

    return {
      ok: sendOk,
      startedAt,
      marker,
      webhookConfig,
      webhookFindError,
      send: { ok: sendOk, error: sendError, to: data.phone_e164 },
      webhookHit,
      hint: webhookHit
        ? "Webhook está recebendo eventos MESSAGES_UPSERT ✅"
        : "Mensagem enviada, mas nenhum evento chegou ao webhook em 15s. Verifique se a Evolution está configurada para enviar MESSAGES_UPSERT para o URL do endpoint.",
    };
  });
