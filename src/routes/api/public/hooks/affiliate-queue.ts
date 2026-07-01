/**
 * POST /api/public/hooks/affiliate-queue
 * Cron endpoint: drena a fila de eventos do Affiliate Center.
 */
import { createFileRoute } from "@tanstack/react-router";
import { drainQueue } from "@/modules/affiliate/queue.server";
import { cachePurgeExpired } from "@/modules/affiliate/cache.server";

export const Route = createFileRoute("/api/public/hooks/affiliate-queue")({
  server: {
    handlers: {
      POST: async () => {
        const result = await drainQueue(50);
        const purged = await cachePurgeExpired();
        return new Response(JSON.stringify({ ok: true, ...result, cachePurged: purged }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
