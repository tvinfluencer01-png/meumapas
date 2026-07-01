// Livro-razão financeiro do afiliado (append-only).
// Toda entrada/saída de saldo passa por aqui, mantendo `balance_after_cents`
// consistente. Executa sob service role — só chame em módulos *.server.ts
// ou dentro de handlers de rotas/serverFns que já autorizaram o chamador.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type LedgerEntryType =
  | "commission"
  | "withdraw"
  | "adjustment"
  | "fee"
  | "refund"
  | "bonus"
  | "chargeback";

export interface LedgerInput {
  affiliateId: string;
  type: LedgerEntryType;
  direction: "credit" | "debit";
  amountCents: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

async function currentBalanceCents(affiliateId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("affiliate_ledger" as any)
    .select("balance_after_cents")
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return Number((data as any)?.balance_after_cents ?? 0);
}

export async function writeLedger(entry: LedgerInput) {
  if (entry.amountCents <= 0) throw new Error("amountCents must be positive");
  const prev = await currentBalanceCents(entry.affiliateId);
  const delta = entry.direction === "credit" ? entry.amountCents : -entry.amountCents;
  const next = Math.max(0, prev + delta);
  const { data, error } = await supabaseAdmin
    .from("affiliate_ledger" as any)
    .insert({
      affiliate_id: entry.affiliateId,
      entry_type: entry.type,
      direction: entry.direction,
      amount_cents: entry.amountCents,
      balance_after_cents: next,
      reference_type: entry.referenceType ?? null,
      reference_id: entry.referenceId ?? null,
      description: entry.description ?? null,
      metadata: entry.metadata ?? {},
    })
    .select("id, balance_after_cents")
    .single();
  if (error) throw new Error(error.message);
  return { id: (data as any).id, balanceCents: next };
}

export async function getAffiliateBalance(affiliateId: string) {
  return currentBalanceCents(affiliateId);
}
