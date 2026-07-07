/**
 * Fallback ativo (a cada 1 min via pg_cron): varre leads pendentes
 * criados nas últimas 24h e consulta a Evolution API pelas mensagens
 * recebidas daquele telefone. Se encontrar o `activation_code` no texto,
 * ativa o lead — sem depender de webhook.
 *
 * Autenticação: apikey = SUPABASE_PUBLISHABLE_KEY.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/horoscope-poll")({
  server: { handlers: { POST: handler, GET: handler } },
});

async function handler({ request }: { request: Request }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const apikey = request.headers.get("apikey");
  const authorized =
    apikey === process.env.SUPABASE_PUBLISHABLE_KEY ||
    apikey === process.env.SUPABASE_ANON_KEY;
  if (!authorized) return new Response("Unauthorized", { status: 401 });

  const { data: evo } = await (supabaseAdmin as any)
    .from("evolution_settings").select("*").eq("id", true).maybeSingle();
  if (!evo?.enabled || !evo?.base_url || !evo?.global_api_key || !evo?.instance_name) {
    return Response.json({ ok: false, reason: "evolution not configured" });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: leads } = await (supabaseAdmin as any)
    .from("horoscope_free_leads")
    .select("id, full_name, phone_e164, activation_code, status, trial_days, retry_count, last_retry_at, created_at, expiry_reminder_sent_at, confirmation_sent_at, confirmation_attempts")
    .in("status", ["pending_confirmation", "active"])
    .gte("created_at", since)
    .or("status.eq.pending_confirmation,and(status.eq.active,confirmation_sent_at.is.null)")
    .limit(50);
  if (!leads?.length) return Response.json({ ok: true, checked: 0, activated: 0, retried: 0, reminded: 0 });

  const { data: settings } = await (supabaseAdmin as any)
    .from("horoscope_landing_settings")
    .select("trial_days, confirmation_reply, retry_after_minutes, max_retries, expiry_reminder_minutes_before, expiry_reminder_template, whatsapp_number_e164, activation_keyword")
    .eq("id", true).maybeSingle();

  const retryAfterMs = Math.max(1, Number(settings?.retry_after_minutes ?? 10)) * 60_000;
  const maxRetries = Math.max(0, Number(settings?.max_retries ?? 2));
  const reminderBeforeMs = Math.max(1, Number(settings?.expiry_reminder_minutes_before ?? 60)) * 60_000;
  const keyword = String(settings?.activation_keyword ?? "ATIVAR").toUpperCase();
  const reminderTemplate = String(
    settings?.expiry_reminder_template ??
      "⚠️ Olá {{name}}, seu cadastro no horóscopo grátis expira em ~{{minutes_left}} min. Envie *{{keyword}}-{{code}}* agora para garantir seus {{trial_days}} dias grátis. ✨",
  );
  const EXPIRY_MS = 24 * 60 * 60 * 1000; // janela de 24h para confirmar

  function renderTemplate(tpl: string, vars: Record<string, string | number>): string {
    return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) =>
      vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : "",
    );
  }

  const base = String(evo.base_url).replace(/\/+$/, "");
  const inst = encodeURIComponent(evo.instance_name);
  const {
    buildActivationPatch,
        collectWhatsappMessageRecords,
        extractMessageTimestampMs,
    extractIncomingText,
    extractMessageRemoteJid,
    getWhatsAppJidCandidates,
    isIncomingWhatsappMessage,
    phoneMatches,
        sendConfirmationIfNeeded,
        textContainsActivationCode,
        textContainsActivationKeyword,
    tryActivateLead,
  } = await import("@/lib/horoscope-activation.server");
  let activated = 0;
  let retried = 0;
  let reminded = 0;
  let inspectedMessages = 0;

  for (const lead of leads) {
    const digits = String(lead.phone_e164).replace(/\D+/g, "");
    try {
      if (lead.status === "active") {
        const trialDays = Number(settings?.trial_days ?? lead.trial_days ?? 7);
        const reply = settings?.confirmation_reply ??
          `✨ Cadastro confirmado! A partir de amanhã, você receberá seu horóscopo por ${trialDays} dias.`;
        const confirmation = await sendConfirmationIfNeeded(supabaseAdmin, lead, reply);
        if (confirmation.claimed) {
          await (supabaseAdmin as any).from("app_logs").insert({
            event: "horoscope_confirmation_attempt",
            payload: {
              lead_id: lead.id,
              action: "retry_active_missing_confirmation",
              ok: confirmation.result?.ok ?? null,
              provider: confirmation.result?.provider ?? null,
              status: confirmation.result?.status ?? null,
              error: confirmation.result?.error ?? null,
              at: new Date().toISOString(),
            },
          });
        }
        continue;
      }

      // Evolution v2: POST chat/findMessages/{instance}
      const arr: any[] = [];
      const queryErrors: any[] = [];
      const queryBodies = (jid: string) => [
        { where: { key: { remoteJid: jid } }, limit: 50 },
        { where: { remoteJid: jid }, limit: 50 },
        { where: { key: { remoteJid: jid, fromMe: false } }, limit: 50 },
      ];
      for (const jid of getWhatsAppJidCandidates(lead.phone_e164)) {
        for (const body of queryBodies(jid)) {
          const r = await fetch(`${base}/chat/findMessages/${inst}`, {
            method: "POST",
            headers: { apikey: evo.global_api_key, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!r.ok) {
            queryErrors.push({ jid, status: r.status, body: await r.text().catch(() => "") });
            continue;
          }
          const json: any = await r.json().catch(() => null);
          arr.push(...collectWhatsappMessageRecords(json));
        }
      }

      // Fallback: algumas instalações da Evolution não filtram corretamente por
      // remoteJid no findMessages. Como o código é único por lead, também varremos
      // as mensagens recentes da instância e validamos pelo texto/telefone abaixo.
      try {
        const r = await fetch(`${base}/chat/findMessages/${inst}`, {
          method: "POST",
          headers: { apikey: evo.global_api_key, "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 120 }),
        });
        if (r.ok) {
          const json: any = await r.json().catch(() => null);
          arr.push(...collectWhatsappMessageRecords(json));
        } else {
          queryErrors.push({ jid: "*", status: r.status, body: await r.text().catch(() => "") });
        }
      } catch (error: any) {
        queryErrors.push({ jid: "*", status: "network", body: String(error?.message ?? error) });
      }

      const code = String(lead.activation_code).toUpperCase();
      inspectedMessages += arr.length;
      const hit = arr.find((m) => {
        if (!isIncomingWhatsappMessage(m)) return false;
        const remoteJid = extractMessageRemoteJid(m);
        const phoneOk = !remoteJid || phoneMatches(remoteJid, lead.phone_e164);
        const t = extractIncomingText(m);
        if (textContainsActivationCode(t, code)) return phoneOk || !remoteJid;
        if (!phoneOk || !textContainsActivationKeyword(t, keyword)) return false;
        const ts = extractMessageTimestampMs(m);
        return ts !== null && ts >= new Date(lead.created_at).getTime() - 2 * 60_000;
      });
      if (!hit) {
        try {
          const incoming = arr.filter(isIncomingWhatsappMessage);
          await (supabaseAdmin as any).from("app_logs").insert({
            event: "horoscope_poll_no_activation",
            payload: {
              lead_id: lead.id,
              code,
              phone: lead.phone_e164,
              candidates: getWhatsAppJidCandidates(lead.phone_e164),
              messages_found: arr.length,
              incoming_found: incoming.length,
              code_seen_anywhere: arr.some((m) => textContainsActivationCode(extractIncomingText(m), code)),
              query_errors: queryErrors.slice(0, 6).map((e) => ({
                ...e,
                body: String(e.body ?? "").slice(0, 180),
              })),
              sample: arr.slice(0, 3).map((m) => ({
                remoteJid: extractMessageRemoteJid(m),
                fromMe: m?.key?.fromMe ?? m?.fromMe ?? m?.data?.key?.fromMe ?? null,
                text: extractIncomingText(m).slice(0, 120),
                ts: extractMessageTimestampMs(m),
              })),
              incoming_sample: incoming.slice(0, 8).map((m) => ({
                remoteJid: extractMessageRemoteJid(m),
                fromMe: m?.key?.fromMe ?? m?.fromMe ?? m?.data?.key?.fromMe ?? null,
                text: extractIncomingText(m).slice(0, 180),
                has_code: textContainsActivationCode(extractIncomingText(m), code),
                has_keyword: textContainsActivationKeyword(extractIncomingText(m), keyword),
                ts: extractMessageTimestampMs(m),
              })),
              at: new Date().toISOString(),
            },
          });
        } catch {}
        continue;
      }

      const trialDays = Number(settings?.trial_days ?? lead.trial_days ?? 7);
      const didActivate = await tryActivateLead(supabaseAdmin, lead.id, buildActivationPatch(trialDays));
      if (!didActivate) continue; // já ativado por webhook concorrente


      const reply = settings?.confirmation_reply ??
        `✨ Cadastro confirmado! A partir de amanhã, você receberá seu horóscopo por ${trialDays} dias.`;
      const confirmation = await sendConfirmationIfNeeded(supabaseAdmin, {
        ...lead,
        status: "active",
      }, reply);
      if (confirmation.claimed) {
        await (supabaseAdmin as any).from("app_logs").insert({
          event: "horoscope_confirmation_attempt",
          payload: {
            lead_id: lead.id,
            action: "activated_by_poll",
            ok: confirmation.result?.ok ?? null,
            provider: confirmation.result?.provider ?? null,
            status: confirmation.result?.status ?? null,
            error: confirmation.result?.error ?? null,
            at: new Date().toISOString(),
          },
        });
      }

      activated++;
    } catch {
      // continue
    }

    // Retentativa: se ainda pendente e passou do intervalo, reenvia o código.
    try {
      if (maxRetries > 0 && (lead.retry_count ?? 0) < maxRetries) {
        const lastMs = lead.last_retry_at
          ? new Date(lead.last_retry_at).getTime()
          : new Date(lead.created_at).getTime();
        if (Date.now() - lastMs >= retryAfterMs) {
          const { tryClaimRetry } = await import("@/lib/horoscope-activation.server");
          const claimed = await tryClaimRetry(supabaseAdmin, lead.id, lead.retry_count ?? 0);
          if (claimed) {
            const msg = `⏳ Ainda não recebemos sua confirmação. Envie *${keyword}-${lead.activation_code}* para ativar seu horóscopo grátis.`;
            await fetch(`${base}/message/sendText/${inst}`, {
              method: "POST",
              headers: { apikey: evo.global_api_key, "Content-Type": "application/json" },
              body: JSON.stringify({ number: digits, text: msg }),
            }).catch(() => {});
            retried++;
          }
        }
      }
    } catch {
      // continue
    }

    // Lembrete final: X min antes da janela de 24h expirar, se ainda não enviado.
    try {
      if (!lead.expiry_reminder_sent_at) {
        const createdMs = new Date(lead.created_at).getTime();
        const msToExpiry = createdMs + EXPIRY_MS - Date.now();
        if (msToExpiry > 0 && msToExpiry <= reminderBeforeMs) {
          const { tryClaimExpiryReminder } = await import("@/lib/horoscope-activation.server");
          const claimed = await tryClaimExpiryReminder(supabaseAdmin, lead.id);
          if (claimed) {
            const minsLeft = Math.max(1, Math.round(msToExpiry / 60_000));
            const expiresAtDate = new Date(createdMs + EXPIRY_MS);
            const trialDays = Number(settings?.trial_days ?? lead.trial_days ?? 7);
            const firstName = String(lead.full_name ?? "").trim().split(/\s+/)[0] ?? "";
            const msg = renderTemplate(reminderTemplate, {
              name: firstName,
              full_name: lead.full_name ?? "",
              code: lead.activation_code,
              keyword,
              minutes_left: minsLeft,
              trial_days: trialDays,
              expires_at: expiresAtDate.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
            });
            await fetch(`${base}/message/sendText/${inst}`, {
              method: "POST",
              headers: { apikey: evo.global_api_key, "Content-Type": "application/json" },
              body: JSON.stringify({ number: digits, text: msg }),
            }).catch(() => {});
            reminded++;
          }
        }
      }
    } catch {
      // continue
    }
  }

  return Response.json({ ok: true, checked: leads.length, activated, retried, reminded, inspectedMessages });
}
