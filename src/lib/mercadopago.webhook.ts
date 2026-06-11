import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const handleMercadoPagoWebhook = createServerFn({ method: "POST" })
  .handler(async ({ request }) => {
    try {
      const body = await request.json();
      console.log("[Mercado Pago Webhook] Received:", body);

      const topic = body.topic || body.type;
      const resourceId = body.resource || (body.data && body.data.id);

      if (topic === "payment" || topic === "merchant_order") {
        // Obter configurações do Mercado Pago
        const { data: mp } = await supabaseAdmin
          .from("mercado_pago_settings")
          .select("access_token")
          .eq("id", true)
          .maybeSingle();

        if (!mp?.access_token) {
          console.error("[Webhook] No access token found");
          return new Response("No access token", { status: 500 });
        }

        let paymentData;
        if (topic === "payment") {
          const res = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
            headers: { Authorization: `Bearer ${mp.access_token}` },
          });
          paymentData = await res.json();
        }

        const externalReference = paymentData?.external_reference;
        const status = paymentData?.status;

        if (externalReference && status === "approved") {
          console.log("[Webhook] Payment approved for order:", externalReference);
          
          // Buscar o pedido original
          const { data: order } = await supabaseAdmin
            .from("payment_orders")
            .select("*")
            .eq("id", externalReference)
            .maybeSingle();

          if (order && order.status !== "approved") {
            // Atualizar status do pedido
            await supabaseAdmin
              .from("payment_orders")
              .update({ status: "approved", updated_at: new Date().toISOString() })
              .eq("id", order.id);

            // Se for créditos, adicionar ao saldo
            if (order.product_kind === "credits") {
              const { data: pkg } = await import("./addons.catalog").then(m => ({
                data: m.CREDIT_PACKAGES.find(p => p.id === order.product_id)
              }));
              
              if (pkg) {
                await supabaseAdmin.rpc("adjust_credits", {
                  _user_id: order.user_id,
                  _amount: pkg.credits,
                  _kind: "purchase",
                  _reference: `Compra: ${pkg.name} (${order.id})`
                });
              }
            } 
            // Se for assinatura/addon, ativar
            else if (order.product_kind === "subscription") {
              const now = new Date();
              const nextMonth = new Date();
              nextMonth.setMonth(now.getMonth() + 1);

              await supabaseAdmin
                .from("user_subscriptions")
                .upsert({
                  user_id: order.user_id,
                  addon_id: order.product_id,
                  status: "active",
                  current_period_start: now.toISOString(),
                  current_period_end: nextMonth.toISOString(),
                  updated_at: now.toISOString()
                }, { onConflict: "user_id,addon_id" });
            }
          }
        }
      }

      return new Response("OK", { status: 200 });
    } catch (error: any) {
      console.error("[Webhook Error]", error);
      return new Response(error.message, { status: 500 });
    }
  });
