// FASE 4C — Painel de Inteligência: Pixels, Antifraude IA, Consentimento, ROI.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listPixels, upsertPixel, deletePixel,
  listFraudScores, reviewFraudScore, runFraudScan,
  listRoiSnapshots, runRoiSnapshot,
  listCookieConsents,
} from "../intelligence.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, Plus, Trash2, ShieldAlert, Cookie, BarChart3, Radio } from "lucide-react";
import { toast } from "sonner";

const money = (c: number) => `R$ ${(Number(c ?? 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// ── Pixels ──────────────────────────────────────
export function PixelsSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPixels);
  const upsertFn = useServerFn(upsertPixel);
  const delFn = useServerFn(deletePixel);
  const { data, isLoading } = useQuery({ queryKey: ["aff-pixels"], queryFn: () => listFn() });
  const upsert = useMutation({
    mutationFn: (v: any) => upsertFn({ data: v }),
    onSuccess: () => { toast.success("Pixel salvo"); qc.invalidateQueries({ queryKey: ["aff-pixels"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Pixel removido"); qc.invalidateQueries({ queryKey: ["aff-pixels"] }); },
  });
  const [form, setForm] = useState<any>({ provider: "meta", active: true });
  const rows = (data as any[]) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Radio className="size-5" /> Pixel Manager</CardTitle>
        <CardDescription>Meta CAPI, GA4 Measurement Protocol e TikTok Events API (server-side).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-2 p-3 border rounded">
          <div>
            <Label>Provider</Label>
            <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="meta">Meta (Facebook/Instagram)</SelectItem>
                <SelectItem value="ga4">Google Analytics 4</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Label</Label><Input value={form.label ?? ""} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
          <div><Label>Pixel ID / Measurement ID</Label><Input value={form.pixel_id ?? ""} onChange={(e) => setForm({ ...form, pixel_id: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Access Token / API Secret</Label><Input value={form.access_token ?? ""} onChange={(e) => setForm({ ...form, access_token: e.target.value })} /></div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.test_mode} onCheckedChange={(v) => setForm({ ...form, test_mode: v })} /> Test mode</label>
            <Button onClick={() => upsert.mutate(form)} disabled={upsert.isPending}>
              {upsert.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Salvar
            </Button>
          </div>
        </div>

        {isLoading ? <Loader2 className="size-5 animate-spin" /> : (
          <div className="space-y-2">
            {rows.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{p.label ?? p.provider}</div>
                  <div className="text-xs text-muted-foreground">{p.provider.toUpperCase()} · {p.pixel_id} · {p.active ? "ativo" : "inativo"}{p.test_mode ? " · TESTE" : ""}</div>
                </div>
                <Button size="sm" variant="destructive" onClick={() => del.mutate(p.id)}><Trash2 className="size-4" /></Button>
              </div>
            ))}
            {rows.length === 0 && <div className="text-sm text-muted-foreground">Nenhum pixel configurado.</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Antifraude ─────────────────────────────────
export function FraudAiSection() {
  const qc = useQueryClient();
  const [risk, setRisk] = useState<string>("all");
  const listFn = useServerFn(listFraudScores);
  const reviewFn = useServerFn(reviewFraudScore);
  const scanFn = useServerFn(runFraudScan);
  const { data, isLoading } = useQuery({
    queryKey: ["aff-fraud", risk],
    queryFn: () => listFn({ data: { risk: risk === "all" ? undefined : risk, limit: 200 } }),
  });
  const review = useMutation({
    mutationFn: (v: { id: string; action: "allow" | "review" | "block" }) => reviewFn({ data: v }),
    onSuccess: () => { toast.success("Marcado"); qc.invalidateQueries({ queryKey: ["aff-fraud"] }); },
  });
  const scan = useMutation({
    mutationFn: () => scanFn({ data: {} }),
    onSuccess: () => { toast.success("Scan concluído"); qc.invalidateQueries({ queryKey: ["aff-fraud"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = (data as any[]) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldAlert className="size-5" /> Antifraude IA</CardTitle>
        <CardDescription>Heurísticas + análise por IA (Lovable AI Gateway) com histórico de decisões.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Select value={risk} onValueChange={setRisk}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os riscos</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
              <SelectItem value="high">Alto</SelectItem>
              <SelectItem value="medium">Médio</SelectItem>
              <SelectItem value="low">Baixo</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => scan.mutate()} disabled={scan.isPending}>
            {scan.isPending ? <Loader2 className="size-4 animate-spin" /> : "Executar scan"}
          </Button>
        </div>
        {isLoading ? <Loader2 className="size-5 animate-spin" /> : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="p-3 border rounded space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={r.risk_level === "critical" || r.risk_level === "high" ? "destructive" : "secondary"}>{r.risk_level}</Badge>
                    <span className="text-sm font-medium">Score {r.score}</span>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => review.mutate({ id: r.id, action: "allow" })}>Permitir</Button>
                    <Button size="sm" variant="outline" onClick={() => review.mutate({ id: r.id, action: "review" })}>Revisar</Button>
                    <Button size="sm" variant="destructive" onClick={() => review.mutate({ id: r.id, action: "block" })}>Bloquear</Button>
                  </div>
                </div>
                {r.ai_reasoning && <p className="text-xs text-muted-foreground italic">🤖 {r.ai_reasoning}</p>}
                <div className="flex flex-wrap gap-1">
                  {(r.signals ?? []).map((s: any, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">{s.code} ({s.weight})</Badge>
                  ))}
                </div>
              </div>
            ))}
            {rows.length === 0 && <div className="text-sm text-muted-foreground">Nenhum score.</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── ROI ─────────────────────────────────────────
export function RoiSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(listRoiSnapshots);
  const runFn = useServerFn(runRoiSnapshot);
  const { data, isLoading } = useQuery({ queryKey: ["aff-roi"], queryFn: () => listFn() });
  const [form, setForm] = useState<any>({
    period_start: new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10),
    period_end: new Date().toISOString().slice(0, 10),
    ad_spend_cents: 0,
  });
  const run = useMutation({
    mutationFn: () => runFn({ data: form }),
    onSuccess: () => { toast.success("Snapshot gerado"); qc.invalidateQueries({ queryKey: ["aff-roi"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = (data as any[]) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BarChart3 className="size-5" /> Dashboard ROI / ROAS</CardTitle>
        <CardDescription>Clicks, CVR, EPC, receita, comissão e ROAS por período.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid md:grid-cols-4 gap-2 p-3 border rounded">
          <div><Label>Início</Label><Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} /></div>
          <div><Label>Fim</Label><Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} /></div>
          <div><Label>Ad spend (centavos)</Label><Input type="number" value={form.ad_spend_cents} onChange={(e) => setForm({ ...form, ad_spend_cents: Number(e.target.value) })} /></div>
          <div className="flex items-end"><Button onClick={() => run.mutate()} disabled={run.isPending}>{run.isPending ? <Loader2 className="size-4 animate-spin" /> : "Gerar snapshot"}</Button></div>
        </div>
        {isLoading ? <Loader2 className="size-5 animate-spin" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground text-xs">
                <tr><th className="p-2">Período</th><th className="p-2">Clicks</th><th className="p-2">Conv.</th><th className="p-2">CVR</th><th className="p-2">EPC</th><th className="p-2">Receita</th><th className="p-2">Comissão</th><th className="p-2">Ad Spend</th><th className="p-2">ROAS</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.period_start} → {r.period_end}</td>
                    <td className="p-2">{r.clicks}</td>
                    <td className="p-2">{r.conversions}</td>
                    <td className="p-2">{(Number(r.cvr) * 100).toFixed(2)}%</td>
                    <td className="p-2">{money(r.epc_cents)}</td>
                    <td className="p-2">{money(r.revenue_cents)}</td>
                    <td className="p-2">{money(r.commission_cents)}</td>
                    <td className="p-2">{money(r.ad_spend_cents)}</td>
                    <td className="p-2 font-medium">{Number(r.roas).toFixed(2)}x</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">Sem snapshots.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Cookie Consents ─────────────────────────────
export function CookieConsentsSection() {
  const listFn = useServerFn(listCookieConsents);
  const { data, isLoading } = useQuery({ queryKey: ["aff-consents"], queryFn: () => listFn() });
  const rows = (data as any[]) ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Cookie className="size-5" /> Registros de Consentimento</CardTitle>
        <CardDescription>Auditoria LGPD/GDPR — últimas 200 preferências salvas.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="size-5 animate-spin" /> : (
          <div className="space-y-1 text-sm">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2 border rounded">
                <div className="truncate">
                  <span className="font-mono text-xs">{r.session_id.slice(0, 8)}…</span>
                  <span className="ml-2 text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(r.preferences ?? {}).map(([k, v]) => (
                    <Badge key={k} variant={v ? "default" : "outline"} className="text-xs">{k}:{String(v)}</Badge>
                  ))}
                </div>
              </div>
            ))}
            {rows.length === 0 && <div className="text-muted-foreground">Nenhum registro.</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
