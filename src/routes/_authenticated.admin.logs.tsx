import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertTriangle,
  RefreshCw,
  Search,
  ShieldOff,
  Bug,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { checkIsAdmin, listServerFnLogs } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  component: ServerFnLogsPage,
  head: () => ({ meta: [{ title: "Diagnóstico — Server Functions" }] }),
});

const RANGE_OPTIONS = [
  { label: "Última hora", hours: 1 },
  { label: "Últimas 24h", hours: 24 },
  { label: "Últimos 7 dias", hours: 24 * 7 },
  { label: "Últimos 30 dias", hours: 24 * 30 },
];

function ServerFnLogsPage() {
  const isAdminFn = useServerFn(checkIsAdmin);
  const listLogs = useServerFn(listServerFnLogs);

  const [fnFilter, setFnFilter] = useState<string>("");
  const [hours, setHours] = useState<number>(24);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => isAdminFn(),
  });

  const logsQuery = useQuery({
    queryKey: ["serverfn-logs", fnFilter, hours],
    queryFn: () => listLogs({ data: { fn: fnFilter || undefined, hours, limit: 200 } }),
    enabled: !!roleData?.isAdmin,
    staleTime: 15_000,
  });

  if (roleLoading) {
    return <div className="text-muted-foreground">Carregando…</div>;
  }

  if (!roleData?.isAdmin) {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="size-5 text-destructive" />
            Acesso restrito
          </CardTitle>
          <CardDescription>
            Esta área de diagnóstico é exclusiva para administradores.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const logs = logsQuery.data?.logs ?? [];

  // Aggregate counts per fn
  const counts = logs.reduce<Record<string, number>>((acc, l) => {
    const k = l.fn ?? "(unknown)";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const topFns = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Admin</p>
          <h1 className="font-serif text-3xl lg:text-4xl mt-2 shimmer-text">
            Diagnóstico de Server Functions
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Erros capturados de <code className="text-gold">computeNatalChart</code> e demais
            server functions, correlacionados ao usuário que disparou.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => logsQuery.refetch()}
          disabled={logsQuery.isFetching}
          className="border-gold/40 text-gold hover:bg-gold/10"
        >
          {logsQuery.isFetching ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="size-4 mr-2" />
          )}
          Atualizar
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest text-gold">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Função</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={fnFilter}
                onChange={(e) => setFnFilter(e.target.value)}
                placeholder="Ex.: computeNatalChart"
                className="pl-9"
                maxLength={120}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Período</Label>
            <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.hours} value={String(o.hours)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <div className="rounded-lg border border-border bg-secondary/30 px-4 py-2 w-full">
              <div className="text-xs text-muted-foreground">Total no período</div>
              <div className="font-serif text-2xl text-gold">{logs.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {topFns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest text-gold">
              Top funções com erro
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {topFns.map(([fn, count]) => (
              <button
                key={fn}
                onClick={() => setFnFilter(fn)}
                className="text-left rounded-lg border border-border bg-secondary/30 p-3 hover:border-gold/40 transition-colors"
              >
                <div className="text-xs text-muted-foreground truncate">{fn}</div>
                <div className="font-serif text-xl text-stardust">{count} erros</div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest text-gold flex items-center gap-2">
            <Bug className="size-4" />
            Logs ({logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsQuery.isLoading ? (
            <div className="text-muted-foreground text-sm">Carregando logs…</div>
          ) : logs.length === 0 ? (
            <div className="rounded-lg border border-border bg-secondary/20 p-8 text-center text-sm text-muted-foreground">
              Nenhum erro registrado no período. 🎉
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="text-left py-2 pr-3">Quando</th>
                    <th className="text-left py-2 pr-3">Função</th>
                    <th className="text-left py-2 pr-3">Mensagem</th>
                    <th className="text-left py-2 pr-3">Usuário</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l: any) => {
                    const isOpen = expanded === l.id;
                    return (
                      <Fragment key={l.id}>
                        <tr
                          key={l.id}
                          className="border-b border-border/40 hover:bg-secondary/20 cursor-pointer"
                          onClick={() => setExpanded(isOpen ? null : l.id)}
                        >
                          <td className="py-2 pr-3 align-top whitespace-nowrap text-muted-foreground">
                            {new Date(l.created_at).toLocaleString("pt-BR")}
                          </td>
                          <td className="py-2 pr-3 align-top">
                            <code className="text-gold text-xs">{l.fn ?? "—"}</code>
                          </td>
                          <td className="py-2 pr-3 align-top text-destructive max-w-[480px] truncate">
                            <AlertTriangle className="inline size-3 mr-1" />
                            {l.message ?? "—"}
                          </td>
                          <td className="py-2 pr-3 align-top">
                            <div className="text-stardust">{l.user_name || "—"}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {l.user_email ?? l.user_id ?? "anônimo"}
                            </div>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr key={`${l.id}-d`} className="bg-secondary/10">
                            <td colSpan={4} className="p-4">
                              {l.stack && (
                                <pre className="text-[11px] text-muted-foreground bg-background/60 border border-border rounded p-3 overflow-x-auto whitespace-pre-wrap">
                                  {l.stack}
                                </pre>
                              )}
                              {l.extra && Object.keys(l.extra).length > 0 && (
                                <div className="mt-3">
                                  <div className="text-xs uppercase tracking-wider text-gold mb-1">
                                    Contexto
                                  </div>
                                  <pre className="text-[11px] text-stardust bg-background/60 border border-border rounded p-3 overflow-x-auto">
                                    {JSON.stringify(l.extra, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
