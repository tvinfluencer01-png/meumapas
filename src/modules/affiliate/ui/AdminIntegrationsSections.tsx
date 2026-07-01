// FASE 4E — Seções administrativas: Notificações & Webhooks Outbound.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listNotificationTemplates, upsertNotificationTemplate, deleteNotificationTemplate,
  listNotificationRules, upsertNotificationRule, deleteNotificationRule,
  listOutboundWebhooks, upsertOutboundWebhook, deleteOutboundWebhook,
  listNotificationDispatches, listWebhookDeliveries, testDispatchEvent,
} from "../notifications.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Send, Radio, Webhook, Bell, History } from "lucide-react";
import { toast } from "sonner";

const CHANNELS = ["push", "email", "inapp", "webhook"] as const;
const KNOWN_EVENTS = [
  "commission.created", "commission.approved", "conversion.created",
  "withdraw.requested", "withdraw.paid", "level.up", "badge.awarded",
  "mission.completed", "fraud.flagged",
];

// ═══════════════ Templates ═══════════════
export function NotificationTemplatesSection() {
  const qc = useQueryClient();
  const list = useServerFn(listNotificationTemplates);
  const upsert = useServerFn(upsertNotificationTemplate);
  const remove = useServerFn(deleteNotificationTemplate);
  const { data = [] } = useQuery({ queryKey: ["aff-notif-templates"], queryFn: () => list() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ slug: "", name: "", channel: "inapp", body: "", enabled: true });

  const save = useMutation({
    mutationFn: (v: any) => upsert({ data: v }),
    onSuccess: () => { toast.success("Template salvo"); qc.invalidateQueries({ queryKey: ["aff-notif-templates"] }); setOpen(false); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aff-notif-templates"] }),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div><CardTitle>Templates de Notificação</CardTitle><CardDescription>Push, e-mail, in-app e webhook. Use {"{{variavel}}"} no corpo.</CardDescription></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setForm({ slug: "", name: "", channel: "inapp", body: "", enabled: true })}>
              <Plus className="size-4 mr-1" />Novo template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Template</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
                <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Canal</Label>
                  <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2"><Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} /><Label>Ativo</Label></div>
              </div>
              <div><Label>Assunto / Título</Label><Input value={form.subject ?? ""} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
              <div><Label>Corpo</Label><Textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>URL de ação</Label><Input value={form.action_url ?? ""} onChange={(e) => setForm({ ...form, action_url: e.target.value })} /></div>
                <div><Label>Ícone (URL)</Label><Input value={form.icon_url ?? ""} onChange={(e) => setForm({ ...form, icon_url: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={() => save.mutate(form)} disabled={save.isPending}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground"><tr><th className="text-left">Nome</th><th>Canal</th><th>Ativo</th><th></th></tr></thead>
          <tbody>
            {(data as any[]).map((r) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="py-2">{r.name} <span className="text-muted-foreground text-xs">({r.slug})</span></td>
                <td className="text-center"><Badge variant="outline">{r.channel}</Badge></td>
                <td className="text-center">{r.enabled ? "✓" : "—"}</td>
                <td className="text-right"><Button size="sm" variant="ghost" onClick={() => { setForm(r); setOpen(true); }}>Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="size-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ═══════════════ Rules ═══════════════
export function NotificationRulesSection() {
  const qc = useQueryClient();
  const list = useServerFn(listNotificationRules);
  const listT = useServerFn(listNotificationTemplates);
  const upsert = useServerFn(upsertNotificationRule);
  const remove = useServerFn(deleteNotificationRule);
  const testFn = useServerFn(testDispatchEvent);
  const { data = [] } = useQuery({ queryKey: ["aff-notif-rules"], queryFn: () => list() });
  const { data: tmpls = [] } = useQuery({ queryKey: ["aff-notif-templates"], queryFn: () => listT() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ event_key: KNOWN_EVENTS[0], template_id: "", cooldown_seconds: 0, enabled: true });

  const save = useMutation({
    mutationFn: (v: any) => upsert({ data: v }),
    onSuccess: () => { toast.success("Regra salva"); qc.invalidateQueries({ queryKey: ["aff-notif-rules"] }); setOpen(false); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });
  const test = useMutation({
    mutationFn: (event: string) => testFn({ data: { event_key: event } }),
    onSuccess: (r: any) => toast.success(`Disparado: ${r.dispatched}`),
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div><CardTitle>Regras de Notificação</CardTitle><CardDescription>Ligue eventos do sistema a templates.</CardDescription></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" />Nova regra</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Regra</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Evento</Label>
                <Select value={form.event_key} onValueChange={(v) => setForm({ ...form, event_key: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{KNOWN_EVENTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Template</Label>
                <Select value={form.template_id} onValueChange={(v) => setForm({ ...form, template_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Escolha…" /></SelectTrigger>
                  <SelectContent>{(tmpls as any[]).map((t) => <SelectItem key={t.id} value={t.id}>{t.name} · {t.channel}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Cooldown (segundos)</Label><Input type="number" value={form.cooldown_seconds ?? 0} onChange={(e) => setForm({ ...form, cooldown_seconds: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} /><Label>Ativa</Label></div>
            </div>
            <DialogFooter><Button onClick={() => save.mutate(form)} disabled={save.isPending}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground"><tr><th className="text-left">Evento</th><th className="text-left">Template</th><th>Cooldown</th><th>Ativa</th><th></th></tr></thead>
          <tbody>
            {(data as any[]).map((r) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="py-2"><code className="text-xs">{r.event_key}</code></td>
                <td>{r.affiliate_notification_templates?.name ?? r.template_id}</td>
                <td className="text-center">{r.cooldown_seconds}s</td>
                <td className="text-center">{r.enabled ? "✓" : "—"}</td>
                <td className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => test.mutate(r.event_key)}><Send className="size-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { setForm(r); setOpen(true); }}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove({ data: { id: r.id } }).then(() => qc.invalidateQueries({ queryKey: ["aff-notif-rules"] }))}><Trash2 className="size-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ═══════════════ Outbound Webhooks ═══════════════
export function OutboundWebhooksSection() {
  const qc = useQueryClient();
  const list = useServerFn(listOutboundWebhooks);
  const upsert = useServerFn(upsertOutboundWebhook);
  const remove = useServerFn(deleteOutboundWebhook);
  const listDeliv = useServerFn(listWebhookDeliveries);
  const { data = [] } = useQuery({ queryKey: ["aff-outbound-hooks"], queryFn: () => list() });
  const { data: deliveries = [] } = useQuery({ queryKey: ["aff-outbound-deliveries"], queryFn: () => listDeliv({ data: {} }) });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", target_url: "", secret: "", events: [], enabled: true, headers: {} });

  const save = useMutation({
    mutationFn: (v: any) => upsert({ data: v }),
    onSuccess: () => { toast.success("Webhook salvo"); qc.invalidateQueries({ queryKey: ["aff-outbound-hooks"] }); setOpen(false); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div><CardTitle>Webhooks de saída</CardTitle><CardDescription>Envie eventos assinados (HMAC-SHA256) para parceiros.</CardDescription></div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" />Novo webhook</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Webhook</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>URL destino</Label><Input value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} /></div>
                <div><Label>Segredo (HMAC)</Label><Input value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} /></div>
                <div>
                  <Label>Eventos (vírgula-separados; use * para todos)</Label>
                  <Input value={(form.events ?? []).join(",")} onChange={(e) => setForm({ ...form, events: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                </div>
                <div className="flex items-center gap-2"><Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} /><Label>Ativo</Label></div>
              </div>
              <DialogFooter><Button onClick={() => save.mutate(form)} disabled={save.isPending}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground"><tr><th className="text-left">Nome</th><th className="text-left">URL</th><th>Eventos</th><th>Último sucesso</th><th></th></tr></thead>
            <tbody>
              {(data as any[]).map((r) => (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="py-2">{r.name}</td>
                  <td className="truncate max-w-[240px]"><code className="text-xs">{r.target_url}</code></td>
                  <td className="text-center">{(r.events ?? []).join(", ") || "*"}</td>
                  <td className="text-center text-xs">{r.last_success_at ? new Date(r.last_success_at).toLocaleString() : "—"}</td>
                  <td className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setForm(r); setOpen(true); }}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove({ data: { id: r.id } }).then(() => qc.invalidateQueries({ queryKey: ["aff-outbound-hooks"] }))}><Trash2 className="size-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><History className="size-4" />Últimas entregas</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground"><tr><th className="text-left">Quando</th><th className="text-left">Evento</th><th>Status</th><th className="text-left">Erro</th></tr></thead>
            <tbody>
              {(deliveries as any[]).map((d) => (
                <tr key={d.id} className="border-t border-border/40">
                  <td className="py-2 text-xs">{new Date(d.created_at).toLocaleString()}</td>
                  <td><code className="text-xs">{d.event_key}</code></td>
                  <td className="text-center"><Badge variant={d.status_code && d.status_code < 300 ? "default" : "destructive"}>{d.status_code ?? "ERR"}</Badge></td>
                  <td className="text-xs text-destructive">{d.error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════ Dispatches (auditoria) ═══════════════
export function NotificationDispatchesSection() {
  const list = useServerFn(listNotificationDispatches);
  const { data = [] } = useQuery({ queryKey: ["aff-notif-disp"], queryFn: () => list({ data: {} }) });
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="size-4" />Histórico de disparos</CardTitle></CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground"><tr><th className="text-left">Quando</th><th className="text-left">Evento</th><th>Canal</th><th>Status</th></tr></thead>
          <tbody>
            {(data as any[]).map((d) => (
              <tr key={d.id} className="border-t border-border/40">
                <td className="py-2 text-xs">{new Date(d.created_at).toLocaleString()}</td>
                <td><code className="text-xs">{d.event_key}</code></td>
                <td className="text-center"><Badge variant="outline">{d.channel}</Badge></td>
                <td className="text-center"><Badge variant={d.status === "sent" ? "default" : d.status === "failed" ? "destructive" : "secondary"}>{d.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
