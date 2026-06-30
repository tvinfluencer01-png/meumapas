import { createFileRoute } from "@tanstack/react-router";
import { extractTracking, pickUtm } from "@/modules/affiliate/lib/tracking";

// GET /api/public/affiliate/r/:slug  → registra clique + 302 para destino.
export const Route = createFileRoute("/api/public/affiliate/r/$slug")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getAdmin } = await import("@/modules/affiliate/affiliate.server");
        const admin = await getAdmin();
        const slug = (params as any).slug as string;
        const { data: link } = await admin
          .from("affiliate_links" as any)
          .select("id, affiliate_id, destination_url, active")
          .eq("slug", slug)
          .maybeSingle();
        if (!link || !(link as any).active) {
          return new Response("Link inválido", { status: 404 });
        }
        const ctx = extractTracking(request);
        const url = new URL(request.url);
        const utm = pickUtm(url.searchParams);
        await admin.from("affiliate_clicks" as any).insert({
          affiliate_id: (link as any).affiliate_id,
          link_id: (link as any).id,
          ip: ctx.ip,
          user_agent: ctx.userAgent,
          country: ctx.country,
          region: ctx.region,
          city: ctx.city,
          device: ctx.device,
          os: ctx.os,
          browser: ctx.browser,
          referrer: ctx.referrer,
          landing_url: (link as any).destination_url,
          ...utm,
        });
        const dest = new URL((link as any).destination_url, url.origin);
        // Propagate UTM forward.
        for (const [k, v] of Object.entries(utm)) if (v) dest.searchParams.set(k, v as string);
        return new Response(null, { status: 302, headers: { location: dest.toString() } });
      },
    },
  },
});
