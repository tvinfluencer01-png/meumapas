import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/s/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const slug = String(params.slug || "").trim();
        if (!slug) return new Response("Not found", { status: 404 });

        const { data } = await supabaseAdmin
          .from("short_links" as any)
          .select("id, target_url, expires_at, clicks")
          .eq("slug", slug)
          .maybeSingle();
        const row = data as any;
        if (!row?.target_url) return new Response("Link não encontrado.", { status: 404 });
        if (row.expires_at && new Date(row.expires_at) < new Date()) {
          return new Response("Link expirado.", { status: 410 });
        }

        // Fire-and-forget click counter
        void supabaseAdmin
          .from("short_links" as any)
          .update({ clicks: (row.clicks ?? 0) + 1 } as any)
          .eq("id", row.id);

        return new Response(null, {
          status: 302,
          headers: { Location: row.target_url, "Cache-Control": "no-store" },
        });
      },
    },
  },
});
