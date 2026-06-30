import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Mail, MessageCircle, Pause, Play, Send, Settings as SettingsIcon, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showFeedback } from "@/components/system-feedback";
import { listCrmLeads, updateCrmLead } from "@/lib/product-orders.functions";
import {
  getCrmFollowupSettings,
  saveCrmFollowupSettings,
  runCrmFollowupsNow,
  listCrmFollowupHistory,
} from "@/lib/crm-followups.functions";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  new: { label: "Novo", color: "bg-blue-600/30 text-blue-200 border-blue-500/40" },
  contacted: { label: "Contatado", color: "bg-amber-600/30 text-amber-200 border-amber-500/40" },
  negotiating: { label: "Negociando", color: "bg-purple-600/30 text-purple-200 border-purple-500/40" },
  converted: { label: "Convertido", color: "bg-emerald-600/30 text-emerald-200 border-emerald-500/40" },
  lost: { label: "Perdido", color: "bg-red-600/30 text-red-200 border-red-500/40" },
};

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("pt-BR");
}

function nextFollowupFor(lead: any, settings: any | undefined) {
  if (!settings || !settings.enabled) return null;
  if (lead.followup_paused) return null;
  if (!["new", "contacted", "negotiating"].includes(lead.status)) return null;
  if ((lead.followup_count ?? 0) >= settings.max_followups) return null;
  const base = lead.last_followup_at
    ? new Date(lead.last_followup_at).getTime() + settings.days_after_last_email * 86400_000
    : new Date(lead.created_at).getTime() + settings.days_after_lead * 86400_000;
  return new Date(base);
}

