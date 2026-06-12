import { createFileRoute } from "@tanstack/react-router";
import pwaIcon from "@/assets/pwa-icon.png";

export const Route = createFileRoute("/api/public/manifest/icon")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("pwa_settings" as any)
          .select("icon_512_url, icon_url")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const s: any = data || {};
        const target = s.icon_512_url || s.icon_url || pwaIcon;
        return new Response(null, {
          status: 302,
          headers: {
            location: target,
            "cache-control": "public, max-age=300",
          },
        });
      },
    },
  },
});
