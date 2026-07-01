// Central financeira — FASE 4B / Módulo 7.
// Consolida saques aprovados em lotes (PIX/TED), calcula taxas, produz
// extratos e realiza conciliação básica com o ledger.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { writeLedger } from "./ledger.server";

function batchCode(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `BATCH-${y}${m}${day}-${rand}`;
}

async function loadSettings() {
  const { data } = await supabaseAdmin
    .from("affiliate_settings" as any)
    .select("pix_fee_cents, ted_fee_cents, payout_batch_min_cents")
    .eq("id", "global")
    .maybeSingle();
  return {
    pixFee: Number((data as any)?.pix_fee_cents ?? 0),
    tedFee: Number((data as any)?.ted_fee_cents ?? 500),
    batchMin: Number((data as any)?.payout_batch_min_cents ?? 5000),
  };
}

// Cria um lote a partir de saques aprovados (status='approved') que ainda não estão em lote.
export async function createPayoutBatch(opts: {
  method: "pix" | "ted" | "manual";
  withdrawIds?: string[];
  createdBy?: string;
  notes?: string;
}) {
  const s = await loadSettings();
  const fee = opts.method === "pix" ? s.pixFee : opts.method === "ted" ? s.tedFee : 0;

  let q = supabaseAdmin
    .from("affiliate_withdraws" as any)
    .select("id, affiliate_id, amount_cents, status, method")
    .eq("status", "approved");
  if (opts.withdrawIds?.length) q = q.in("id", opts.withdrawIds);
  else q = q.eq("method", opts.method);
  const { data: wsRaw, error } = await q;
  if (error) throw new Error(error.message);
  const ws = (wsRaw ?? []) as any[];
  if (!ws.length) throw new Error("Nenhum saque elegível para lote.");

  const code = batchCode();
  const total = ws.reduce((sum, w) => sum + Number(w.amount_cents), 0);
  const totalFee = fee * ws.length;

  const { data: batch, error: bErr } = await supabaseAdmin
    .from("affiliate_payout_batches" as any)
    .insert({
      batch_code: code,
      method: opts.method,
      total_cents: total,
      fee_cents: totalFee,
      items_count: ws.length,
      status: "draft",
      created_by: opts.createdBy ?? null,
      notes: opts.notes ?? null,
    })
    .select("id, batch_code")
    .single();
  if (bErr) throw new Error(bErr.message);

  const items = ws.map((w) => ({
    batch_id: (batch as any).id,
    affiliate_id: w.affiliate_id,
    withdraw_id: w.id,
    amount_cents: w.amount_cents,
    fee_cents: fee,
    net_cents: Math.max(0, Number(w.amount_cents) - fee),
    status: "pending",
  }));
  const { error: iErr } = await supabaseAdmin
    .from("affiliate_payout_batch_items" as any)
    .insert(items);
  if (iErr) throw new Error(iErr.message);

  await supabaseAdmin
    .from("affiliate_withdraws" as any)
    .update({ status: "processing" })
    .in("id", ws.map((w) => w.id));

  return { batchId: (batch as any).id, batchCode: (batch as any).batch_code, count: ws.length, totalCents: total, feeCents: totalFee };
}

// Marca um item do lote como pago → debita ledger do afiliado e finaliza o saque.
export async function markBatchItemPaid(itemId: string, externalRef?: string, receiptUrl?: string) {
  const { data: item, error } = await supabaseAdmin
    .from("affiliate_payout_batch_items" as any)
    .select("*")
    .eq("id", itemId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!item) throw new Error("Item não encontrado.");
  if ((item as any).status === "paid") return item;

  await supabaseAdmin
    .from("affiliate_payout_batch_items" as any)
    .update({
      status: "paid",
      external_ref: externalRef ?? null,
      receipt_url: receiptUrl ?? null,
    })
    .eq("id", itemId);

  if ((item as any).withdraw_id) {
    await supabaseAdmin
      .from("affiliate_withdraws" as any)
      .update({ status: "paid" })
      .eq("id", (item as any).withdraw_id);
  }

  await writeLedger({
    affiliateId: (item as any).affiliate_id,
    type: "withdraw",
    direction: "debit",
    amountCents: Number((item as any).amount_cents),
    referenceType: "batch_item",
    referenceId: itemId,
    description: "Pagamento de saque",
    metadata: { externalRef, receiptUrl },
  });
  if (Number((item as any).fee_cents) > 0) {
    await writeLedger({
      affiliateId: (item as any).affiliate_id,
      type: "fee",
      direction: "debit",
      amountCents: Number((item as any).fee_cents),
      referenceType: "batch_item",
      referenceId: itemId,
      description: "Taxa de transferência",
    });
  }
  return item;
}

// Fecha o lote e verifica se todos os itens estão pagos.
export async function closeBatch(batchId: string) {
  const { data: items } = await supabaseAdmin
    .from("affiliate_payout_batch_items" as any)
    .select("status")
    .eq("batch_id", batchId);
  const allPaid = (items ?? []).every((i: any) => i.status === "paid");
  await supabaseAdmin
    .from("affiliate_payout_batches" as any)
    .update({
      status: allPaid ? "completed" : "failed",
      processed_at: new Date().toISOString(),
    })
    .eq("id", batchId);
  return { batchId, completed: allPaid };
}
