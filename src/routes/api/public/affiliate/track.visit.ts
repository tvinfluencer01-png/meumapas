import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { extractTracking } from "@/modules/affiliate/lib/tracking";

const Body = z.object({
  affiliateCode: z.string().optional(),
  linkSlug: z.string().optional(),
  sessionToken: z.string().optional(),
});

export const Route = createFileRoute("/api/public/affiliate/track/visit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = Body.parse(await request.json());
          const { getAdmin, newSessionToken, fingerprint } = await import(
            "@/modules/affiliate/affiliate.server"
          );
          const admin = await getAdmin();
          const ctx = extractTracking(request);

          let affiliateId: string | null = null;
          let firstClickId: string | null = null;

          if (payload.linkSlug) {
            const { data: link } = await admin
              .from("affiliate_links" as any)
              .select("id, affiliate_id")
              .eq("slug", payload.linkSlug)
              .maybeSingle();
            affiliateId = (link as any)?.affiliate_id ?? null;
          }
          if (!affiliateId && payload.affiliateCode) {
            const { data: aff } = await admin
              .from("affiliate_profiles" as any)
              .select("id")
              .ilike("affiliate_code", payload.affiliateCode)
              .maybeSingle();
            affiliateId = (aff as any)?.id ?? null;
          }
          if (!affiliateId) {
            return Response.json({ ok: false, error: "Afiliado não encontrado." }, { status: 404 });
          }

          const token = payload.sessionToken || newSessionToken();
          const { data: existing } = await admin
            .from("affiliate_sessions" as any)
            .select("id")
            .eq("session_token", token)
            .maybeSingle();

          if (existing) {
            await admin
              .from("affiliate_sessions" as any)
              .update({ last_seen: new Date().toISOString() })
              .eq("id", (existing as any).id);
          } else {
            const { data: lastClick } = await admin
              .from("affiliate_clicks" as any)
              .select("id")
              .eq("affiliate_id", affiliateId)
              .eq("session_token", token)
              .order("landed_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            firstClickId = (lastClick as any)?.id ?? null;
            await admin.from("affiliate_sessions" as any).insert({
              affiliate_id: affiliateId,
              session_token: token,
              first_click_id: firstClickId,
              fingerprint: fingerprint(ctx),
            });
          }
          return Response.json({ ok: true, sessionToken: token });
        } catch (e: any) {
          return Response.json({ ok: false, error: e?.message ?? "erro" }, { status: 400 });
        }
      },
    },
  },
});
