import { createFileRoute } from "@tanstack/react-router";
import { expireLapsedHoroscopeSubscriptions } from "@/lib/horoscope-subscription-lifecycle.server";

/**
 * Cron: expira assinaturas pagas do horóscopo diário cujo current_period_end
 * já passou e desliga o envio (horoscope_subscriptions.enabled = false).
 * Auth: apikey header (padrão pg_cron).
 */
export const Route = createFileRoute("/api/public/hooks/horoscope-subscription-expiry")({
  server: {
    handlers: {
      POST: handler,
      GET: handler,
    },
  },
});

async function handler({ request }: { request: Request }) {
  const apikey = request.headers.get("apikey");
  if (
    apikey !== process.env.SUPABASE_PUBLISHABLE_KEY &&
    apikey !== process.env.SUPABASE_ANON_KEY
  ) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await expireLapsedHoroscopeSubscriptions();
  return Response.json({ ok: true, ...result });
}
