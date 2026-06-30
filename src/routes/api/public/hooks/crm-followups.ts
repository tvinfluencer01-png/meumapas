import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/crm-followups")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { dispatchPendingFollowups } = await import("@/lib/crm-followups.functions");
          const result = await dispatchPendingFollowups();
          return Response.json({ ok: true, ...result });
        } catch (e: any) {
          console.error("[crm-followups] error", e);
          return Response.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
        }
      },
    },
  },
});
