import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  affiliateCode: z.string().optional(),
  sessionToken: z.string().optional(),
  value_cents: z.number().int().min(0).default(0),
  reference: z.string().optional(),
});

export const Route = createFileRoute("/api/public/affiliate/track/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = Body.parse(await request.json());
          const { getAdmin } = await import("@/modules/affiliate/affiliate.server");
          const { emit } = await import("@/modules/affiliate/lib/events");
          const admin = await getAdmin();

          let affiliateId: string | null = null;
          let sessionId: string | null = null;
          if (payload.sessionToken) {
            const { data: s } = await admin
              .from("affiliate_sessions" as any)
              .select("id, affiliate_id")
              .eq("session_token", payload.sessionToken)
              .maybeSingle();
            sessionId = (s as any)?.id ?? null;
            affiliateId = (s as any)?.affiliate_id ?? null;
          }
          if (!affiliateId && payload.affiliateCode) {
            const { data: aff } = await admin
              .from("affiliate_profiles" as any)
              .select("id")
              .eq("affiliate_code", payload.affiliateCode)
              .maybeSingle();
            affiliateId = (aff as any)?.id ?? null;
          }
          if (!affiliateId) {
            return Response.json({ ok: false, error: "Afiliado não encontrado." }, { status: 404 });
          }

          const { data: conv } = await admin
            .from("affiliate_conversions" as any)
            .insert({
              affiliate_id: affiliateId,
              session_id: sessionId,
              type: "checkout",
              value_cents: payload.value_cents,
              reference: payload.reference ?? null,
            })
            .select("id")
            .single();
          await emit("conversion.recorded", {
            affiliateId,
            conversionId: (conv as any)?.id,
            type: "checkout",
          });
          return Response.json({ ok: true, conversionId: (conv as any)?.id ?? null });
        } catch (e: any) {
          return Response.json({ ok: false, error: e?.message ?? "erro" }, { status: 400 });
        }
      },
    },
  },
});
