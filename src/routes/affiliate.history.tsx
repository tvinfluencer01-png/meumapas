import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AffiliateShell } from "@/modules/affiliate/ui/AffiliateShell";
import { getPanelFinancial } from "@/modules/affiliate/panel.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/affiliate/history")({
  component: Page,
  head: () => ({ meta: [{ title: "Histórico — Affiliate Center" }] }),
});

const brl = (c: number) => `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

function Page() { return <AffiliateShell><Content /></AffiliateShell>; }

function Content() {
  const fn = useServerFn(getPanelFinancial);
  const { data } = useQuery({ queryKey: ["aff-financial"], queryFn: () => fn() });

  const events: Array<{ date: string; type: string; description: string; amount?: number; status?: string }> = [];
  (data?.commissions ?? []).forEach((c: any) => {
    events.push({ date: c.created_at, type: "Comissão", description: `Comissão gerada`, amount: c.amount_cents, status: c.status });
  });
  (data?.withdraws ?? []).forEach((w: any) => {
    events.push({ date: w.created_at, type: "Saque", description: `Solicitação via ${w.method}`, amount: w.amount_cents, status: w.status });
  });
  events.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-serif shimmer-text">Histórico</h1>
        <p className="text-sm text-muted-foreground">Timeline consolidada de comissões e saques.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Eventos</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{new Date(e.date).toLocaleString("pt-BR")}</TableCell>
                  <TableCell><Badge variant="outline">{e.type}</Badge></TableCell>
                  <TableCell className="text-sm">{e.description}</TableCell>
                  <TableCell className="font-mono">{e.amount ? brl(e.amount) : "-"}</TableCell>
                  <TableCell>{e.status && <Badge variant={e.status === "paid" ? "default" : "outline"}>{e.status}</Badge>}</TableCell>
                </TableRow>
              ))}
              {events.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Nenhum evento ainda</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
