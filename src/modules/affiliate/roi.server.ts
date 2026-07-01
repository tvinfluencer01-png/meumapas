// FASE 4C — Cálculo de ROI/ROAS por afiliado e período.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface RoiFilters {
  affiliate_id?: string;
  product_id?: string;
  period_start: string; // YYYY-MM-DD
  period_end: string;
  ad_spend_cents?: number;
}

export async function computeRoi(f: RoiFilters) {
  let clicksQ = supabaseAdmin.from("affiliate_clicks")
    .select("id", { count: "exact", head: true })
    .gte("created_at", f.period_start)
    .lte("created_at", f.period_end + "T23:59:59");
  if (f.affiliate_id) clicksQ = clicksQ.eq("affiliate_id", f.affiliate_id);
  const { count: clicks } = await clicksQ;

  let ordersQ = supabaseAdmin.from("affiliate_orders")
    .select("gross_cents, commission_cents", { count: "exact" })
    .gte("created_at", f.period_start)
    .lte("created_at", f.period_end + "T23:59:59")
    .eq("status", "paid");
  if (f.affiliate_id) ordersQ = ordersQ.eq("affiliate_id", f.affiliate_id);
  if (f.product_id) ordersQ = ordersQ.eq("product_id", f.product_id);
  const { data: orders, count: conversions } = await ordersQ;

  const revenue_cents = (orders ?? []).reduce((s, o: any) => s + (o.gross_cents ?? 0), 0);
  const commission_cents = (orders ?? []).reduce((s, o: any) => s + (o.commission_cents ?? 0), 0);
  const ad_spend_cents = f.ad_spend_cents ?? 0;
  const roas = ad_spend_cents > 0 ? revenue_cents / ad_spend_cents : 0;
  const epc_cents = (clicks ?? 0) > 0 ? Math.round(revenue_cents / (clicks ?? 1)) : 0;
  const cvr = (clicks ?? 0) > 0 ? (conversions ?? 0) / (clicks ?? 1) : 0;

  const snapshot = {
    period_start: f.period_start,
    period_end: f.period_end,
    affiliate_id: f.affiliate_id ?? null,
    product_id: f.product_id ?? null,
    clicks: clicks ?? 0,
    conversions: conversions ?? 0,
    revenue_cents,
    commission_cents,
    ad_spend_cents,
    roas,
    epc_cents,
    cvr,
  };
  await supabaseAdmin.from("affiliate_roi_snapshots").insert(snapshot);
  return snapshot;
}
