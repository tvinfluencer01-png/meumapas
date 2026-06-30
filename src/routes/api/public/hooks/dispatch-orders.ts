import { createFileRoute } from "@tanstack/react-router";
import { runAutomaticDispatchSweep } from "@/lib/product-orders.functions";

export const Route = createFileRoute("/api/public/hooks/dispatch-orders")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await runAutomaticDispatchSweep();
          return new Response(JSON.stringify({ ok: true, ...result }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: e?.message ?? String(e) }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
