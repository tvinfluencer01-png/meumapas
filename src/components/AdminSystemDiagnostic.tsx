import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, CheckCircle2, AlertTriangle, XCircle, MinusCircle, Loader2, Download, Play, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { runSystemDiagnostic, reconcileTableRows, type CheckResult, type CheckStatus } from "@/lib/system-diagnostic.functions";

const STATUS_META: Record<CheckStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  ok:   { label: "OK",       className: "text-emerald-500 border-emerald-500/40 bg-emerald-500/10", Icon: CheckCircle2 },
  warn: { label: "Atenção",  className: "text-amber-500 border-amber-500/40 bg-amber-500/10",       Icon: AlertTriangle },
  fail: { label: "Falha",    className: "text-destructive border-destructive/40 bg-destructive/10", Icon: XCircle },
  skip: { label: "Ignorado", className: "text-muted-foreground border-border bg-muted/30",          Icon: MinusCircle },
};

export function AdminSystemDiagnostic() {
  const runFn = useServerFn(runSystemDiagnostic);
  const [result, setResult] = useState<Awaited<ReturnType<typeof runSystemDiagnostic>> | null>(null);

  const runMut = useMutation({
    mutationFn: () => runFn(),
    onSuccess: (res) => {
      setResult(res);
      toast.success(`Diagnóstico: ${res.summary.ok} OK, ${res.summary.warn} atenção, ${res.summary.fail} falha`);
    },
    onError: (e: Error) => toast.error(`Falha ao rodar diagnóstico: ${e.message}`),
  });

  const grouped = useMemo(() => {
    if (!result) return [] as Array<{ group: string; items: CheckResult[] }>;
    const map = new Map<string, CheckResult[]>();
    for (const c of result.checks) {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    }
    return Array.from(map, ([group, items]) => ({ group, items }));
  }, [result]);

  const download = () => {
    if (!result) return;
    const blob = new Blob([result.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagnostico-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5 text-gold" /> Autodiagnóstico do Sistema
          </CardTitle>
          <CardDescription>
            Verifica infraestrutura, banco de dados, integrações externas, módulos internos e consistência com o Supabase de destino.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => runMut.mutate()} disabled={runMut.isPending}>
              {runMut.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Play className="size-4 mr-2" />}
              {runMut.isPending ? "Rodando..." : "Rodar diagnóstico"}
            </Button>
            <Button variant="outline" onClick={download} disabled={!result}>
              <Download className="size-4 mr-2" /> Baixar relatório (.md)
            </Button>
          </div>

          {result && (
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">{result.summary.ok} OK</Badge>
              <Badge variant="outline" className="border-amber-500/40 text-amber-500">{result.summary.warn} atenção</Badge>
              <Badge variant="outline" className="border-destructive/40 text-destructive">{result.summary.fail} falha</Badge>
              <Badge variant="outline" className="text-muted-foreground">{result.summary.skip} ignorado</Badge>
              <span className="text-xs text-muted-foreground self-center">
                Gerado {new Date(result.generatedAt).toLocaleString("pt-BR")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {grouped.map(({ group, items }) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="text-base">{group}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((c, i) => {
              const meta = STATUS_META[c.status];
              const Icon = meta.Icon;
              return (
                <div key={i} className={`rounded-lg border p-3 ${meta.className}`}>
                  <div className="flex items-start gap-2">
                    <Icon className="size-4 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{c.name}</span>
                        <span className="text-xs opacity-70">{meta.label}</span>
                        <span className="text-xs opacity-60 ml-auto">{c.durationMs}ms</span>
                      </div>
                      <div className="text-sm text-foreground/80 mt-1 break-words">{c.detail}</div>
                      {c.meta && Object.keys(c.meta).length > 0 && (
                        <details className="mt-2 text-xs">
                          <summary className="cursor-pointer opacity-70 hover:opacity-100">Detalhes</summary>
                          <pre className="mt-1 max-h-48 overflow-auto rounded bg-background/50 p-2 font-mono text-[11px]">
                            {JSON.stringify(c.meta, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
