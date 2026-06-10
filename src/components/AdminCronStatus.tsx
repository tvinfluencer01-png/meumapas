import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, RefreshCw, Clock, Edit2, Save, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { getCronStatus, updateCronJob, type CronJobStatus } from "@/lib/cron-status.functions";

function fmt(ts: string | null) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
  } catch {
    return ts;
  }
}

function statusBadge(s: string | null) {
  if (s === "succeeded") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 gap-1">
        <CheckCircle2 className="size-3" /> succeeded
      </Badge>
    );
  }
  if (s === "failed") {
    return (
      <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1">
        <AlertTriangle className="size-3" /> failed
      </Badge>
    );
  }
  return <Badge variant="outline">{s ?? "sem execução"}</Badge>;
}

function httpBadge(code: number | null) {
  if (code === null) return null;
  const ok = code >= 200 && code < 300;
  return (
    <Badge
      variant="outline"
      className={ok ? "border-emerald-500/30 text-emerald-300" : "border-destructive/30 text-destructive"}
    >
      HTTP {code}
    </Badge>
  );
}

function CronJobItem({ job }: { job: CronJobStatus }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateCronJob);
  const [isEditing, setIsEditing] = useState(false);
  const [schedule, setSchedule] = useState(job.schedule);
  const [command, setCommand] = useState(job.command);
  const [active, setActive] = useState(job.active);

  const mut = useMutation({
    mutationFn: () => updateFn({ data: { jobid: job.jobid, schedule, command, active } }),
    onSuccess: () => {
      toast.success("Cron job atualizado com sucesso.");
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ["admin-cron-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const failed = job.last_status === "failed";
  const httpBad = job.last_http_status !== null && (job.last_http_status < 200 || job.last_http_status >= 300);

  if (isEditing) {
    return (
      <div className="rounded-lg border border-gold/50 bg-gold/5 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            Editando: {job.jobname}
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={mut.isPending}>
              <X className="size-4 mr-1" /> Cancelar
            </Button>
            <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
              <Save className="size-4 mr-1" /> Salvar
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Schedule (Cron Syntax)</Label>
            <Input 
              value={schedule} 
              onChange={(e) => setSchedule(e.target.value)} 
              placeholder="0 * * * *" 
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Command (SQL)</Label>
            <Textarea 
              value={command} 
              onChange={(e) => setCommand(e.target.value)} 
              placeholder="SELECT ..." 
              className="font-mono min-h-[120px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} id={`active-${job.jobid}`} />
            <Label htmlFor={`active-${job.jobid}`}>Ativo</Label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${
        failed || httpBad ? "border-destructive/40 bg-destructive/5" : "border-border bg-card/30"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{job.jobname}</span>
            {!job.active && <Badge variant="outline">desativado</Badge>}
            <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-gold" onClick={() => setIsEditing(true)}>
              <Edit2 className="size-3" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground font-mono">{job.schedule}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge(job.last_status)}
          {httpBadge(job.last_http_status)}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-muted-foreground">Início</div>
          <div>{fmt(job.last_run_started)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Fim</div>
          <div>{fmt(job.last_run_ended)}</div>
        </div>
      </div>

      <div className="text-xs">
        <div className="text-muted-foreground mb-1">URL e Configurações</div>
        <pre className="rounded bg-muted/40 p-2 whitespace-pre-wrap break-all font-mono">
          {job.command}
        </pre>
      </div>

      {(job.last_return_message || job.last_http_error) && (
        <div className="space-y-2">
          {job.last_return_message && (
            <div className="text-xs">
              <div className="text-muted-foreground mb-1">Mensagem de retorno</div>
              <pre className="rounded bg-muted/40 p-2 whitespace-pre-wrap break-all">
                {job.last_return_message}
              </pre>
            </div>
          )}
          {job.last_http_error && (
            <div className="text-xs">
              <div className="text-muted-foreground mb-1">Erro HTTP</div>
              <pre className="rounded bg-destructive/10 text-destructive p-2 whitespace-pre-wrap break-all">
                {job.last_http_error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminCronStatus() {
  const fn = useServerFn(getCronStatus);
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["admin-cron-status"],
    queryFn: () => fn(),
    refetchInterval: 30_000,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5 text-gold" /> Cron Jobs
          </CardTitle>
          <CardDescription>
            Última execução, status e motivo de falhas para cada job agendado (pg_cron).
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
        {error && (
          <div className="text-sm text-destructive">
            Erro ao carregar status: {(error as Error).message}
          </div>
        )}
        {!isLoading && data?.length === 0 && (
          <div className="text-sm text-muted-foreground">Nenhum cron job agendado.</div>
        )}
        {data?.map((job: CronJobStatus) => (
          <CronJobItem key={job.jobid} job={job} />
        ))}
      </CardContent>
    </Card>
  );
}