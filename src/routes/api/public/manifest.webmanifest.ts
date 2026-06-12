import { createFileRoute } from "@tanstack/react-router";
import pwaIcon from "@/assets/pwa-icon.png";

export const Route = createFileRoute("/api/public/manifest/webmanifest")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("pwa_settings" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const s: any = data || {};
        const icon192 = s.icon_url || pwaIcon;
        const icon512 = s.icon_512_url || s.icon_url || pwaIcon;

        const manifest = {
          name: s.name || "Código Cósmico",
          short_name: s.short_name || "Cósmico",
          description: s.description || "Mapa Astral, Numerologia e IA Espiritual",
          start_url: s.start_url || "/",
          display: s.display || "standalone",
          orientation: s.orientation || "portrait",
          background_color: s.background_color || "#0a0814",
          theme_color: s.theme_color || "#1a1430",
          icons: [
            { src: icon192, sizes: "192x192", type: "image/png", purpose: "any" },
            { src: icon512, sizes: "512x512", type: "image/png", purpose: "any" },
            { src: icon512, sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        };

        return new Response(JSON.stringify(manifest), {
          headers: {
            "content-type": "application/manifest+json; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        });
      },
    },
  },
});
