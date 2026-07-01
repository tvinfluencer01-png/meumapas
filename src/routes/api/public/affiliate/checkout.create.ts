// Endpoint público para criar um checkout via Mercado Pago ou PayPal.
// Rate-limited via affiliate_check_rate_limit.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  provider: z.enum(["mercadopago", "paypal"]),
  amountCents: z.number().int().positive(),
  currency: z.string().default("BRL"),
  affiliateCode: z.string().optional(),
  productId: z.string().uuid().optional(),
  couponId: z.string().uuid().optional(),
  customer: z.object({
    email: z.string().email(),
    name: z.string().optional(),
  }),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  metadata: z.record(z.any()).optional(),
  utm: z.record(z.any()).optional(),
});

export const Route = createFileRoute("/api/public/affiliate/checkout/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const ip = request.headers.get("x-forwarded-for") ?? "unknown";
          const { data: allowed } = await supabaseAdmin.rpc(
            "affiliate_check_rate_limit",
            { _bucket: `checkout:${ip}`, _limit: 20, _window_seconds: 60 },
          );
          if (allowed === false) {
            return Response.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
          }
          const input = Body.parse(await request.json());
          const { createCheckout } = await import("@/modules/affiliate/checkout.server");
          const res = await createCheckout(input);
          return Response.json({ ok: true, ...res });
        } catch (e: any) {
          return Response.json({ ok: false, error: e?.message ?? "erro" }, { status: 400 });
        }
      },
    },
  },
});
