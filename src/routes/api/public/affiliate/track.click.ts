import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { extractTracking, pickUtm } from "@/modules/affiliate/lib/tracking";

const Body = z.object({
  affiliateCode: z.string().optional(),
  linkSlug: z.string().optional(),
  sessionToken: z.string().optional(),
  landingUrl: z.string().optional(),
  utm: z.record(z.string()).optional(),
});

export const Route = createFileRoute("/api/public/affiliate/track/click")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const json = await request.json();
          const payload = Body.parse(json);
          const ctx = extractTracking(request);
          const utm = pickUtm(payload.utm ?? {});
          const { getAdmin } = await import("@/modules/affiliate/affiliate.server");
          const { emit } = await import("@/modules/affiliate/lib/events");
          const admin = await getAdmin();

          let affiliateId: string | null = null;
          let linkId: string | null = null;
          if (payload.linkSlug) {
            const { data: link } = await admin
              .from("affiliate_links" as any)
              .select("id, affiliate_id, active")
              .eq("slug", payload.linkSlug)
              .maybeSingle();
            if (link && (link as any).active) {
              linkId = (link as any).id;
              affiliateId = (link as any).affiliate_id;
            }
          }
          if (!affiliateId && payload.affiliateCode) {
            const { data: aff } = await admin
              .from("affiliate_profiles" as any)
              .select("id, status")
              .eq("affiliate_code", payload.affiliateCode)
              .maybeSingle();
            if (aff && (aff as any).status === "approved") affiliateId = (aff as any).id;
          }
          if (!affiliateId) {
            return Response.json({ ok: false, error: "Afiliado não encontrado." }, { status: 404 });
          }

          const { data: click } = await admin
            .from("affiliate_clicks" as any)
            .insert({
              affiliate_id: affiliateId,
              link_id: linkId,
              ip: ctx.ip,
              user_agent: ctx.userAgent,
              country: ctx.country,
              region: ctx.region,
              city: ctx.city,
              device: ctx.device,
              os: ctx.os,
              browser: ctx.browser,
              referrer: ctx.referrer,
              landing_url: payload.landingUrl ?? null,
              session_token: payload.sessionToken ?? null,
              ...utm,
            })
            .select("id")
            .single();
          await emit("click.registered", { affiliateId, clickId: (click as any)?.id });
          return Response.json({ ok: true, clickId: (click as any)?.id ?? null });
        } catch (e: any) {
          return Response.json({ ok: false, error: e?.message ?? "erro" }, { status: 400 });
        }
      },
    },
  },
});
