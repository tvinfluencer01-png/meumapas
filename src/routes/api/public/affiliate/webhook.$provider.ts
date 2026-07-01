import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const EventSchema = z.object({
  event_type: z.string().min(1),
  external_id: z.string().optional(),
  order_ref: z.string().optional(),
  affiliate_code: z.string().optional(),
  customer_email: z.string().optional(),
  customer_cpf: z.string().optional(),
  amount_cents: z.number().int().optional(),
  currency: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Public webhook endpoint for external checkouts / gateways.
 * URL: /api/public/affiliate/webhook/:provider
 * Auth: HMAC signature in `x-affiliate-signature` (sha256 hex of body using AFFILIATE_WEBHOOK_SECRET).
 * If no secret is configured, accepts requests but marks them as `ignored=false` — recommended: always set the secret.
 */
export const Route = createFileRoute("/api/public/affiliate/webhook/$provider")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const provider = params.provider ?? "unknown";
        const raw = await request.text();
        const signature = request.headers.get("x-affiliate-signature") ?? "";
        const secret = process.env.AFFILIATE_WEBHOOK_SECRET;

        if (secret) {
          const { createHmac, timingSafeEqual } = await import("crypto");
          const expected = createHmac("sha256", secret).update(raw).digest("hex");
          const a = Buffer.from(signature);
          const b = Buffer.from(expected);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        let body: any;
        try {
          body = JSON.parse(raw);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parsed = EventSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: evt, error } = await supabaseAdmin
          .from("affiliate_webhook_events" as any)
          .insert({
            provider,
            event_type: parsed.data.event_type,
            external_id: parsed.data.external_id ?? null,
            payload: parsed.data,
            status: "received",
          })
          .select("id")
          .single();
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        // Enqueue processing job.
        await supabaseAdmin.from("affiliate_processing_queue" as any).insert({
          job: `webhook:${provider}:${parsed.data.event_type}`,
          payload: { webhook_event_id: (evt as any).id, ...parsed.data },
        });

        // Immediate lightweight processing for confirmed payments.
        try {
          if (parsed.data.event_type === "payment.approved" || parsed.data.event_type === "order.paid") {
            await processPaymentApproved(parsed.data, supabaseAdmin);
          } else if (parsed.data.event_type === "payment.refunded" || parsed.data.event_type === "order.refunded") {
            await processRefund(parsed.data, supabaseAdmin);
          } else if (parsed.data.event_type === "payment.canceled" || parsed.data.event_type === "order.canceled") {
            await processCancel(parsed.data, supabaseAdmin);
          }
          await supabaseAdmin
            .from("affiliate_webhook_events" as any)
            .update({ status: "processed", processed_at: new Date().toISOString() })
            .eq("id", (evt as any).id);
        } catch (e: any) {
          await supabaseAdmin
            .from("affiliate_webhook_events" as any)
            .update({ status: "failed", error: String(e?.message ?? e) })
            .eq("id", (evt as any).id);
        }

        return Response.json({ ok: true, id: (evt as any).id });
      },
    },
  },
});

