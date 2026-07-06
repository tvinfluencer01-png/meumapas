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
      { name: "description", content: "De onde vem o seu tráfego: sites, UTMs, países, cidades, dispositivos." },
    ],
  }),
});

const PERIODS = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
] as const;

type Row = { key: string; clicks: number; uniqueVisitors: number };

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
              Sites, UTMs, geografia e dispositivos que enviaram visitantes ao seu link.
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

        <BarBreakdown
          title="Categorias de origem"
          desc="Agrupamento por tipo (busca, redes sociais, mensageiros, email, direto)."
          rows={data?.byCategory ?? []}
          total={data?.totals.clicks ?? 0}
          loading={isLoading}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <BarBreakdown title="UTM Source" rows={data?.byUtmSource ?? []} total={data?.totals.clicks ?? 0} loading={isLoading} compact />
          <BarBreakdown title="UTM Medium" rows={data?.byUtmMedium ?? []} total={data?.totals.clicks ?? 0} loading={isLoading} compact />
          <BarBreakdown title="UTM Campaign" rows={data?.byUtmCampaign ?? []} total={data?.totals.clicks ?? 0} loading={isLoading} compact />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <BarBreakdown title="Países" rows={data?.byCountry ?? []} total={data?.totals.clicks ?? 0} loading={isLoading} compact />
          <BarBreakdown title="Cidades" rows={data?.byCity ?? []} total={data?.totals.clicks ?? 0} loading={isLoading} compact />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <BarBreakdown title="Dispositivo" rows={data?.byDevice ?? []} total={data?.totals.clicks ?? 0} loading={isLoading} compact />
          <BarBreakdown title="Sistema" rows={data?.byOs ?? []} total={data?.totals.clicks ?? 0} loading={isLoading} compact />
          <BarBreakdown title="Navegador" rows={data?.byBrowser ?? []} total={data?.totals.clicks ?? 0} loading={isLoading} compact />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução diária</CardTitle>
            <CardDescription>Cliques por dia no período selecionado.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando…</div>
            ) : (data?.daily ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">Sem dados no período.</div>
            ) : (
              <DailyChart daily={data!.daily} />
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

function BarBreakdown({
  title,
  desc,
  rows,
  total,
  loading,
  compact,
}: {
  title: string;
  desc?: string;
  rows: Row[];
  total: number;
  loading?: boolean;
  compact?: boolean;
}) {
  const shown = compact ? rows.slice(0, 8) : rows;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {desc && <CardDescription>{desc}</CardDescription>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : shown.length === 0 ? (
          <div className="text-sm text-muted-foreground">Sem dados.</div>
        ) : (
          <div className="space-y-2">
            {shown.map((c) => {
              const pct = total > 0 ? (c.clicks / total) * 100 : 0;
              return (
                <div key={c.key}>
                  <div className="flex items-center justify-between text-sm gap-2">
                    <span className="font-medium truncate">{c.key}</span>
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      {c.clicks} · {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded mt-1">
                    <div className="h-1.5 bg-gold rounded" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DailyChart({ daily }: { daily: { date: string; clicks: number; referredClicks: number }[] }) {
  const max = Math.max(1, ...daily.map((d) => d.clicks));
  return (
    <div className="flex items-end gap-1 h-40">
      {daily.map((d) => {
        const h = (d.clicks / max) * 100;
        const hr = (d.referredClicks / max) * 100;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.clicks} cliques (${d.referredClicks} c/ referrer)`}>
            <div className="w-full relative bg-muted rounded" style={{ height: "100%" }}>
              <div className="absolute bottom-0 left-0 right-0 bg-gold/30 rounded" style={{ height: `${h}%` }} />
              <div className="absolute bottom-0 left-0 right-0 bg-gold rounded" style={{ height: `${hr}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground truncate w-full text-center">{d.date.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}
