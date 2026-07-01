// FASE 4C — Endpoint público para registrar consentimento de cookies.
import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";

export const Route = createFileRoute("/api/public/affiliate/consent")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "content-type",
          },
        }),
      POST: async ({ request }) => {
        const cors = {
          "Access-Control-Allow-Origin": "*",
          "content-type": "application/json",
        };
        try {
          const body = (await request.json()) as {
            session_id?: string;
            preferences?: Record<string, boolean>;
            policy_version?: string;
          };
          if (!body?.session_id) return new Response(JSON.stringify({ error: "session_id required" }), { status: 400, headers: cors });
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
          const ip_hash = ip ? createHash("sha256").update(ip).digest("hex") : null;
          await supabaseAdmin.from("affiliate_cookie_consents").insert({
            session_id: body.session_id,
            preferences: body.preferences ?? {},
            policy_version: body.policy_version,
            user_agent: request.headers.get("user-agent") ?? null,
            ip_hash,
          });
          return new Response(JSON.stringify({ ok: true }), { headers: cors });
        } catch (e) {
          return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
        }
      },
    },
  },
});
