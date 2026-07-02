import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AffiliateShell } from "@/modules/affiliate/ui/AffiliateShell";
import { getPanelDashboard, getPanelLandingMetrics } from "@/modules/affiliate/panel.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { MousePointerClick, TrendingUp, ShoppingCart, Ticket, Wallet, Lock, CheckCircle2, ArrowRight, BarChart3 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/affiliate/dashboard")({
  component: Page,
  head: () => ({ meta: [{ title: "Painel do Afiliado — Dashboard" }] }),
});

const brl = (c: number) => `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

function Page() {
  return (
    <AffiliateShell>
      <Content />
    </AffiliateShell>
  );
}

function Content() {
  const fn = useServerFn(getPanelDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["aff-dashboard"], queryFn: () => fn(), refetchInterval: 60000 });

  if (isLoading) return <div className="text-muted-foreground">Carregando dashboard…</div>;
  if (!data) return <div>Sem dados.</div>;

  const s = data.summary;
  const f = data.funnel;

  const cards = [
    { label: "Cliques Hoje", value: String(s.clicksToday), icon: MousePointerClick, color: "text-blue-500" },
    { label: "Cliques Mês", value: String(s.clicksMonth), icon: MousePointerClick, color: "text-cyan-500" },
    { label: "Conversão", value: `${s.conversionRate.toFixed(2)}%`, icon: TrendingUp, color: "text-emerald-500" },
    { label: "Vendas", value: String(s.salesCount), icon: ShoppingCart, color: "text-violet-500" },
    { label: "Ticket Médio", value: brl(s.avgTicketCents), icon: Ticket, color: "text-amber-500" },
    { label: "Comissão Disponível", value: brl(s.availableCents), icon: Wallet, color: "text-gold" },
    { label: "Comissão Bloqueada", value: brl(s.blockedCents), icon: Lock, color: "text-orange-500" },
    { label: "Comissão Recebida", value: brl(s.paidCents), icon: CheckCircle2, color: "text-green-500" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-serif shimmer-text">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumo em tempo real das suas indicações e comissões.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="hover:border-gold/50 transition-colors">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">{c.label}</div>
                  <div className="text-xl md:text-2xl font-serif mt-1 truncate">{c.value}</div>
                </div>
                <c.icon className={`size-6 ${c.color} shrink-0`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Cliques & Vendas — últimos 30 dias</CardTitle>
            <CardDescription>Volume diário</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" hide />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line type="monotone" dataKey="clicks" stroke="hsl(210 90% 60%)" strokeWidth={2} dot={false} name="Cliques" />
                <Line type="monotone" dataKey="sales" stroke="hsl(45 90% 55%)" strokeWidth={2} dot={false} name="Vendas" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita diária</CardTitle>
            <CardDescription>Valor bruto de pedidos pagos</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" hide />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`} />
                <Bar dataKey="revenue" fill="hsl(45 90% 55%)" name="Receita" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funil de conversão</CardTitle>
          <CardDescription>Do clique à compra</CardDescription>
        </CardHeader>
        <CardContent>
          <Funnel steps={[
            { label: "Clique", value: f.clicks },
            { label: "Landing", value: f.landings || f.clicks },
            { label: "Checkout", value: f.checkouts },
            { label: "Compra", value: f.purchases },
          ]} />
        </CardContent>
      </Card>

      <LandingMetrics />



      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Últimas vendas</CardTitle>
            <CardDescription>8 pedidos mais recentes</CardDescription>
          </div>
          <Link to="/affiliate/financial" className="text-xs text-gold hover:underline flex items-center gap-1">Ver tudo <ArrowRight className="size-3" /></Link>
        </CardHeader>
        <CardContent>
          {data.recentSales.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Nenhuma venda ainda.</div>
          ) : (
            <div className="divide-y">
              {data.recentSales.map((o: any) => (
                <div key={o.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs">{o.order_ref}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.occurred_at).toLocaleString("pt-BR")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={o.status === "paid" ? "default" : "outline"}>{o.status}</Badge>
                    <div className="font-serif">{brl(o.amount_cents ?? 0)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  const colors = ["bg-blue-500", "bg-cyan-500", "bg-violet-500", "bg-gold"];
  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const pct = (s.value / max) * 100;
        return (
          <div key={s.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{s.label}</span>
              <span className="text-muted-foreground">{s.value.toLocaleString("pt-BR")}</span>
            </div>
            <div className="h-8 rounded-md bg-muted overflow-hidden">
              <div className={`h-full ${colors[i]} transition-all`} style={{ width: `${Math.max(pct, 4)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
