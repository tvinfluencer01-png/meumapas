// FASE 4C — Pixel Manager (server-side).
// Envia eventos server-side para Meta CAPI, GA4 Measurement Protocol e TikTok Events API.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHash } from "crypto";

interface DispatchInput {
  event_name: string;
  event_id?: string;
  user_email?: string;
  user_phone?: string;
  value_cents?: number;
  currency?: string;
  client_ip?: string;
  user_agent?: string;
  url?: string;
  extra?: Record<string, unknown>;
}

const sha256 = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

async function sendMeta(p: any, ev: DispatchInput) {
  const url = `https://graph.facebook.com/v18.0/${p.pixel_id}/events?access_token=${encodeURIComponent(p.access_token ?? "")}`;
  const payload = {
    data: [{
      event_name: p.event_map?.[ev.event_name] ?? ev.event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: ev.event_id,
      action_source: "website",
      event_source_url: ev.url,
      user_data: {
        em: ev.user_email ? [sha256(ev.user_email)] : undefined,
        ph: ev.user_phone ? [sha256(ev.user_phone)] : undefined,
        client_ip_address: ev.client_ip,
        client_user_agent: ev.user_agent,
      },
      custom_data: {
        currency: ev.currency ?? "BRL",
        value: (ev.value_cents ?? 0) / 100,
        ...ev.extra,
      },
    }],
    test_event_code: p.test_mode ? "TEST" : undefined,
  };
  return fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
}

async function sendGA4(p: any, ev: DispatchInput) {
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(p.measurement_id ?? p.pixel_id)}&api_secret=${encodeURIComponent(p.api_secret ?? "")}`;
  const payload = {
    client_id: ev.event_id ?? `${Date.now()}.${Math.random().toString(36).slice(2)}`,
    events: [{
      name: p.event_map?.[ev.event_name] ?? ev.event_name,
      params: { value: (ev.value_cents ?? 0) / 100, currency: ev.currency ?? "BRL", page_location: ev.url, ...ev.extra },
    }],
  };
  return fetch(url, { method: "POST", body: JSON.stringify(payload) });
}

async function sendTikTok(p: any, ev: DispatchInput) {
  const url = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
  const payload = {
    event_source: "web",
    event_source_id: p.pixel_id,
    data: [{
      event: p.event_map?.[ev.event_name] ?? ev.event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: ev.event_id,
      user: {
        email: ev.user_email ? sha256(ev.user_email) : undefined,
        phone: ev.user_phone ? sha256(ev.user_phone) : undefined,
        ip: ev.client_ip,
        user_agent: ev.user_agent,
      },
      properties: { currency: ev.currency ?? "BRL", value: (ev.value_cents ?? 0) / 100, ...ev.extra },
      page: { url: ev.url },
    }],
  };
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "Access-Token": p.access_token ?? "" },
    body: JSON.stringify(payload),
  });
}

export async function dispatchPixels(ev: DispatchInput) {
  const { data: pixels } = await supabaseAdmin
    .from("affiliate_pixels")
    .select("*")
    .eq("active", true);
  const results: Array<{ provider: string; ok: boolean; status?: number; error?: string }> = [];
  for (const p of pixels ?? []) {
    try {
      let res: Response;
      if (p.provider === "meta") res = await sendMeta(p, ev);
      else if (p.provider === "ga4") res = await sendGA4(p, ev);
      else if (p.provider === "tiktok") res = await sendTikTok(p, ev);
      else continue;
      results.push({ provider: p.provider, ok: res.ok, status: res.status });
    } catch (e) {
      results.push({ provider: p.provider, ok: false, error: (e as Error).message });
    }
  }
  return results;
}
