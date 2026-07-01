import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AffiliateShell } from "@/modules/affiliate/ui/AffiliateShell";
import { getPanelFinancial, getPaymentMethods, requestWithdraw } from "@/modules/affiliate/panel.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HandCoins } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/affiliate/withdraw")({
  component: Page,
  head: () => ({ meta: [{ title: "Solicitar Saque — Affiliate Center" }] }),
});

const brl = (c: number) => `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

function Page() { return <AffiliateShell><Content /></AffiliateShell>; }

function Content() {
  const qc = useQueryClient();
  const finFn = useServerFn(getPanelFinancial);
  const payFn = useServerFn(getPaymentMethods);
  const reqFn = useServerFn(requestWithdraw);
  const { data: fin } = useQuery({ queryKey: ["aff-financial"], queryFn: () => finFn() });
  const { data: pay } = useQuery({ queryKey: ["aff-payments"], queryFn: () => payFn() });

  const now = new Date().toISOString();
  const available = (fin?.commissions ?? []).filter((c: any) => c.status === "pending" && (!c.available_at || c.available_at <= now)).reduce((s: number, c: any) => s + (c.amount_cents ?? 0), 0);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"pix" | "bank">("pix");
  const [pixId, setPixId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: () => reqFn({
      data: {
        amountCents: Math.round(Number(amount.replace(",", ".")) * 100),
        method,
        pixKeyId: method === "pix" ? pixId || undefined : undefined,
        bankAccountId: method === "bank" ? (pay?.bank as any)?.id : undefined,
        notes: notes || undefined,
      } as any,
    }),
    onSuccess: () => {
      toast.success("Solicitação de saque enviada!");
      qc.invalidateQueries({ queryKey: ["aff-financial"] });
      setAmount(""); setNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-serif shimmer-text">Solicitar Saque</h1>
        <p className="text-sm text-muted-foreground">Saldo disponível: <strong className="text-gold">{brl(available)}</strong></p>
      </header>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><HandCoins className="size-5 text-gold" /> Nova solicitação</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Valor (R$)</Label>
              <Input inputMode="decimal" placeholder="100,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Método</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="bank">Conta Bancária</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {method === "pix" ? (
            <div>
              <Label>Chave PIX</Label>
              {(pay?.pix ?? []).length === 0 ? (
                <div className="text-xs text-muted-foreground py-2">
                  Nenhuma chave PIX cadastrada. <Link to="/affiliate/account" className="text-gold underline">Cadastrar</Link>
                </div>
              ) : (
                <Select value={pixId} onValueChange={setPixId}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma chave" /></SelectTrigger>
                  <SelectContent>
                    {(pay?.pix ?? []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.key_type.toUpperCase()} — {p.key_value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              {pay?.bank
                ? <>Banco: <strong>{(pay.bank as any).bank_name}</strong> — Ag. {(pay.bank as any).branch} / CC {(pay.bank as any).account_number}</>
                : <>Nenhuma conta bancária cadastrada. <Link to="/affiliate/account" className="text-gold underline">Cadastrar</Link></>}
            </div>
          )}

          <div>
            <Label>Observações (opcional)</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !amount || (method === "pix" && !pixId) || (method === "bank" && !pay?.bank)}
          >
            {mut.isPending ? "Enviando..." : "Solicitar saque"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
