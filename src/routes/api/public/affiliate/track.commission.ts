import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  affiliateCode: z.string(),
  amount_cents: z.number().int().min(0),
  rate: z.number().min(0).max(100).optional(),
  orderRef: z.string().optional(),
  status: z.enum(["pending", "approved", "paid", "canceled"]).default("pending"),
});

// Admin endpoint — requires X-API-Key matching SUPER_ADMIN_PASSWORD env.
export const Route = createFileRoute("/api/public/affiliate/track/commission")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = request.headers.get("x-api-key") ?? "";
          if (!apiKey || apiKey !== process.env.SUPER_ADMIN_PASSWORD) {
            return Response.json({ ok: false, error: "Não autorizado." }, { status: 401 });
          }
          const payload = Body.parse(await request.json());
          const { getAdmin } = await import("@/modules/affiliate/affiliate.server");
          const admin = await getAdmin();

          const { data: aff } = await admin
            .from("affiliate_profiles" as any)
            .select("id")
            .eq("affiliate_code", payload.affiliateCode)
            .maybeSingle();
          if (!aff) return Response.json({ ok: false, error: "Afiliado não encontrado." }, { status: 404 });

          let orderId: string | null = null;
          if (payload.orderRef) {
            const { data: o } = await admin
              .from("affiliate_orders" as any)
              .select("id")
              .eq("affiliate_id", (aff as any).id)
              .eq("order_ref", payload.orderRef)
              .maybeSingle();
            orderId = (o as any)?.id ?? null;
          }
          const { data, error } = await admin
            .from("affiliate_commissions" as any)
            .insert({
              affiliate_id: (aff as any).id,
              amount_cents: payload.amount_cents,
              rate: payload.rate ?? null,
              order_id: orderId,
              status: payload.status,
            })
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          return Response.json({ ok: true, commissionId: (data as any).id });
        } catch (e: any) {
          return Response.json({ ok: false, error: e?.message ?? "erro" }, { status: 400 });
        }
      },
    },
  },
});
