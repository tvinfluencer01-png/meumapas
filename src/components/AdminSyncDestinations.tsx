import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Save, Loader2, RefreshCw, Star, StarOff, Globe, CheckCircle2, XCircle, PlugZap, SearchCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  listSyncDestinations,
  upsertSyncDestination,
  deleteSyncDestination,
  remapDestinationUrls,
  testSyncDestination,
  verifyRemapDestination,
} from "@/lib/sync-destinations.functions";

type Dest = {
  id: string;
  name: string;
  site_url: string;
  legacy_domains: string[];
  supabase_url: string;
  supabase_project_ref: string | null;
  supabase_publishable_key: string | null;
  service_role_secret_name: string;
  is_default: boolean;
  notes: string | null;
};

const EMPTY: Partial<Dest> = {
  name: "",
  site_url: "",
  legacy_domains: [],
  supabase_url: "",
  supabase_project_ref: "",
  supabase_publishable_key: "",
  service_role_secret_name: "NEW_SUPABASE_SERVICE_ROLE_KEY",
  is_default: false,
  notes: "",
};

export function AdminSyncDestinations() {
  const qc = useQueryClient();
  const listFn = useServerFn(listSyncDestinations);
  const upsertFn = useServerFn(upsertSyncDestination);
  const deleteFn = useServerFn(deleteSyncDestination);
  const remapFn = useServerFn(remapDestinationUrls);
  const testFn = useServerFn(testSyncDestination);
  const verifyFn = useServerFn(verifyRemapDestination);

  const { data, isLoading } = useQuery({
    queryKey: ["sync-destinations"],
    queryFn: () => listFn(),
  });

  const [form, setForm] = useState<Partial<Dest>>(EMPTY);
  const [legacyText, setLegacyText] = useState("");
  const [remapResult, setRemapResult] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const setField = <K extends keyof Dest>(k: K, v: Dest[K]) => setForm((p) => ({ ...p, [k]: v }));

  const startEdit = (d: Dest) => {
    setForm(d);
    setLegacyText((d.legacy_domains ?? []).join(", "));
    setRemapResult(null);
  };
  const clearForm = () => { setForm(EMPTY); setLegacyText(""); };

  const saveMut = useMutation({
    mutationFn: async () => {
      const legacy = legacyText.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      return upsertFn({ data: { ...(form as any), legacy_domains: legacy } });
    },
    onSuccess: () => {
      toast.success("Destino salvo.");
      qc.invalidateQueries({ queryKey: ["sync-destinations"] });
      clearForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Destino removido.");
      qc.invalidateQueries({ queryKey: ["sync-destinations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remapMut = useMutation({
    mutationFn: (dryRun: boolean) => remapFn({ data: { dryRun } }),
    onSuccess: (res) => {
      setRemapResult(res);
      toast.success(res.dryRun ? `Prévia: ${res.statementsCount} instrução(ões)` : `Aplicado: ${res.statementsCount} instrução(ões)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testMut = useMutation({
    mutationFn: (destinationId?: string) => testFn({ data: destinationId ? { destinationId } : {} }),
    onSuccess: (res) => {
      setTestResult(res);
      if (res.ok) toast.success(`Destino "${res.destination.name}" OK`);
      else toast.error(`Destino "${res.destination.name}" com falhas`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyMut = useMutation({
    mutationFn: () => verifyFn({ data: {} }),
    onSuccess: (res) => {
      setVerifyResult(res);
      if (res.ok) toast.success("Nenhuma ocorrência remanescente.");
      else toast.warning(`${res.totalTableRows} linha(s) e ${res.cronRemaining.length} cron job(s) ainda com legacy`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const destinations: Dest[] = (data?.destinations ?? []) as any;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-5 text-gold" /> Destinos de Sincronização
          </CardTitle>
          <CardDescription>
            Cadastre o site público e o Supabase de destino. Ao sincronizar, o passo de
            <strong> "Reapontar URLs"</strong> reescreve automaticamente os domínios antigos → novo site
            nas tabelas e nos cron jobs do destino.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : destinations.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum destino cadastrado ainda.</div>
          ) : (
            destinations.map((d) => (
              <div key={d.id} className="rounded-lg border border-border p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{d.name}</span>
                    {d.is_default && (
                      <Badge variant="outline" className="border-gold/40 text-gold">
                        <Star className="size-3 mr-1" /> Padrão
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono break-all">
                    site: {d.site_url} · supabase: {d.supabase_url}
                  </div>
                  {d.legacy_domains?.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      domínios antigos: <span className="font-mono">{d.legacy_domains.join(", ")}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => testMut.mutate(d.id)} disabled={testMut.isPending}>
                    {testMut.isPending && testMut.variables === d.id ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
                    <span className="ml-1">Testar</span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(d)}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Remover "${d.name}"?`)) delMut.mutate(d.id); }}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
          {testResult && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1">
              <div className="flex items-center gap-2">
                {testResult.ok ? <CheckCircle2 className="size-4 text-green-500" /> : <XCircle className="size-4 text-red-500" />}
                <span className="font-medium">
                  Teste de "{testResult.destination.name}" — {testResult.ok ? "todos os checks passaram" : "falhas detectadas"}
                </span>
              </div>
              <ul className="space-y-0.5 pl-6">
                {testResult.checks.map((c: any, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    {c.ok ? <CheckCircle2 className="size-3.5 text-green-500 mt-0.5" /> : <XCircle className="size-3.5 text-red-500 mt-0.5" />}
                    <span><strong>{c.name}</strong>{c.detail ? <span className="text-muted-foreground"> — {c.detail}</span> : null}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {form.id ? <Save className="size-4" /> : <Plus className="size-4" />}
            {form.id ? "Editar destino" : "Novo destino"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Apelido</Label>
              <Input value={form.name ?? ""} onChange={(e) => setField("name", e.target.value)} placeholder="Produção MS3" />
            </div>
            <div>
              <Label>Site público (URL final)</Label>
              <Input value={form.site_url ?? ""} onChange={(e) => setField("site_url", e.target.value)} placeholder="https://codigocosmico.com.br" />
            </div>
            <div className="sm:col-span-2">
              <Label>Domínios antigos a substituir (vírgula ou nova linha)</Label>
              <Textarea
                value={legacyText}
                onChange={(e) => setLegacyText(e.target.value)}
                placeholder="project--7dbfe514-....lovable.app, meumapas.lovable.app, mapaastral.ms3.com.br"
                className="font-mono text-xs"
              />
            </div>
            <div>
              <Label>Supabase URL (destino)</Label>
              <Input value={form.supabase_url ?? ""} onChange={(e) => setField("supabase_url", e.target.value)} placeholder="https://xxxx.supabase.co" />
            </div>
            <div>
              <Label>Project ref</Label>
              <Input value={form.supabase_project_ref ?? ""} onChange={(e) => setField("supabase_project_ref", e.target.value)} placeholder="xxxxxxxx" />
            </div>
            <div>
              <Label>Publishable key</Label>
              <Input value={form.supabase_publishable_key ?? ""} onChange={(e) => setField("supabase_publishable_key", e.target.value)} placeholder="eyJhbGci..." />
            </div>
            <div>
              <Label>Nome do secret com Service Role</Label>
              <Input value={form.service_role_secret_name ?? ""} onChange={(e) => setField("service_role_secret_name", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Notas</Label>
              <Textarea value={form.notes ?? ""} onChange={(e) => setField("notes", e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.is_default} onChange={(e) => setField("is_default", e.target.checked)} />
              Definir como padrão
              {form.is_default ? <Star className="size-4 text-gold" /> : <StarOff className="size-4 text-muted-foreground" />}
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.name || !form.site_url || !form.supabase_url}>
              {saveMut.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
              Salvar
            </Button>
            {form.id && <Button variant="outline" onClick={clearForm}>Cancelar</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="size-4" /> Reapontar URLs no destino
          </CardTitle>
          <CardDescription>
            Substitui os domínios antigos pelo <code>site_url</code> do destino padrão em cron jobs e tabelas conhecidas
            (system_settings, pdf_branding, product_landings, horoscope_landing_settings, mercado_pago_settings,
            affiliate_settings, evolution_settings, twilio_settings).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => remapMut.mutate(true)} disabled={remapMut.isPending}>
              {remapMut.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
              Prévia (dry-run)
            </Button>
            <Button onClick={() => remapMut.mutate(false)} disabled={remapMut.isPending}>
              {remapMut.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <RefreshCw className="size-4 mr-2" />}
              Aplicar reescrita
            </Button>
            <Button variant="secondary" onClick={() => verifyMut.mutate()} disabled={verifyMut.isPending}>
              {verifyMut.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <SearchCheck className="size-4 mr-2" />}
              Verificar alterações
            </Button>
          </div>
          {verifyResult && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-2">
              <div className="flex items-center gap-2">
                {verifyResult.ok ? <CheckCircle2 className="size-4 text-green-500" /> : <XCircle className="size-4 text-red-500" />}
                <span className="font-medium">
                  {verifyResult.ok
                    ? "Tudo limpo — nenhum domínio antigo remanescente."
                    : `Ainda há ${verifyResult.totalTableRows} linha(s) em ${verifyResult.tableFindings.length} coluna(s) e ${verifyResult.cronRemaining.length} cron job(s).`}
                </span>
              </div>
              <div className="text-muted-foreground">
                Legado buscado: <span className="font-mono">{verifyResult.legacy.join(", ")}</span>
              </div>
              {verifyResult.tableFindings.length > 0 && (
                <div>
                  <div className="font-medium mb-1">Tabelas:</div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {verifyResult.tableFindings.map((f: any, i: number) => (
                      <li key={i}>
                        <span className="font-mono">{f.table_name}.{f.column_name}</span> — {f.remaining} linha(s)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {verifyResult.cronRemaining.length > 0 && (
                <div>
                  <div className="font-medium mb-1">Cron jobs:</div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {verifyResult.cronRemaining.map((j: any) => (
                      <li key={j.jobid}>
                        <span className="font-mono">#{j.jobid}</span> {j.jobname}
                        <span className="text-muted-foreground"> — {j.matches.join(", ")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {remapResult && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-2">
              <div>
                Site alvo: <span className="font-mono text-gold">{remapResult.report.site_url}</span>
                {" · "}Legado: <span className="font-mono">{remapResult.report.legacy.join(", ")}</span>
              </div>
              {remapResult.report.cronJobs?.length > 0 ? (
                <div>
                  <div className="font-medium mb-1">Cron jobs reescritos ({remapResult.report.cronJobs.length}):</div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {remapResult.report.cronJobs.map((j: any) => (
                      <li key={j.jobid}><span className="font-mono">#{j.jobid}</span> {j.jobname}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-muted-foreground">Nenhum cron job precisou ser alterado.</div>
              )}
              <details>
                <summary className="cursor-pointer">Detalhes ({remapResult.statementsCount} instruções)</summary>
                <pre className="mt-1 max-h-64 overflow-auto rounded bg-background/50 p-2 font-mono text-[11px]">
                  {JSON.stringify(remapResult.report, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
