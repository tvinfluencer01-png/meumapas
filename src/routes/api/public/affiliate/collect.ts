/**
 * POST /api/public/affiliate/collect
 * Endpoint universal de tracking (SDK JS envia aqui).
 * Aceita ações: `session` (upsert) ou `event` (record).
 * Rate-limited por IP (600 req/min).
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { upsertSession, recordEvent } from "@/modules/affiliate/tracking.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
} as const;

const utmSchema = z
  .object({
    source: z.string().max(200).nullish(),
    medium: z.string().max(200).nullish(),
    campaign: z.string().max(200).nullish(),
    content: z.string().max(200).nullish(),
    term: z.string().max(200).nullish(),
  })
  .partial()
  .optional();

const clickIdsSchema = z
  .object({
    fbclid: z.string().max(300).nullish(),
    gclid: z.string().max(300).nullish(),
    ttclid: z.string().max(300).nullish(),
    msclkid: z.string().max(300).nullish(),
    li_fat_id: z.string().max(300).nullish(),
    epik: z.string().max(300).nullish(),
  })
  .partial()
  .optional();

const sessionPayload = z.object({
  action: z.literal("session"),
  sessionKey: z.string().min(8).max(128),
  visitorId: z.string().min(4).max(128),
  referrer: z.string().max(2000).nullish(),
  landingUrl: z.string().max(2000).nullish(),
  language: z.string().max(20).nullish(),
  screenResolution: z.string().max(30).nullish(),
  utm: utmSchema,
  clickIds: clickIdsSchema,
  affiliateSlug: z.string().max(80).nullish(),
});

const eventPayload = z.object({
  action: z.literal("event"),
  sessionKey: z.string().min(8).max(128),
  name: z.string().min(1).max(80),
  category: z.string().max(80).nullish(),
  pageUrl: z.string().max(2000).nullish(),
  pageTitle: z.string().max(500).nullish(),
  valueCents: z.number().int().nullish(),
  currency: z.string().length(3).nullish(),
  properties: z.record(z.unknown()).optional(),
});

const bodySchema = z.discriminatedUnion("action", [sessionPayload, eventPayload]);

export const Route = createFileRoute("/api/public/affiliate/collect")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const ip =
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            request.headers.get("cf-connecting-ip") ??
            "unknown";

          const { data: allowed } = await supabaseAdmin.rpc("affiliate_check_rate_limit", {
            _bucket: `collect:${ip}`,
            _limit: 600,
            _window_seconds: 60,
          });
          if (allowed === false) {
            return new Response(JSON.stringify({ error: "rate_limited" }), {
              status: 429,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }

          const raw = await request.json();
          const parsed = bodySchema.safeParse(raw);
          if (!parsed.success) {
            return new Response(JSON.stringify({ error: "invalid_payload", details: parsed.error.flatten() }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          const body = parsed.data;

          if (body.action === "session") {
            const sessionId = await upsertSession({
              sessionKey: body.sessionKey,
              visitorId: body.visitorId,
              ip,
              userAgent: request.headers.get("user-agent"),
              referrer: body.referrer ?? null,
              landingUrl: body.landingUrl ?? null,
              language: body.language ?? null,
              screenResolution: body.screenResolution ?? null,
              utm: body.utm ?? {},
              clickIds: body.clickIds ?? {},
              affiliateSlug: body.affiliateSlug ?? null,
            });
            return new Response(JSON.stringify({ ok: true, sessionId }), {
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }

          const { data: sess } = await supabaseAdmin
            .from("affiliate_tracking_sessions")
            .select("id")
            .eq("session_key", body.sessionKey)
            .maybeSingle();
          if (!sess) {
            return new Response(JSON.stringify({ error: "session_not_found" }), {
              status: 404,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          await recordEvent({
            sessionId: sess.id as string,
            name: body.name,
            category: body.category ?? null,
            pageUrl: body.pageUrl ?? null,
            pageTitle: body.pageTitle ?? null,
            valueCents: body.valueCents ?? null,
            currency: body.currency ?? "BRL",
            properties: body.properties ?? {},
          });
          return new Response(JSON.stringify({ ok: true }), {
            headers: { "Content-Type": "application/json", ...CORS },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "unknown";
          return new Response(JSON.stringify({ error: "internal", message }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