export function AdminCrm() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCrmLeads);
  const updateFn = useServerFn(updateCrmLead);
  const getSettingsFn = useServerFn(getCrmFollowupSettings);
  const saveSettingsFn = useServerFn(saveCrmFollowupSettings);
  const runNowFn = useServerFn(runCrmFollowupsNow);
  const historyFn = useServerFn(listCrmFollowupHistory);
  const [historyLead, setHistoryLead] = useState<any | null>(null);

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["admin-crm-followup-history", historyLead?.id],
    queryFn: () => historyFn({ data: { leadId: historyLead.id } }),
    enabled: !!historyLead,
  });

  const { data: leads, isLoading } = useQuery({
    queryKey: ["admin-crm-leads"],
    queryFn: () => listFn(),
    refetchInterval: 60_000,
  });
  const { data: settings } = useQuery({
    queryKey: ["admin-crm-followup-settings"],
    queryFn: () => getSettingsFn(),
  });

  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string>("new");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [form, setForm] = useState<any | null>(null);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  const updateMut = useMutation({
    mutationFn: (vars: any) => updateFn({ data: vars }),
    onSuccess: () => {
      showFeedback({ title: "Lead atualizado", type: "success" });
      qc.invalidateQueries({ queryKey: ["admin-crm-leads"] });
      setEditing(null);
    },
    onError: (e: Error) => showFeedback({ title: "Erro", description: e.message, type: "error" }),
  });

  const saveSettingsMut = useMutation({
    mutationFn: (vars: any) => saveSettingsFn({ data: vars }),
    onSuccess: () => {
      showFeedback({ title: "Configurações salvas", type: "success" });
      qc.invalidateQueries({ queryKey: ["admin-crm-followup-settings"] });
      setSettingsOpen(false);
    },
    onError: (e: Error) => showFeedback({ title: "Erro", description: e.message, type: "error" }),
  });

  const runNowMut = useMutation({
    mutationFn: () => runNowFn(),
    onSuccess: (r: any) => {
      showFeedback({
        title: "Follow-ups disparados",
        description: `Enviados: ${r?.sent ?? 0} · Falhas: ${r?.skipped ?? 0}${r?.reason ? ` · ${r.reason}` : ""}`,
        type: "success",
      });
      qc.invalidateQueries({ queryKey: ["admin-crm-leads"] });
    },
    onError: (e: Error) => showFeedback({ title: "Erro", description: e.message, type: "error" }),
  });

  const filtered = (leads ?? []).filter((l: any) => {
    if (filter !== "all" && l.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (l.email ?? "").toLowerCase().includes(s) ||
             (l.full_name ?? "").toLowerCase().includes(s) ||
             (l.landing_slug ?? "").toLowerCase().includes(s);
    }
    return true;
  });

  function openEdit(lead: any) {
    setEditing(lead);
    setNotes(lead.notes ?? "");
    setStatus(lead.status ?? "new");
  }

  const counts = {
    new: (leads ?? []).filter((l: any) => l.status === "new").length,
    contacted: (leads ?? []).filter((l: any) => l.status === "contacted").length,
    converted: (leads ?? []).filter((l: any) => l.status === "converted").length,
    lost: (leads ?? []).filter((l: any) => l.status === "lost").length,
    scheduled: (leads ?? []).filter((l: any) => nextFollowupFor(l, settings)).length,
  };

  return (
    <Card className="border-gold/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="font-serif shimmer-text">CRM — Leads das Landings</CardTitle>
            <CardDescription>
              Visitantes que preencheram o formulário mas ainda não pagaram. Follow-ups automáticos rodam por hora.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => runNowMut.mutate()} disabled={runNowMut.isPending}>
              {runNowMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <><Send className="size-4 mr-1" />Disparar agora</>}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
              <SettingsIcon className="size-4 mr-1" />Follow-ups
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2 text-xs">
          <span className="px-2 py-1 rounded bg-blue-600/20 text-blue-200">Novos: {counts.new}</span>
          <span className="px-2 py-1 rounded bg-amber-600/20 text-amber-200">Contatados: {counts.contacted}</span>
          <span className="px-2 py-1 rounded bg-emerald-600/20 text-emerald-200">Convertidos: {counts.converted}</span>
          <span className="px-2 py-1 rounded bg-red-600/20 text-red-200">Perdidos: {counts.lost}</span>
          <span className="px-2 py-1 rounded bg-gold/20 text-gold">Agendados: {counts.scheduled}</span>
          <span className={`px-2 py-1 rounded ${settings?.enabled ? "bg-emerald-600/20 text-emerald-200" : "bg-secondary text-muted-foreground"}`}>
            Automático: {settings?.enabled ? "Ligado" : "Desligado"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Buscar por e-mail, nome ou produto..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="py-10 text-center"><Loader2 className="size-5 animate-spin inline" /></div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum lead encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="text-left p-2">Lead</th>
                  <th className="text-left p-2">Produto</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Follow-ups</th>
                  <th className="text-left p-2">Último envio</th>
                  <th className="text-left p-2">Próximo</th>
                  <th className="text-left p-2">Criado</th>
                  <th className="text-right p-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l: any) => {
                  const st = STATUS_LABEL[l.status] ?? STATUS_LABEL.new;
                  const next = nextFollowupFor(l, settings);
                  return (
                    <tr key={l.id} className="border-b border-border/20 hover:bg-secondary/30">
                      <td className="p-2">
                        <div className="font-medium">{l.full_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{l.email}</div>
                        {l.phone && <div className="text-xs text-muted-foreground">{l.phone}</div>}
                      </td>
                      <td className="p-2 text-xs">{l.landing_slug ?? "—"}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs border ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="p-2 text-xs">{l.followup_count}{settings ? ` / ${settings.max_followups}` : ""}</td>
                      <td className="p-2 text-xs">{fmtDate(l.last_followup_at ?? l.last_contact_at)}</td>
                      <td className="p-2 text-xs">
                        {l.followup_paused
                          ? <span className="text-amber-300">Pausado</span>
                          : next
                            ? <span className={next.getTime() <= Date.now() ? "text-emerald-300" : ""}>{next.toLocaleDateString("pt-BR")}</span>
                            : "—"}
                      </td>
                      <td className="p-2 text-xs">{fmtDate(l.created_at)}</td>
                      <td className="p-2 text-right">
                        <div className="inline-flex gap-1">
                          <Button size="icon" variant="ghost" asChild title="E-mail">
                            <a href={`mailto:${l.email}`}><Mail className="size-4" /></a>
                          </Button>
                          {l.phone && (
                            <Button size="icon" variant="ghost" asChild title="WhatsApp">
                              <a href={`https://wa.me/${String(l.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                                <MessageCircle className="size-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            title={l.followup_paused ? "Retomar follow-ups" : "Pausar follow-ups"}
                            onClick={() => updateMut.mutate({ id: l.id, followup_paused: !l.followup_paused })}
                          >
                            {l.followup_paused ? <Play className="size-4" /> : <Pause className="size-4" />}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEdit(l)}>Editar</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif shimmer-text">Editar lead</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="text-sm">
                <div><strong>{editing.full_name}</strong> — {editing.email}</div>
                {editing.phone && <div className="text-xs text-muted-foreground">{editing.phone}</div>}
                <div className="text-xs text-muted-foreground">Produto: {editing.landing_slug}</div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Anotações</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => updateMut.mutate({ id: editing.id, increment_followup: true })}>
                  + Follow-up manual
                </Button>
                <Button onClick={() => updateMut.mutate({ id: editing.id, status, notes })} disabled={updateMut.isPending}>
                  {updateMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-serif shimmer-text">Follow-ups automáticos</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Ativar envios automáticos</Label>
                  <p className="text-xs text-muted-foreground">Usa o SMTP configurado. Executa de hora em hora.</p>
                </div>
                <Switch checked={!!form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>Dias após o lead</Label>
                  <Input type="number" min={0} max={365} value={form.days_after_lead}
                    onChange={(e) => setForm({ ...form, days_after_lead: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Dias após último e-mail</Label>
                  <Input type="number" min={1} max={365} value={form.days_after_last_email}
                    onChange={(e) => setForm({ ...form, days_after_last_email: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Máximo de envios</Label>
                  <Input type="number" min={1} max={20} value={form.max_followups}
                    onChange={(e) => setForm({ ...form, max_followups: Number(e.target.value) })} />
                </div>
              </div>

              <div>
                <Label>Assunto</Label>
                <Input value={form.subject_template}
                  onChange={(e) => setForm({ ...form, subject_template: e.target.value })} />
              </div>

              <div>
                <Label>Corpo do e-mail</Label>
                <Textarea rows={8} value={form.body_template}
                  onChange={(e) => setForm({ ...form, body_template: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">
                  Variáveis disponíveis: <code>{"{{nome}}"}</code>, <code>{"{{produto}}"}</code>, <code>{"{{email}}"}</code>
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancelar</Button>
                <Button onClick={() => saveSettingsMut.mutate(form)} disabled={saveSettingsMut.isPending}>
                  {saveSettingsMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
