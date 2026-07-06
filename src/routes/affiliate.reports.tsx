import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AffiliateShell } from "@/modules/affiliate/ui/AffiliateShell";
import { getMyAffiliateReferrers } from "@/modules/affiliate/reports.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, ExternalLink, Download } from "lucide-react";

export const Route = createFileRoute("/affiliate/reports")({
  component: AffiliateReportsPage,
  head: () => ({
    meta: [
      { title: "Relatório de Tráfego — Affiliate Center" },
      { name: "description", content: "De onde vem o seu tráfego: sites e origens externas que enviam visitantes." },
    ],
  }),
});

const PERIODS = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
] as const;

function AffiliateReportsPage() {
  const [days, setDays] = useState<number>(30);
  const fetchFn = useServerFn(getMyAffiliateReferrers);
  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-referrers", days],
    queryFn: () => fetchFn({ data: { days } }),
  });

  function exportCSV() {
    if (!data) return;
    const rows = [
      ["Origem", "Cliques", "Visitantes únicos"],
      ...data.byReferrer.map((r) => [r.key, String(r.clicks), String(r.uniqueVisitors)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `referrers-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AffiliateShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif flex items-center gap-2">
              <BarChart3 className="size-6 text-gold" /> Relatório de Tráfego
            </h1>
            <p className="text-sm text-muted-foreground">
              De onde vem o tráfego: sites e origens externas que enviaram visitantes ao seu link.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {PERIODS.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant={days === p.value ? "default" : "outline"}
                onClick={() => setDays(p.value)}
              >
                {p.label}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={exportCSV} disabled={!data}>
              <Download className="size-4 mr-1" /> CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Cliques totais" value={data?.totals.clicks ?? 0} loading={isLoading} />
          <StatCard label="Visitantes únicos" value={data?.totals.uniqueVisitors ?? 0} loading={isLoading} />
          <StatCard label="Com referrer" value={data?.totals.referredClicks ?? 0} loading={isLoading} />
          <StatCard label="Diretos / sem referrer" value={data?.totals.directClicks ?? 0} loading={isLoading} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Categorias de origem</CardTitle>
            <CardDescription>Agrupamento por tipo (busca, redes sociais, mensageiros, email, direto).</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando…</div>
            ) : (data?.byCategory ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">Sem dados no período selecionado.</div>
            ) : (
              <div className="space-y-2">
                {data!.byCategory.map((c) => {
                  const pct = data!.totals.clicks > 0 ? (c.clicks / data!.totals.clicks) * 100 : 0;
                  return (
                    <div key={c.key}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{c.key}</span>
                        <span className="text-muted-foreground">
                          {c.clicks} cliques · {c.uniqueVisitors} visitantes · {pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded mt-1">
                        <div className="h-2 bg-gold rounded" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sites/origens externas (referrers)</CardTitle>
            <CardDescription>
              Domínios que enviaram visitantes ao seu link de afiliado. "(direto)" = acesso sem referrer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando…</div>
            ) : (data?.byReferrer ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum referrer registrado no período.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origem</TableHead>
                      <TableHead className="text-right">Cliques</TableHead>
                      <TableHead className="text-right">Visitantes únicos</TableHead>
                      <TableHead className="text-right">% do total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data!.byReferrer.map((r) => {
                      const pct = data!.totals.clicks > 0 ? (r.clicks / data!.totals.clicks) * 100 : 0;
                      const isDirect = r.key === "(direto)" || r.key === "(desconhecido)";
                      return (
                        <TableRow key={r.key}>
                          <TableCell className="font-medium">
                            {isDirect ? <Badge variant="outline">{r.key}</Badge> : r.key}
                          </TableCell>
                          <TableCell className="text-right">{r.clicks}</TableCell>
                          <TableCell className="text-right">{r.uniqueVisitors}</TableCell>
                          <TableCell className="text-right">{pct.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">
                            {!isDirect && (
                              <a
                                href={`https://${r.key}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gold hover:underline inline-flex items-center gap-1 text-xs"
                              >
                                Abrir <ExternalLink className="size-3" />
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AffiliateShell>
  );
}

function StatCard({ label, value, loading }: { label: string; value: number; loading?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl font-serif mt-1">{loading ? "…" : value.toLocaleString("pt-BR")}</div>
      </CardContent>
    </Card>
  );
}
