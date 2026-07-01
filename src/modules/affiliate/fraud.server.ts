// FASE 4C — Motor antifraude com IA (server-only).
// Combina heurísticas determinísticas (velocity, IP repetido, UA suspeito)
// com raciocínio LLM opcional via Lovable AI Gateway.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Signal = { code: string; weight: number; detail?: string };

export interface FraudInput {
  session_id?: string;
  click_id?: string;
  affiliate_id?: string;
  ip?: string;
  user_agent?: string;
  country?: string;
  device_type?: string;
  event_type?: string;
  meta?: Record<string, unknown>;
}

async function collectSignals(input: FraudInput): Promise<Signal[]> {
  const signals: Signal[] = [];
  const since = new Date(Date.now() - 10 * 60_000).toISOString();

  if (input.ip) {
    const { count } = await supabaseAdmin
      .from("affiliate_tracking_events")
      .select("id", { count: "exact", head: true })
      .eq("ip", input.ip)
      .gte("created_at", since);
    if ((count ?? 0) > 30) signals.push({ code: "ip_velocity", weight: 35, detail: `${count} eventos/10min` });
    else if ((count ?? 0) > 10) signals.push({ code: "ip_burst", weight: 15, detail: `${count} eventos/10min` });
  }

  if (input.user_agent) {
    const ua = input.user_agent.toLowerCase();
    if (/bot|crawler|spider|headless|phantom|selenium|puppeteer/.test(ua))
      signals.push({ code: "bot_ua", weight: 40, detail: ua.slice(0, 60) });
    if (ua.length < 20) signals.push({ code: "ua_short", weight: 15 });
  }

  if (input.affiliate_id) {
    const { count } = await supabaseAdmin
      .from("affiliate_clicks")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", input.affiliate_id)
      .gte("created_at", since);
    if ((count ?? 0) > 100) signals.push({ code: "affiliate_flood", weight: 25, detail: `${count} clicks` });
  }

  return signals;
}

async function aiReasoning(input: FraudInput, signals: Signal[]): Promise<string | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key || signals.length === 0) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um analista antifraude. Responda em até 2 frases em português." },
          { role: "user", content: `Sinais detectados: ${JSON.stringify(signals)}. Contexto: ${JSON.stringify(input).slice(0, 400)}. Explique o risco.` },
        ],
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return j.choices?.[0]?.message?.content?.trim() ?? null;
  } catch { return null; }
}

export async function scoreAndRecord(input: FraudInput) {
  const signals = await collectSignals(input);
  const rawScore = signals.reduce((s, x) => s + x.weight, 0);
  const score = Math.min(100, rawScore);
  const risk_level =
    score >= 70 ? "critical" : score >= 45 ? "high" : score >= 20 ? "medium" : "low";
  const action_taken = score >= 70 ? "block" : score >= 45 ? "review" : "allow";
  const ai_reasoning = score >= 20 ? await aiReasoning(input, signals) : null;

  const { data, error } = await supabaseAdmin
    .from("affiliate_fraud_scores")
    .insert({
      session_id: input.session_id,
      click_id: input.click_id,
      affiliate_id: input.affiliate_id,
      score,
      risk_level,
      signals,
      ai_reasoning,
      action_taken,
    })
    .select("id, score, risk_level, action_taken")
    .single();
  if (error) throw error;
  return data;
}
