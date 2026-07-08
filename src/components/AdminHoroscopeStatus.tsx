import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Clock, RefreshCw, Send, Sparkles, ShieldAlert, ShieldCheck, Radio } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getHoroscopeStatus } from "@/lib/horoscope-status.functions";

function fmt(ts: string | null) {
  if (!ts) return "—";
  try { return new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" }); }
  catch { return ts; }
}

export function AdminHoroscopeStatus() {
  const fn = useServerFn(getHoroscopeStatus);
  const queryKey = ["admin-horoscope-status"] as const;
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, refetch, error, dataUpdatedAt } = useQuery({
    queryKey,
    queryFn: () => fn(),
    refetchOnWindowFocus: true,
  });
  const [realtimeReady, setRealtimeReady] = useState(false);

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const invalidate = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 400);
    };
    const channel = supabase
      .channel("admin-horoscope-status")
      .on("postgres_changes", { event: "*", schema: "public", table: "horoscope_log" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "horoscope_subscriptions" }, invalidate)
      .subscribe((status) => {
        setRealtimeReady(status === "SUBSCRIBED");
      });
    return () => {
      if (debounce) clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalUsers = data?.users.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const pagedUsers = useMemo(
    () => (data?.users ?? []).slice((page - 1) * pageSize, page * pageSize),
    [data, page]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-gold" /> Horóscopo Diário — Status
            </CardTitle>
            <CardDescription>
              Última execução do cron e entregas do dia por usuário assinante.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={realtimeReady ? "border-emerald-500/40 text-emerald-300 gap-1" : "text-muted-foreground gap-1"} title={realtimeReady ? "Atualizações em tempo real ativas" : "Conectando ao tempo real…"}>
              <Radio className={`size-3 ${realtimeReady ? "animate-pulse" : ""}`} />
              {realtimeReady ? "tempo real" : "conectando"}
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline" title="Atualiza automaticamente via Realtime">
              {isFetching ? "atualizando…" : dataUpdatedAt ? `atualizado ${fmt(new Date(dataUpdatedAt).toISOString())}` : ""}
            </span>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
          {error && <div className="text-sm text-destructive">Erro: {(error as Error).message}</div>}

          {data && (
            <>
              <div className="rounded-lg border border-border bg-card/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="size-4 text-gold" /> Última execução do cron
                </div>
                {data.lastCronRun ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div><div className="text-muted-foreground">Início</div>{fmt(data.lastCronRun.started)}</div>
                    <div><div className="text-muted-foreground">Fim</div>{fmt(data.lastCronRun.ended)}</div>
                    <div>
                      <div className="text-muted-foreground">Status</div>
                      {data.lastCronRun.status === "succeeded" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 gap-1"><CheckCircle2 className="size-3" />succeeded</Badge>
                      ) : data.lastCronRun.status === "failed" ? (
                        <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1"><AlertTriangle className="size-3" />failed</Badge>
                      ) : (
                        <Badge variant="outline">{data.lastCronRun.status ?? "—"}</Badge>
                      )}
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <div className="text-muted-foreground">Mensagem</div>
                      <div className="truncate" title={data.lastCronRun.message ?? ""}>{data.lastCronRun.message ?? "—"}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Cron do horóscopo não encontrado.</div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-card/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {data.providers.whatsappReady ? (
                    <ShieldCheck className="size-4 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="size-4 text-amber-400" />
                  )}
                  Provedores de envio
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className={data.providers.evolutionReady ? "border-emerald-500/40 text-emerald-300" : "text-muted-foreground"}>
                    Evolution: {data.providers.evolutionReady ? "OK" : "não configurado"}
                  </Badge>
                  <Badge variant="outline" className={data.providers.twilioReady ? "border-emerald-500/40 text-emerald-300" : "text-muted-foreground"}>
                    Twilio: {data.providers.twilioReady ? "OK" : "não configurado"}
                  </Badge>
                  <Badge variant="outline" className={data.providers.emailReady ? "border-emerald-500/40 text-emerald-300" : "text-muted-foreground"}>
                    Email: {data.providers.emailReady ? "OK" : "não configurado"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <StatCard label="Assinantes" value={data.totals.subscribers} icon={<Send className="size-4 text-gold" />} />
                <StatCard label="Prontos" value={data.totals.ready} tone="emerald" />
                <StatCard label="Com pendências" value={data.totals.notReady} tone="amber" />
                <StatCard label="Entregues hoje" value={data.totals.delivered} tone="emerald" />
                <StatCard label="Erros" value={data.totals.errors} tone="destructive" />
              </div>

              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Usuário</th>
                      <th className="px-3 py-2 font-medium text-center">Pronto?</th>
                      <th className="px-3 py-2 font-medium">Freq.</th>
                      <th className="px-3 py-2 font-medium">Último envio</th>
                      <th className="px-3 py-2 font-medium text-center">Entregues</th>
                      <th className="px-3 py-2 font-medium text-center">Erros</th>
                      <th className="px-3 py-2 font-medium text-center">Status</th>
                      <th className="px-3 py-2 font-medium">Pendências / Detalhe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.length === 0 && (
                      <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Sem assinantes.</td></tr>
                    )}
                    {pagedUsers.map((u) => (
                      <tr key={u.user_id} className="border-t border-border">
                        <td className="px-3 py-2">
                          <div className="font-medium">{u.full_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{u.email ?? "—"}</div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {u.ready ? (
                            <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 gap-1"><ShieldCheck className="size-3" />pronto</Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 gap-1" title={u.issues.join(" · ")}>
                              <ShieldAlert className="size-3" />{u.issues.length} pend.
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{u.frequency}</td>
                        <td className="px-3 py-2 text-muted-foreground">{u.last_sent_on ?? "—"}</td>
                        <td className="px-3 py-2 text-center">{u.delivered_today}</td>
                        <td className="px-3 py-2 text-center">{u.errors_today}</td>
                        <td className="px-3 py-2 text-center">
                          {!u.enabled ? (
                            <Badge variant="outline">desativado</Badge>
                          ) : u.errors_today > 0 ? (
                            <Badge className="bg-destructive/15 text-destructive border-destructive/30">erro</Badge>
                          ) : u.delivered_today > 0 ? (
                            <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">entregue</Badge>
                          ) : u.pending ? (
                            <Badge
                              className="bg-amber-500/15 text-amber-300 border-amber-500/30"
                              title={u.pending_reason ?? "Aguardando processamento"}
                            >
                              pendente
                            </Badge>
                          ) : (
                            <Badge variant="outline">—</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground max-w-[320px]">
                          {u.issues.length > 0 ? (
                            <span className="text-amber-300" title={u.issues.join(" · ")}>{u.issues.join(" · ")}</span>
                          ) : u.pending && u.pending_reason ? (
                            <span className="text-amber-300/90" title={u.pending_reason}>{u.pending_reason}</span>
                          ) : (
                            <span className="truncate block" title={u.last_detail ?? ""}>{u.last_detail ?? "—"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalUsers > 0 && (
                <div className="flex flex-col gap-3 pt-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    Mostrando {(page - 1) * pageSize + 1}
                    –{Math.min(page * pageSize, totalUsers)} de {totalUsers}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                      Anterior
                    </Button>
                    <span>Página {page} de {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone, icon }: { label: string; value: number; tone?: "emerald" | "amber" | "destructive"; icon?: React.ReactNode }) {
  const t = tone === "destructive" ? "rose" : tone === "amber" ? "amber" : tone === "emerald" ? "emerald" : "sky";
  return <GradientStatCard label={label} value={value} tone={t} icon={icon ? () => <>{icon}</> : undefined} />;
}
