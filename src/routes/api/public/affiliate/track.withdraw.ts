import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  affiliateCode: z.string(),
  amount_cents: z.number().int().min(1),
  method: z.enum(["pix", "bank_transfer"]),
  status: z.enum(["requested", "processing", "paid", "rejected"]).default("requested"),
  notes: z.string().optional(),
});

export const Route = createFileRoute("/api/public/affiliate/track/withdraw")({
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
          const { data, error } = await admin
            .from("affiliate_withdraws" as any)
            .insert({
              affiliate_id: (aff as any).id,
              amount_cents: payload.amount_cents,
              method: payload.method,
              status: payload.status,
              notes: payload.notes ?? null,
            })
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          return Response.json({ ok: true, withdrawId: (data as any).id });
        } catch (e: any) {
          return Response.json({ ok: false, error: e?.message ?? "erro" }, { status: 400 });
        }
      },
    },
  },
});