async function processPaymentApproved(data: any, sb: any) {
  if (!data.affiliate_code || !data.order_ref) return;
  const { data: aff } = await sb
    .from("affiliate_profiles")
    .select("id, status, default_commission_rate, cpf")
    .eq("affiliate_code", data.affiliate_code)
    .maybeSingle();
  if (!aff || aff.status !== "approved") return;

  const { data: settings } = await sb
    .from("affiliate_settings")
    .select("default_commission_rate,hold_days,auto_approve,antifraud_same_cpf,antifraud_block_self,antifraud_same_ip")
    .eq("id", "global")
    .maybeSingle();

  // Register order.
  const { data: order } = await sb
    .from("affiliate_orders")
    .upsert(
      {
        affiliate_id: aff.id,
        order_ref: data.order_ref,
        amount_cents: data.amount_cents ?? 0,
        status: "paid",
        metadata: data.payload ?? {},
        occurred_at: new Date().toISOString(),
      },
      { onConflict: "affiliate_id,order_ref" },
    )
    .select("id")
    .single();

  // Antifraud checks.
  const evidence: any = {};
  let blocked = false;
  const reasons: string[] = [];

  if (settings?.antifraud_block_self && data.customer_cpf && aff.cpf && data.customer_cpf === aff.cpf) {
    blocked = true;
    reasons.push("auto_purchase_same_cpf");
    evidence.customer_cpf = data.customer_cpf;
  }

  if (settings?.antifraud_same_cpf && data.customer_cpf) {
    const { data: dup } = await sb
      .from("affiliate_orders")
      .select("id")
      .eq("affiliate_id", aff.id)
      .contains("metadata", { customer_cpf: data.customer_cpf })
      .limit(2);
    if ((dup ?? []).length >= 2) reasons.push("same_cpf_multiple_orders");
  }

  // Calculate commission from rules → fallback to affiliate rate → global default.
  const rate = await resolveCommissionRate(sb, aff, data);
  const commissionAmount = Math.round(((data.amount_cents ?? 0) * rate) / 100);
  const holdDays = settings?.hold_days ?? 30;
  const availableAt = new Date(Date.now() + holdDays * 86400000).toISOString();

  const commissionStatus = blocked ? "blocked" : settings?.auto_approve ? "approved" : "pending";

  const { data: commission } = await sb.from("affiliate_commissions").insert({
    affiliate_id: aff.id,
    order_id: (order as any)?.id ?? null,
    amount_cents: commissionAmount,
    rate,
    status: commissionStatus,
    available_at: blocked ? null : availableAt,
  }).select("id").single();

  if (reasons.length || blocked) {
    await sb.from("affiliate_fraud_flags").insert({
      affiliate_id: aff.id,
      order_id: (order as any)?.id ?? null,
      commission_id: (commission as any)?.id ?? null,
      reason: reasons.join(",") || "manual_review",
      severity: blocked ? "high" : "medium",
      status: blocked ? "blocked" : "open",
      evidence,
    });
  }
}

async function processRefund(data: any, sb: any) {
  if (!data.order_ref) return;
  const { data: order } = await sb.from("affiliate_orders").select("id").eq("order_ref", data.order_ref).maybeSingle();
  if (!order) return;
  await sb.from("affiliate_orders").update({ status: "refunded" }).eq("id", (order as any).id);
  await sb.from("affiliate_commissions").update({ status: "reversed" }).eq("order_id", (order as any).id);
}

async function processCancel(data: any, sb: any) {
  if (!data.order_ref) return;
  const { data: order } = await sb.from("affiliate_orders").select("id").eq("order_ref", data.order_ref).maybeSingle();
  if (!order) return;
  await sb.from("affiliate_orders").update({ status: "canceled" }).eq("id", (order as any).id);
  await sb.from("affiliate_commissions").update({ status: "reversed" }).eq("order_id", (order as any).id);
}

async function resolveCommissionRate(sb: any, aff: any, data: any): Promise<number> {
  const productSlug = data.payload?.product_slug;
  const category = data.payload?.category;
  const { data: rules } = await sb
    .from("affiliate_commission_rules")
    .select("*")
    .eq("active", true)
    .order("priority", { ascending: false });
  for (const r of rules ?? []) {
    if (r.kind !== "percent") continue;
    if (r.scope === "affiliate" && r.affiliate_id === aff.id) return Number(r.value);
    if (r.scope === "product" && productSlug && r.scope_ref === productSlug) return Number(r.value);
    if (r.scope === "category" && category && r.scope_ref === category) return Number(r.value);
    if (r.scope === "global") return Number(r.value);
  }
  if (aff.default_commission_rate != null) return Number(aff.default_commission_rate);
  const { data: s } = await sb.from("affiliate_settings").select("default_commission_rate").eq("id", "global").maybeSingle();
  return Number(s?.default_commission_rate ?? 20);
}
