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

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentUtcHour = now.getUTCHours();
  const { data: allSubs, error } = await supabaseAdmin
    .from("horoscope_subscriptions")
    .select("*")
    .eq("enabled", true)
    .or(`last_sent_on.is.null,last_sent_on.lt.${today}`)
    .limit(2000);
  if (error) return new Response(error.message, { status: 500 });

  // BRT (-3). dia da semana local: 0=domingo..6=sábado
  const localDow = (new Date(now.getTime() - 3 * 3600 * 1000)).getUTCDay();
  const subs = (allSubs ?? []).filter((s: any) => {
    // Permite retry no mesmo dia: hora agendada já passou e ainda não foi enviado hoje
    const scheduledHour = s.send_hour_utc ?? 10;
    if (currentUtcHour < scheduledHour) return false;
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
  const evoReady =
    evo?.enabled && evo?.base_url && evo?.global_api_key && evo?.instance_name;

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return new Response("LOVABLE_API_KEY missing", { status: 500 });
  const provider = createLovableAiGatewayProvider(apiKey);
  const model = provider.chatModel("google/gemini-2.5-flash");

  const { getAddonPromptOverride } = await import("@/lib/addon-settings.functions");
  const promptOverride = await getAddonPromptOverride("sub_daily_horoscope");

  let processed = 0;
  let delivered = 0;

  for (const s of subs ?? []) {
    if (!s.sun_sign) {
      await supabaseAdmin.from("horoscope_log").insert({
        user_id: s.user_id, date: today, channel: "system", status: "skipped",
        detail: "sun_sign missing", sign: null,
      });
      continue;
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
      const seedNum = Array.from(`${s.user_id}|${today}`).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 2166136261) >>> 0;
      const { text } = await generateText({
        model, prompt, temperature: 1.0, topP: 0.95, seed: seedNum,
      });
      body = text.trim();
    } catch (e: any) {
      await supabaseAdmin.from("horoscope_log").insert({
        user_id: s.user_id, date: today, channel: "ai", status: "error",
        detail: String(e?.message ?? e).slice(0, 240), sign: s.sun_sign,
      });
      continue;
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
            await supabaseAdmin.from("horoscope_log").insert({
              user_id: s.user_id, date: today, channel: "whatsapp", status: "error",
              detail: `evo HTTP ${res.status}: ${t.slice(0, 180)}`, sign: s.sun_sign,
            });
          } else {
            delivered += 1;
            await supabaseAdmin.from("horoscope_log").insert({
              user_id: s.user_id, date: today, channel: "whatsapp", status: "sent",
              detail: "evolution", sign: s.sun_sign,
            });
          }
        } catch (e: any) {
          await supabaseAdmin.from("horoscope_log").insert({
            user_id: s.user_id, date: today, channel: "whatsapp", status: "error",
            detail: String(e?.message ?? e).slice(0, 240), sign: s.sun_sign,
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
            await supabaseAdmin.from("horoscope_log").insert({
              user_id: s.user_id, date: today, channel: "whatsapp", status: "error",
              detail: `HTTP ${res.status}: ${t.slice(0, 200)}`, sign: s.sun_sign,
            });
          } else {
            delivered += 1;
            await supabaseAdmin.from("horoscope_log").insert({
              user_id: s.user_id, date: today, channel: "whatsapp", status: "sent",
              detail: "twilio", sign: s.sun_sign,
            });
          }
        } catch (e: any) {
          await supabaseAdmin.from("horoscope_log").insert({
            user_id: s.user_id, date: today, channel: "whatsapp", status: "error",
            detail: String(e?.message ?? e).slice(0, 240), sign: s.sun_sign,
          });
        }
      } else {
        await supabaseAdmin.from("horoscope_log").insert({
          user_id: s.user_id, date: today, channel: "whatsapp", status: "skipped",
          detail: "no whatsapp provider configured", sign: s.sun_sign,
        });
      }
    }

    // Email: log as skipped — email delivery requires email infra (see Cloud → Emails).
    if (s.channel_email && s.email) {
      await supabaseAdmin.from("horoscope_log").insert({
        user_id: s.user_id, date: today, channel: "email", status: "skipped",
        detail: "email infra not configured", sign: s.sun_sign,
      });
    }

    await supabaseAdmin
      .from("horoscope_subscriptions")
      .update({ last_sent_on: today })
      .eq("id", s.id);

  }

  return Response.json({ ok: true, processed, delivered });
}
