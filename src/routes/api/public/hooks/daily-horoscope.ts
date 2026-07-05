import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { buildHoroscopePrompt, computeLuckyForDay, loadChartSummaryForHoroscope, themesForDay } from "@/lib/horoscope.functions";

/**
 * Daily horoscope cron handler.
 * Triggered by pg_cron at 10:00 UTC (07:00 BRT).
 * Auth: anon apikey header (cron pattern).
 *
 * For each enabled subscription that has not been sent today:
 *  - generate a personalized horoscope with Lovable AI
 *  - deliver via WhatsApp (Twilio) if configured
 *  - email delivery is logged as 'skipped:no_email_infra' until email infra is set up
 *  - mark last_sent_on so next run won't re-send
 */
export const Route = createFileRoute("/api/public/hooks/daily-horoscope")({
  server: {
    handlers: {
      POST: handler,
      GET: handler,
    },
  },
});

async function handler({ request }: { request: Request }) {
  const apikey = request.headers.get("apikey");
  if (apikey !== process.env.SUPABASE_PUBLISHABLE_KEY && apikey !== process.env.SUPABASE_ANON_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  let force = url.searchParams.get("force") === "1";
  if (!force && request.method === "POST") {
    try {
      const b = await request.clone().json().catch(() => null) as any;
      if (b?.force) force = true;
    } catch {}
  }

  const now = new Date();
  // Fonte de verdade: America/Sao_Paulo (mesmo fuso exibido no Super Admin).
  const spParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, weekday: "short",
  }).formatToParts(now).reduce<Record<string, string>>((a, p) => (a[p.type] = p.value, a), {});
  const today = `${spParts.year}-${spParts.month}-${spParts.day}`;
  const currentLocalHour = Number(spParts.hour) % 24;
  const currentLocalMinute = Number(spParts.minute) % 60;
  const currentMinutesOfDay = currentLocalHour * 60 + currentLocalMinute;
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const localDow = dowMap[spParts.weekday] ?? 0;

  const { data: allSubs, error } = await supabaseAdmin
    .from("horoscope_subscriptions")
    .select("*")
    .eq("enabled", true)
    .or(force ? "id.not.is.null" : `last_sent_on.is.null,last_sent_on.lt.${today},next_retry_at.lte.${now.toISOString()}`)
    .limit(2000);
  if (error) return new Response(error.message, { status: 500 });

  const nowIso = now.toISOString();
  const subs = (allSubs ?? []).filter((s: any) => {
    if (force) return true;
    // Se há um retry agendado no futuro, pula. Se já passou, roda mesmo antes do horário.
    if (s.next_retry_at) {
      return new Date(s.next_retry_at).getTime() <= now.getTime();
    }
    // Compara em horário local de São Paulo (com precisão de minutos).
    const scheduledLocalHour = s.send_local_hour != null
      ? Number(s.send_local_hour)
      : (s.send_hour_utc != null ? (Number(s.send_hour_utc) - 3 + 24) % 24 : 7);
    const scheduledLocalMinute = s.send_local_minute != null ? Number(s.send_local_minute) : 0;
    const scheduledMinutesOfDay = scheduledLocalHour * 60 + scheduledLocalMinute;
    if (currentMinutesOfDay < scheduledMinutesOfDay) return false;
    const freq = s.frequency ?? "daily";
    if (freq === "weekly") {
      return s.send_weekday != null && s.send_weekday === localDow;
    }


    if (freq === "alternate") {
      if (!s.last_sent_on) return true;
      const last = new Date(s.last_sent_on + "T00:00:00Z").getTime();
      const diffDays = Math.floor((Date.parse(today + "T00:00:00Z") - last) / 86400000);
      return diffDays >= 2;
    }
    return true;
  });

  // Retry policy
  const MAX_ATTEMPTS = 5;
  const backoffMinutes = (attempt: number) => Math.min(240, Math.pow(2, attempt) * 5); // 5,10,20,40,80,160,240


  const { data: twilio } = await supabaseAdmin
    .from("twilio_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  const { data: evo } = await (supabaseAdmin as any)
    .from("evolution_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  const { data: smtp } = await (supabaseAdmin as any)
    .from("smtp_settings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const evoReady =
    evo?.enabled && evo?.base_url && evo?.global_api_key && evo?.instance_name;

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return new Response("LOVABLE_API_KEY missing", { status: 500 });
  const provider = createLovableAiGatewayProvider(apiKey);
  const modelCandidates = ["google/gemini-3-flash-preview", "google/gemini-2.5-flash"];

  const { getAddonPromptOverride } = await import("@/lib/addon-settings.functions");
  const promptOverride = await getAddonPromptOverride("sub_daily_horoscope");

  let processed = 0;
  let delivered = 0;
  let retriesScheduled = 0;
  let givenUp = 0;

  const scheduleRetryOrGiveUp = async (s: any, errorMsg: string) => {
    const nextAttempt = (Number(s.attempt_count) || 0) + 1;
    if (nextAttempt >= MAX_ATTEMPTS) {
      await supabaseAdmin
        .from("horoscope_subscriptions")
        .update({
          last_sent_on: today,
          attempt_count: 0,
          next_retry_at: null,
          last_attempt_at: nowIso,
          last_error: `giveup after ${nextAttempt}: ${errorMsg}`.slice(0, 500),
        })
        .eq("id", s.id);
      givenUp += 1;
      await supabaseAdmin.from("horoscope_log").insert({
        user_id: s.user_id, date: today, channel: "system", status: "giveup",
        detail: `max attempts (${MAX_ATTEMPTS}) reached: ${errorMsg}`.slice(0, 500), sign: s.sun_sign,
      });
      return;
    }
    const delayMin = backoffMinutes(nextAttempt - 1);
    const nextRetry = new Date(now.getTime() + delayMin * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("horoscope_subscriptions")
      .update({
        attempt_count: nextAttempt,
        next_retry_at: nextRetry,
        last_attempt_at: nowIso,
        last_error: errorMsg.slice(0, 500),
      })
      .eq("id", s.id);
    retriesScheduled += 1;
    await supabaseAdmin.from("horoscope_log").insert({
      user_id: s.user_id, date: today, channel: "system", status: "retry_scheduled",
      detail: `attempt ${nextAttempt}/${MAX_ATTEMPTS}, next in ${delayMin}min: ${errorMsg}`.slice(0, 500),
      sign: s.sun_sign,
    });
  };

  const processOne = async (s: any) => {
    let anyDelivered = false;
    let deliveryError: string | null = null;

    if (!s.sun_sign) {
      await supabaseAdmin.from("horoscope_log").insert({
        user_id: s.user_id, date: today, channel: "system", status: "skipped",
        detail: "sun_sign missing", sign: null,
      });
      return;

    }

    // Resolve birth_date do contexto (client_profile ativo > birth_data primário)
    let birthDate: string | null = null;
    if (s.client_profile_id) {
      const { data: cp } = await supabaseAdmin
        .from("client_profiles")
        .select("birth_date")
        .eq("id", s.client_profile_id)
        .maybeSingle();
      birthDate = (cp?.birth_date as string | null) ?? null;
    } else {
      const { data: bd } = await supabaseAdmin
        .from("birth_data")
        .select("birth_date")
        .eq("user_id", s.user_id)
        .eq("is_primary", true)
        .maybeSingle();
      birthDate = (bd?.birth_date as string | null) ?? null;
    }
    const lucky = computeLuckyForDay(birthDate, s.sun_sign, today);

    // Resolve nome do nativo para enriquecer o prompt
    let fullName: string | null = null;
    if (s.client_profile_id) {
      const { data: cp2 } = await supabaseAdmin
        .from("client_profiles").select("full_name").eq("id", s.client_profile_id).maybeSingle();
      fullName = (cp2?.full_name as string | null) ?? null;
    } else {
      const { data: bd2 } = await supabaseAdmin
        .from("birth_data").select("full_name").eq("user_id", s.user_id).eq("is_primary", true).maybeSingle();
      fullName = (bd2?.full_name as string | null) ?? null;
    }
    const chartSummary = await loadChartSummaryForHoroscope(
      s.user_id, s.client_profile_id, birthDate, fullName, s.sun_sign,
    );
    const themes = themesForDay(birthDate, s.sun_sign, today);

    let body = "";
    try {
      const prompt = promptOverride
        ? promptOverride
            .replace(/\{\{sign\}\}/gi, s.sun_sign)
            .replace(/\{\{date\}\}/gi, today)
            .replace(/\{\{lucky_number\}\}/gi, String(lucky.number))
            .replace(/\{\{lucky_color\}\}/gi, lucky.color) +
          `\n\nÂngulos astrológicos obrigatórios de hoje: 1) ${themes[0]}; 2) ${themes[1]}. EVITE temas usados recentemente: ${(chartSummary.recentThemes ?? []).join("; ") || "—"}.\n\nIMPORTANTE: na seção "🎯 Número e cor da sorte", use EXATAMENTE: "Número: ${lucky.number} | Cor: ${lucky.color}". Não invente outros valores.`
        : buildHoroscopePrompt(s.sun_sign, today, lucky, chartSummary);
      // seed determinístico por (usuário, dia) garante unicidade sem perder reprodutibilidade
      // Seed determinístico por (usuário, dia). Google exige INT32 positivo (< 2^31-1).
      const seedHash = Array.from(`${s.user_id}|${today}`).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 2166136261) >>> 0;
      const seedNum = seedHash % 2147483647;
      let lastErr: any = null;
      for (const modelName of modelCandidates) {
        try {
          const { text } = await generateText({
            model: (provider as any)(modelName), prompt, temperature: 1.0, topP: 0.95, seed: seedNum,
          });
          body = text.trim();
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (lastErr) throw lastErr;
    } catch (e: any) {
      const detail = [
        e?.message,
        e?.cause?.message,
        e?.responseBody,
        e?.data ? JSON.stringify(e.data).slice(0, 200) : null,
      ].filter(Boolean).join(" | ").slice(0, 500);
      await supabaseAdmin.from("horoscope_log").insert({
        user_id: s.user_id, date: today, channel: "ai", status: "error",
        detail: detail || String(e), sign: s.sun_sign,
      });
      await scheduleRetryOrGiveUp(s, `ai: ${detail || String(e)}`);
      return;
    }

    // Registra os ângulos do dia para evitar repetição nos próximos
    for (const t of themes) {
      await supabaseAdmin.from("horoscope_log").insert({
        user_id: s.user_id, date: today, channel: "ai_theme", status: "ok",
        detail: t, sign: s.sun_sign,
      });
    }


    const { pickMarketingFooter } = await import("@/lib/marketing.functions");
    const footer = await pickMarketingFooter("horoscope_daily");
    const message = `🌌 Horóscopo de hoje — ${s.sun_sign}\n\n${body}\n\n${footer}`;
    processed += 1;

    // WhatsApp: prefer Evolution API when enabled, fallback to Twilio
    if (s.channel_whatsapp && s.phone_e164) {
      if (evoReady) {
        try {
          const base = String(evo.base_url).replace(/\/+$/, "");
          const url = `${base}/message/sendText/${encodeURIComponent(evo.instance_name)}`;
          const res = await fetch(url, {
            method: "POST",
            headers: {
              apikey: evo.global_api_key,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              number: s.phone_e164.replace(/\D+/g, ""),
              text: message,
            }),
          });
          if (!res.ok) {
            const t = await res.text();
            const msg = `evo HTTP ${res.status}: ${t.slice(0, 180)}`;
            deliveryError = msg;
            await supabaseAdmin.from("horoscope_log").insert({
              user_id: s.user_id, date: today, channel: "whatsapp", status: "error",
              detail: msg, sign: s.sun_sign,
            });
          } else {
            delivered += 1; anyDelivered = true;
            await supabaseAdmin.from("horoscope_log").insert({
              user_id: s.user_id, date: today, channel: "whatsapp", status: "sent",
              detail: "evolution", sign: s.sun_sign,
            });
          }
        } catch (e: any) {
          const msg = String(e?.message ?? e).slice(0, 240);
          deliveryError = `wa: ${msg}`;
          await supabaseAdmin.from("horoscope_log").insert({
            user_id: s.user_id, date: today, channel: "whatsapp", status: "error",
            detail: msg, sign: s.sun_sign,
          });
        }
      } else if (twilio?.enabled && twilio.account_sid && twilio.auth_token && twilio.whatsapp_from) {
        try {
          const form = new URLSearchParams();
          form.set("From", `whatsapp:${twilio.whatsapp_from}`);
          form.set("To", `whatsapp:${s.phone_e164}`);
          form.set("Body", message);
          const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilio.account_sid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization:
                  "Basic " + btoa(`${twilio.account_sid}:${twilio.auth_token}`),
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: form.toString(),
            },
          );
          if (!res.ok) {
            const t = await res.text();
            const msg = `twilio HTTP ${res.status}: ${t.slice(0, 200)}`;
            deliveryError = msg;
            await supabaseAdmin.from("horoscope_log").insert({
              user_id: s.user_id, date: today, channel: "whatsapp", status: "error",
              detail: msg, sign: s.sun_sign,
            });
          } else {
            delivered += 1; anyDelivered = true;
            await supabaseAdmin.from("horoscope_log").insert({
              user_id: s.user_id, date: today, channel: "whatsapp", status: "sent",
              detail: "twilio", sign: s.sun_sign,
            });
          }
        } catch (e: any) {
          const msg = String(e?.message ?? e).slice(0, 240);
          deliveryError = `wa: ${msg}`;
          await supabaseAdmin.from("horoscope_log").insert({
            user_id: s.user_id, date: today, channel: "whatsapp", status: "error",
            detail: msg, sign: s.sun_sign,
          });
        }
      } else {
        await supabaseAdmin.from("horoscope_log").insert({
          user_id: s.user_id, date: today, channel: "whatsapp", status: "skipped",
          detail: "no whatsapp provider configured", sign: s.sun_sign,
        });
      }
    }

    // Email: envio via SMTP configurado no painel admin (smtp_settings).
    if (s.channel_email && s.email) {
      if (smtp?.enabled && smtp.host && smtp.username && smtp.password && smtp.from_email) {
        try {
          const nodemailer = (await import("nodemailer")).default;
          const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: !!smtp.secure,
            auth: { user: smtp.username, pass: smtp.password },
          });
          const html = `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#222;max-width:640px;margin:0 auto;padding:16px"><h2 style="color:#6b21a8;margin:0 0 12px">🌌 Horóscopo de hoje — ${s.sun_sign}</h2><div style="white-space:pre-wrap">${body.replace(/</g, "&lt;")}</div><hr style="margin:20px 0;border:none;border-top:1px solid #eee"/><div style="color:#555;font-size:13px;white-space:pre-wrap">${footer.replace(/</g, "&lt;")}</div></div>`;
          await transporter.sendMail({
            from: `"${smtp.from_name || smtp.from_email}" <${smtp.from_email}>`,
            to: s.email,
            replyTo: smtp.reply_to || undefined,
            subject: `🌌 Horóscopo de hoje — ${s.sun_sign}`,
            text: message,
            html,
          });
          delivered += 1; anyDelivered = true;
          await supabaseAdmin.from("horoscope_log").insert({
            user_id: s.user_id, date: today, channel: "email", status: "sent",
            detail: "smtp", sign: s.sun_sign,
          });
        } catch (e: any) {
          await supabaseAdmin.from("horoscope_log").insert({
            user_id: s.user_id, date: today, channel: "email", status: "error",
            detail: String(e?.message ?? e).slice(0, 240), sign: s.sun_sign,
          });
        }
      } else {
        await supabaseAdmin.from("horoscope_log").insert({
          user_id: s.user_id, date: today, channel: "email", status: "skipped",
          detail: "smtp not configured or disabled", sign: s.sun_sign,
        });
      }
    }

    await supabaseAdmin
      .from("horoscope_subscriptions")
      .update({ last_sent_on: today })
      .eq("id", s.id);
  };

  await Promise.allSettled((subs ?? []).map((s) => processOne(s).catch(() => {})));


  return Response.json({ ok: true, processed, delivered });
}
