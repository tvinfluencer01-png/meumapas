// Painel de Monetização (FASE 4B) — gateways de checkout, overrides de
// comissão, tiers escalonadas, lotes de pagamento e livro-razão.
// Renderizado como sub-seções dentro do AdminAffiliatePanel.

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listCheckoutProviders, upsertCheckoutProvider,
  listCommissionOverrides, upsertCommissionOverride, deleteCommissionOverride,
  listCommissionTiers, upsertCommissionTier,
  listPayoutBatches, createPayoutBatchFn, markBatchItemPaidFn, closeBatchFn,
  getAffiliateLedger,
} from "../monetization.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CreditCard, Layers, Percent, Banknote, BookOpen, Plus } from "lucide-react";
import { toast } from "sonner";

const money = (c: number) => `R$ ${(Number(c ?? 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// ── Gateways de Checkout ──────────────────────────────────────
export function CheckoutProvidersSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCheckoutProviders);
  const upsertFn = useServerFn(upsertCheckoutProvider);
  const { data, isLoading } = useQuery({ queryKey: ["mon-providers"], queryFn: () => listFn() });
  const mut = useMutation({
    mutationFn: (v: any) => upsertFn({ data: v }),
    onSuccess: () => { toast.success("Gateway salvo"); qc.invalidateQueries({ queryKey: ["mon-providers"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (data as any[]) ?? [];
  const providers = ["mercadopago", "paypal"] as const;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <CreditCard className="size-5 text-gold" />
        <h2 className="text-xl font-serif">Gateways de Checkout</h2>
      </header>
      {isLoading ? <Loader2 className="animate-spin" /> : providers.map((p) => {
        const existing = rows.find((r) => r.provider === p);
        return <ProviderCard key={p} provider={p} existing={existing} onSave={(v) => mut.mutate({ ...v, provider: p })} />;
      })}
    </div>
  );
}

function ProviderCard({ provider, existing, onSave }: { provider: "mercadopago"|"paypal"; existing: any; onSave: (v: any) => void }) {
  const [enabled, setEnabled] = useState(existing?.enabled ?? false);
  const [sandbox, setSandbox] = useState(existing?.sandbox ?? true);
  const [label, setLabel] = useState(existing?.label ?? (provider === "mercadopago" ? "Mercado Pago" : "PayPal"));
  const [creds, setCreds] = useState(JSON.stringify(existing?.credentials ?? (provider === "mercadopago" ? { access_token: "" } : { client_id: "", client_secret: "" }), null, 2));
  const [feePct, setFeePct] = useState(existing?.fee_percent ?? 0);
  const [feeFix, setFeeFix] = useState(existing?.fee_fixed_cents ?? 0);
  const [webhookSecret, setWebhookSecret] = useState(existing?.webhook_secret ?? "");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <span>{label}</span>
          <div className="flex items-center gap-3 text-xs font-normal">
            <span className="flex items-center gap-2">Sandbox<Switch checked={sandbox} onCheckedChange={setSandbox} /></span>
            <span className="flex items-center gap-2">Ativo<Switch checked={enabled} onCheckedChange={setEnabled} /></span>
          </div>
        </CardTitle>
        <CardDescription>{provider === "mercadopago" ? "Access Token do Mercado Pago" : "Client ID + Secret PayPal"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Rótulo</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
          <div><Label>Webhook secret (opcional)</Label><Input value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} /></div>
          <div><Label>Taxa (%)</Label><Input type="number" step="0.01" value={feePct} onChange={(e) => setFeePct(Number(e.target.value))} /></div>
          <div><Label>Taxa fixa (centavos)</Label><Input type="number" value={feeFix} onChange={(e) => setFeeFix(Number(e.target.value))} /></div>
        </div>
        <div>
          <Label>Credenciais (JSON)</Label>
          <Textarea rows={4} value={creds} onChange={(e) => setCreds(e.target.value)} className="font-mono text-xs" />
        </div>
        <Button onClick={() => {
          try {
            onSave({ label, enabled, sandbox, credentials: JSON.parse(creds), fee_percent: feePct, fee_fixed_cents: feeFix, webhook_secret: webhookSecret || null, currency: "BRL" });
          } catch { toast.error("JSON de credenciais inválido"); }
        }}>Salvar</Button>
      </CardContent>
    </Card>
  );
}

// ── Overrides de Comissão ─────────────────────────────────────
export function CommissionOverridesSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCommissionOverrides);
  const upsertFn = useServerFn(upsertCommissionOverride);
  const delFn = useServerFn(deleteCommissionOverride);
  const { data } = useQuery({ queryKey: ["mon-overrides"], queryFn: () => listFn() });
  const [form, setForm] = useState<any>({ scope: "global", kind: "one_time", rate_percent: 20, priority: 100, active: true });

  const save = useMutation({
    mutationFn: () => upsertFn({ data: form }),
    onSuccess: () => { toast.success("Override salvo"); qc.invalidateQueries({ queryKey: ["mon-overrides"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["mon-overrides"] }); },
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2"><Percent className="size-5 text-gold" /><h2 className="text-xl font-serif">Overrides de Comissão</h2></header>

      <Card>
        <CardHeader><CardTitle className="text-base">Novo override</CardTitle>
          <CardDescription>Regras específicas (vitalícia, primeira compra, recorrente) por afiliado e/ou produto</CardDescription></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3">
          <div><Label>Escopo</Label>
            <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="affiliate">Afiliado</SelectItem>
                <SelectItem value="product">Produto</SelectItem>
                <SelectItem value="affiliate_product">Afiliado + Produto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Tipo</Label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">Única</SelectItem>
                <SelectItem value="first_purchase">Primeira compra</SelectItem>
                <SelectItem value="recurring">Recorrente</SelectItem>
                <SelectItem value="lifetime">Vitalícia</SelectItem>
                <SelectItem value="tiered">Escalonada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Prioridade</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} /></div>
          <div><Label>Taxa (%)</Label><Input type="number" step="0.01" value={form.rate_percent ?? ""} onChange={(e) => setForm({ ...form, rate_percent: e.target.value ? Number(e.target.value) : null })} /></div>
          <div><Label>Valor fixo (centavos)</Label><Input type="number" value={form.amount_cents ?? ""} onChange={(e) => setForm({ ...form, amount_cents: e.target.value ? Number(e.target.value) : null })} /></div>
          <div><Label>Limite recorrência</Label><Input type="number" value={form.recurrence_limit ?? ""} onChange={(e) => setForm({ ...form, recurrence_limit: e.target.value ? Number(e.target.value) : null })} /></div>
          <div><Label>ID afiliado (UUID)</Label><Input value={form.affiliate_id ?? ""} onChange={(e) => setForm({ ...form, affiliate_id: e.target.value || null })} /></div>
          <div><Label>ID produto (UUID)</Label><Input value={form.product_id ?? ""} onChange={(e) => setForm({ ...form, product_id: e.target.value || null })} /></div>
          <div className="flex items-end"><Button onClick={() => save.mutate()} disabled={save.isPending}><Plus className="size-4 mr-1" /> Salvar</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Overrides ativos</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {((data as any[]) ?? []).map((o) => (
              <div key={o.id} className="flex items-center justify-between p-2 border rounded text-sm">
                <div>
                  <Badge variant="outline">{o.scope}</Badge> <Badge>{o.kind}</Badge>
                  <span className="ml-2">
                    {o.rate_percent != null ? `${o.rate_percent}%` : money(o.amount_cents ?? 0)}
                  </span>
                  {o.affiliate_id && <span className="text-xs text-muted-foreground ml-2">aff:{o.affiliate_id.slice(0, 8)}</span>}
                  {o.product_id && <span className="text-xs text-muted-foreground ml-2">prod:{o.product_id.slice(0, 8)}</span>}
                </div>
                <Button size="sm" variant="destructive" onClick={() => del.mutate(o.id)}>Excluir</Button>
              </div>
            ))}
            {(!data || (data as any[]).length === 0) && <p className="text-sm text-muted-foreground">Nenhum override cadastrado.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tiers escalonadas ─────────────────────────────────────────
export function CommissionTiersSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCommissionTiers);
  const upsertFn = useServerFn(upsertCommissionTier);
  const { data } = useQuery({ queryKey: ["mon-tiers"], queryFn: () => listFn() });
  const [form, setForm] = useState<any>({ min_volume_cents: 0, rate_percent: 20, period: "month", priority: 0, active: true });
  const save = useMutation({
    mutationFn: () => upsertFn({ data: form }),
    onSuccess: () => { toast.success("Tier salva"); qc.invalidateQueries({ queryKey: ["mon-tiers"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2"><Layers className="size-5 text-gold" /><h2 className="text-xl font-serif">Faixas Escalonadas</h2></header>
      <Card>
        <CardHeader><CardTitle className="text-base">Nova faixa</CardTitle>
          <CardDescription>Comissão diferente conforme o volume vendido no período</CardDescription></CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-3">
          <div><Label>Volume mínimo (centavos)</Label><Input type="number" value={form.min_volume_cents} onChange={(e) => setForm({ ...form, min_volume_cents: Number(e.target.value) })} /></div>
          <div><Label>Volume máximo (centavos)</Label><Input type="number" value={form.max_volume_cents ?? ""} onChange={(e) => setForm({ ...form, max_volume_cents: e.target.value ? Number(e.target.value) : null })} /></div>
          <div><Label>Taxa (%)</Label><Input type="number" step="0.01" value={form.rate_percent ?? ""} onChange={(e) => setForm({ ...form, rate_percent: e.target.value ? Number(e.target.value) : null })} /></div>
          <div><Label>Período</Label>
            <Select value={form.period} onValueChange={(v) => setForm({ ...form, period: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Mensal</SelectItem>
                <SelectItem value="quarter">Trimestral</SelectItem>
                <SelectItem value="year">Anual</SelectItem>
                <SelectItem value="lifetime">Vitalício</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-4"><Button onClick={() => save.mutate()} disabled={save.isPending}><Plus className="size-4 mr-1" /> Salvar faixa</Button></div>
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle className="text-base">Faixas ativas</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {((data as any[]) ?? []).map((t) => (
              <div key={t.id} className="p-2 border rounded text-sm flex justify-between">
                <span>{money(t.min_volume_cents)} — {t.max_volume_cents ? money(t.max_volume_cents) : "∞"} · <strong>{t.rate_percent}%</strong> · {t.period}</span>
                <Badge variant={t.active ? "default" : "outline"}>{t.active ? "Ativa" : "Inativa"}</Badge>
              </div>
            ))}
            {(!data || (data as any[]).length === 0) && <p className="text-sm text-muted-foreground">Nenhuma faixa cadastrada.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Lotes de Pagamento ────────────────────────────────────────
export function PayoutBatchesSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPayoutBatches);
  const createFn = useServerFn(createPayoutBatchFn);
  const closeFn = useServerFn(closeBatchFn);
  const { data } = useQuery({ queryKey: ["mon-batches"], queryFn: () => listFn() });
  const [method, setMethod] = useState<"pix"|"ted"|"manual">("pix");
  const create = useMutation({
    mutationFn: () => createFn({ data: { method } }),
    onSuccess: (r: any) => { toast.success(`Lote ${r.batchCode} criado (${r.count} itens)`); qc.invalidateQueries({ queryKey: ["mon-batches"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const close = useMutation({
    mutationFn: (id: string) => closeFn({ data: { batchId: id } }),
    onSuccess: () => { toast.success("Lote fechado"); qc.invalidateQueries({ queryKey: ["mon-batches"] }); },
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2"><Banknote className="size-5 text-gold" /><h2 className="text-xl font-serif">Lotes de Pagamento</h2></header>
      <Card>
        <CardHeader><CardTitle className="text-base">Criar lote</CardTitle>
          <CardDescription>Consolida saques aprovados no método selecionado</CardDescription></CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="w-40">
            <Label>Método</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="ted">TED</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>Gerar lote</Button>
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {((data as any[]) ?? []).map((b) => (
              <div key={b.id} className="p-3 border rounded flex justify-between items-center text-sm">
                <div>
                  <div className="font-mono">{b.batch_code}</div>
                  <div className="text-xs text-muted-foreground">{b.method.toUpperCase()} · {b.items_count} itens · total {money(b.total_cents)} · taxa {money(b.fee_cents)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{b.status}</Badge>
                  {b.status !== "completed" && b.status !== "canceled" && (
                    <Button size="sm" variant="outline" onClick={() => close.mutate(b.id)}>Fechar</Button>
                  )}
                </div>
              </div>
            ))}
            {(!data || (data as any[]).length === 0) && <p className="text-sm text-muted-foreground">Nenhum lote gerado.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Livro-razão / Extrato ─────────────────────────────────────
export function LedgerSection() {
  const [affId, setAffId] = useState("");
  const ledgerFn = useServerFn(getAffiliateLedger);
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["mon-ledger", affId],
    queryFn: () => ledgerFn({ data: { affiliateId: affId || undefined, limit: 200 } }),
    enabled: false,
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2"><BookOpen className="size-5 text-gold" /><h2 className="text-xl font-serif">Livro-razão</h2></header>
      <Card>
        <CardContent className="pt-4 flex gap-2 items-end">
          <div className="flex-1"><Label>ID do afiliado (deixe vazio p/ o próprio)</Label>
            <Input value={affId} onChange={(e) => setAffId(e.target.value)} placeholder="UUID" />
          </div>
          <Button onClick={() => refetch()} disabled={isFetching}>{isFetching ? <Loader2 className="size-4 animate-spin" /> : "Carregar"}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-1">
            {((data as any[]) ?? []).map((r) => (
              <div key={r.id} className="flex justify-between text-xs p-2 border rounded">
                <div className="flex-1">
                  <Badge variant="outline" className="mr-2">{r.entry_type}</Badge>
                  <span className={r.direction === "credit" ? "text-green-500" : "text-red-500"}>
                    {r.direction === "credit" ? "+" : "-"}{money(r.amount_cents)}
                  </span>
                  <span className="ml-2 text-muted-foreground">{r.description ?? ""}</span>
                </div>
                <div className="text-muted-foreground">saldo: {money(r.balance_after_cents)}</div>
                <div className="text-muted-foreground ml-3">{new Date(r.created_at).toLocaleString("pt-BR")}</div>
              </div>
            ))}
            {(!data || (data as any[]).length === 0) && <p className="text-sm text-muted-foreground">Carregue um extrato para visualizar.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
