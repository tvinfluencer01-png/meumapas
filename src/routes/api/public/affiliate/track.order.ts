import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  orderRef: z.string().min(1),
  customerRef: z.string().optional(),
  amount_cents: z.number().int().min(0),
  status: z.enum(["pending", "paid", "refunded", "canceled"]).default("paid"),
  sessionToken: z.string().optional(),
  affiliateCode: z.string().optional(),
});

// Requires X-API-Key header (affiliate API key OR service-level secret).
export const Route = createFileRoute("/api/public/affiliate/track/order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = request.headers.get("x-api-key") ?? "";
          if (!apiKey) return Response.json({ ok: false, error: "API key ausente." }, { status: 401 });

          const payload = Body.parse(await request.json());
          const { getAdmin, findAffiliateByApiKey } = await import(
            "@/modules/affiliate/affiliate.server"
          );
          const { emit } = await import("@/modules/affiliate/lib/events");
          const admin = await getAdmin();

          let affiliateId: string | null = null;
          let sessionId: string | null = null;

          const aff = await findAffiliateByApiKey(apiKey);
          if (aff && aff.status === "approved") affiliateId = aff.id;

          if (!affiliateId && payload.sessionToken) {
            const { data: s } = await admin
              .from("affiliate_sessions" as any)
              .select("id, affiliate_id")
              .eq("session_token", payload.sessionToken)
              .maybeSingle();
            sessionId = (s as any)?.id ?? null;
            affiliateId = (s as any)?.affiliate_id ?? null;
          }
          if (!affiliateId && payload.affiliateCode) {
            const { data: a } = await admin
              .from("affiliate_profiles" as any)
              .select("id")
              .eq("affiliate_code", payload.affiliateCode)
              .maybeSingle();
            affiliateId = (a as any)?.id ?? null;
          }
          if (!affiliateId) {
            return Response.json({ ok: false, error: "Afiliado não localizado." }, { status: 404 });
          }

          const { data: order, error } = await admin
            .from("affiliate_orders" as any)
            .upsert(
              {
                affiliate_id: affiliateId,
                session_id: sessionId,
                order_ref: payload.orderRef,
                customer_ref: payload.customerRef ?? null,
                amount_cents: payload.amount_cents,
                status: payload.status,
              },
              { onConflict: "affiliate_id,order_ref" },
            )
            .select("id, amount_cents, status")
            .single();
          if (error) throw new Error(error.message);

          // Auto-create commission for paid orders.
          if ((order as any).status === "paid") {
            const { data: settings } = await admin
              .from("affiliate_settings" as any)
              .select("default_commission_rate")
              .eq("id", "global")
              .maybeSingle();
            const { data: prof } = await admin
              .from("affiliate_profiles" as any)
              .select("default_commission_rate")
              .eq("id", affiliateId)
              .maybeSingle();
            const rate =
              (prof as any)?.default_commission_rate ??
              (settings as any)?.default_commission_rate ??
              20;
            const commissionCents = Math.round(((order as any).amount_cents * rate) / 100);
            await admin.from("affiliate_commissions" as any).insert({
              affiliate_id: affiliateId,
              order_id: (order as any).id,
              amount_cents: commissionCents,
              rate,
              status: "pending",
            });
            await emit("commission.created", { affiliateId, orderId: (order as any).id });
          }
          await emit("order.recorded", { affiliateId, orderId: (order as any).id });
          return Response.json({ ok: true, orderId: (order as any).id });
        } catch (e: any) {
          return Response.json({ ok: false, error: e?.message ?? "erro" }, { status: 400 });
        }
      },
    },
  },
});
