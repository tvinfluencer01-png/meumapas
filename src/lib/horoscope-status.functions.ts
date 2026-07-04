import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type UserHoroscopeStatus = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  enabled: boolean;
  frequency: string;
  last_sent_on: string | null;
  delivered_today: number;
  errors_today: number;
  pending: boolean;
  last_log_at: string | null;
  last_status: string | null;
  last_detail: string | null;
  ready: boolean;
  issues: string[];
};

export type HoroscopeStatusResult = {
  lastCronRun: {
    started: string | null;
    ended: string | null;
    status: string | null;
    message: string | null;
  } | null;
  providers: {
    evolutionReady: boolean;
    twilioReady: boolean;
    whatsappReady: boolean;
    emailReady: boolean;
  };
  totals: {
    delivered: number;
    errors: number;
    pending: number;
    subscribers: number;
    ready: number;
    notReady: number;
  };
  users: UserHoroscopeStatus[];
};

export const getHoroscopeStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HoroscopeStatusResult> => {
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles").select("role")
      .eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("forbidden");

    // Last cron run for daily-horoscope job
    const { data: cronRows } = await supabaseAdmin.rpc("admin_cron_status");
    const cron = (cronRows ?? []).find((r: any) =>
      String(r.command || "").includes("daily-horoscope") ||
      String(r.jobname || "").includes("horoscope"),
    );
    const lastCronRun = cron
      ? {
          started: cron.last_run_started,
          ended: cron.last_run_ended,
          status: cron.last_status,
          message: cron.last_return_message,
        }
      : null;

    // Provider readiness (global)
    const { data: evo } = await (supabaseAdmin as any)
      .from("evolution_settings").select("*").eq("id", true).maybeSingle();
    const evolutionReady = !!(evo?.enabled && evo?.base_url && evo?.global_api_key && evo?.instance_name);
    const { data: tw } = await supabaseAdmin
      .from("twilio_settings").select("*").eq("id", true).maybeSingle();
    const twilioReady = !!(tw?.enabled && tw?.account_sid && tw?.auth_token && tw?.whatsapp_from);
    const whatsappReady = evolutionReady || twilioReady;
    const emailReady = false; // envio por email ainda não configurado

    // Subscribers
    const { data: subs } = await supabaseAdmin
      .from("horoscope_subscriptions")
      .select("user_id, enabled, frequency, last_sent_on, email, sun_sign, phone_e164, channel_whatsapp, channel_email, client_profile_id");
    const subscribers = subs ?? [];

    const today = new Date().toISOString().slice(0, 10);
    const { data: logs } = await supabaseAdmin
      .from("horoscope_log")
      .select("user_id, status, detail, created_at, date")
      .eq("date", today)
      .order("created_at", { ascending: false });
    const logList = logs ?? [];

    const userIds = Array.from(new Set(subscribers.map((s) => s.user_id)));
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] as any[] };
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));

    // Birth data availability per user (primary birth_data present)
    const { data: births } = userIds.length
      ? await supabaseAdmin
          .from("birth_data").select("user_id").eq("is_primary", true).in("user_id", userIds)
      : { data: [] as any[] };
    const hasBirth = new Set((births ?? []).map((b: any) => b.user_id));

    // Client profiles referenced by subs (birth_date presence)
    const clientIds = subscribers
      .map((s: any) => s.client_profile_id).filter(Boolean) as string[];
    const { data: cps } = clientIds.length
      ? await supabaseAdmin
          .from("client_profiles").select("id, birth_date").in("id", clientIds)
      : { data: [] as any[] };
    const cpBirth = new Map((cps ?? []).map((c: any) => [c.id, !!c.birth_date]));

    let delivered = 0;
    let errors = 0;
    let pending = 0;
    let readyCount = 0;

    const users: UserHoroscopeStatus[] = subscribers.map((s: any) => {
      const userLogs = logList.filter((l) => l.user_id === s.user_id);
      const del = userLogs.filter((l) => l.status === "sent" || l.status === "delivered" || l.status === "ok").length;
      const err = userLogs.filter((l) => l.status === "error" || l.status === "failed").length;
      const isPending = s.enabled && s.last_sent_on !== today && del === 0;
      delivered += del;
      errors += err;
      if (isPending) pending += 1;
      const last = userLogs[0];

      const issues: string[] = [];
      if (!s.enabled) issues.push("assinatura desativada");
      if (!s.sun_sign) issues.push("signo solar ausente");
      const hasChannel = !!s.channel_whatsapp || !!s.channel_email;
      if (!hasChannel) issues.push("nenhum canal ativo");
      if (s.channel_whatsapp && !s.phone_e164) issues.push("WhatsApp sem telefone");
      if (s.channel_whatsapp && !whatsappReady) issues.push("provedor de WhatsApp não configurado");
      if (s.channel_email && !s.email) issues.push("email do canal ausente");
      if (s.channel_email && !emailReady) issues.push("envio por email não configurado");
      const birthOk = s.client_profile_id
        ? cpBirth.get(s.client_profile_id) === true
        : hasBirth.has(s.user_id);
      if (!birthOk) issues.push("data de nascimento não cadastrada");
      const ready = issues.length === 0;
      if (ready) readyCount += 1;

      return {
        user_id: s.user_id,
        email: s.email,
        full_name: profileMap.get(s.user_id) ?? null,
        enabled: s.enabled,
        frequency: s.frequency,
        last_sent_on: s.last_sent_on,
        delivered_today: del,
        errors_today: err,
        pending: isPending,
        last_log_at: last?.created_at ?? null,
        last_status: last?.status ?? null,
        last_detail: last?.detail ?? null,
        ready,
        issues,
      };
    });

    users.sort((a, b) =>
      Number(a.ready) - Number(b.ready) ||
      Number(b.pending) - Number(a.pending) ||
      b.errors_today - a.errors_today,
    );

    return {
      lastCronRun,
      providers: { evolutionReady, twilioReady, whatsappReady, emailReady },
      totals: {
        delivered,
        errors,
        pending,
        subscribers: subscribers.length,
        ready: readyCount,
        notReady: subscribers.length - readyCount,
      },
      users,
    };
  });
