import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AffiliateShell } from "@/modules/affiliate/ui/AffiliateShell";
import { getPanelFinancial } from "@/modules/affiliate/panel.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";
import { toneByIndex, toneRow } from "@/lib/kpi-tones";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/affiliate/financial")({
  component: Page,
  head: () => ({ meta: [{ title: "Financeiro — Affiliate Center" }] }),
});

const brl = (c: number) => `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

function Page() { return <AffiliateShell><Content /></AffiliateShell>; }

function Content() {
  const fn = useServerFn(getPanelFinancial);
  const { data } = useQuery({ queryKey: ["aff-financial"], queryFn: () => fn() });
  const commissions = (data?.commissions ?? []) as any[];
  const withdraws = (data?.withdraws ?? []) as any[];
  const now = new Date().toISOString();

  const available = commissions.filter((c) => c.status === "pending" && (!c.available_at || c.available_at <= now)).reduce((s, c) => s + (c.amount_cents ?? 0), 0);
  const blocked = commissions.filter((c) => c.status === "pending" && c.available_at && c.available_at > now).reduce((s, c) => s + (c.amount_cents ?? 0), 0);
  const paid = commissions.filter((c) => c.status === "paid").reduce((s, c) => s + (c.amount_cents ?? 0), 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-serif shimmer-text">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Acompanhe suas comissões e saques.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <GradientStatCard label="Disponível" value={brl(available)} tone="emerald" />
        <GradientStatCard label="Bloqueado" value={brl(blocked)} tone="amber" />
        <GradientStatCard label="Recebido" value={brl(paid)} tone="indigo" />
      </div>

      <Tabs defaultValue="commissions">
        <TabsList>
          <TabsTrigger value="commissions">Comissões</TabsTrigger>
          <TabsTrigger value="withdraws">Saques</TabsTrigger>
        </TabsList>
        <TabsContent value="commissions">
          <Card>
            <CardHeader><CardTitle>Comissões</CardTitle><CardDescription>Últimas 100 comissões</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Taxa</TableHead>
                    <TableHead>Disponível em</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((c, i) => (
                    <TableRow key={c.id} className={`border-l-[3px] ${toneRow(toneByIndex(i))}`}>
                      <TableCell className="text-xs">{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-mono">{brl(c.amount_cents)}</TableCell>
                      <TableCell>{c.rate ? `${(Number(c.rate) * 100).toFixed(1)}%` : "-"}</TableCell>
                      <TableCell className="text-xs">{c.available_at ? new Date(c.available_at).toLocaleDateString("pt-BR") : "-"}</TableCell>
                      <TableCell><Badge variant={c.status === "paid" ? "default" : "outline"}>{c.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {commissions.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sem comissões</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="withdraws">
          <Card>
            <CardHeader><CardTitle>Saques</CardTitle><CardDescription>Suas solicitações</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Solicitação</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdraws.map((w, i) => (
                    <TableRow key={w.id} className={`border-l-[3px] ${toneRow(toneByIndex(i))}`}>
                      <TableCell className="text-xs">{new Date(w.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="font-mono">{brl(w.amount_cents)}</TableCell>
                      <TableCell className="uppercase text-xs">{w.method}</TableCell>
                      <TableCell><Badge variant={w.status === "paid" ? "default" : "outline"}>{w.status}</Badge></TableCell>
                      <TableCell className="text-xs">{w.processed_at ? new Date(w.processed_at).toLocaleString("pt-BR") : "-"}</TableCell>
                    </TableRow>
                  ))}
                  {withdraws.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhum saque</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
