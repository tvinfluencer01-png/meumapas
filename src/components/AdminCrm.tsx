import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Mail, MessageCircle, Pause, Play, Send, Settings as SettingsIcon, History, GitBranch, RotateCcw, Trash2, ClipboardList, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showFeedback } from "@/components/system-feedback";
import { listCrmLeads, updateCrmLead, listCrmLeadStatusHistory, createCrmLead, deleteCrmLead } from "@/lib/product-orders.functions";
import {
  getCrmFollowupSettings,
  saveCrmFollowupSettings,
  runCrmFollowupsNow,
  listCrmFollowupHistory,
  listCrmTemplateVersions,
  deleteCrmTemplateVersion,
} from "@/lib/crm-followups.functions";
import { CrmStatusAutomationsDialog } from "@/components/CrmStatusAutomationsDialog";

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
  const listVersionsFn = useServerFn(listCrmTemplateVersions);
  const deleteVersionFn = useServerFn(deleteCrmTemplateVersion);
  const [historyLead, setHistoryLead] = useState<any | null>(null);
  const [auditLead, setAuditLead] = useState<any | null>(null);
  const auditFn = useServerFn(listCrmLeadStatusHistory);
  const { data: audit, isLoading: auditLoading } = useQuery({
    queryKey: ["admin-crm-lead-audit", auditLead?.id],
    queryFn: () => auditFn({ data: { leadId: auditLead.id } }),
    enabled: !!auditLead,
  });
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [compareVersion, setCompareVersion] = useState<any | null>(null);

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
  const [automationsOpen, setAutomationsOpen] = useState(false);
  const [form, setForm] = useState<any | null>(null);
  const [previewLeadId, setPreviewLeadId] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [versionNote, setVersionNote] = useState("");

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  function renderTemplate(tpl: string, lead: any) {
    const vars: Record<string, string> = {
      nome: lead?.full_name || "amigo(a)",
      produto: lead?.landing_slug || "nosso produto",
      email: lead?.email || "",
    };
    return (tpl ?? "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => vars[k] ?? "");
  }

  const previewLead =
    (leads ?? []).find((l: any) => l.id === previewLeadId) ??
    (leads ?? [])[0] ??
    { full_name: "Maria Silva", email: "maria@exemplo.com", landing_slug: "mapa-astral" };

  const updateMut = useMutation({
    mutationFn: (vars: any) => updateFn({ data: vars }),
    onSuccess: () => {
      showFeedback({ title: "Lead atualizado", type: "success" });
      qc.invalidateQueries({ queryKey: ["admin-crm-leads"] });
      setEditing(null);
    },
    onError: (e: Error) => showFeedback({ title: "Erro", description: e.message, type: "error" }),
  });

  const createFn = useServerFn(createCrmLead);
  const emptyQuick = { full_name: "", email: "", phone: "", landing_slug: "", notes: "", status: "new" as string };
  const [quickOpen, setQuickOpen] = useState(false);
  const [quick, setQuick] = useState(emptyQuick);
  const [quickErrors, setQuickErrors] = useState<Record<string, string>>({});

  const createMut = useMutation({
    mutationFn: (vars: any) => createFn({ data: vars }),
    onSuccess: () => {
      showFeedback({ title: "Lead criado", type: "success" });
      qc.invalidateQueries({ queryKey: ["admin-crm-leads"] });
      setQuickOpen(false);
      setQuick(emptyQuick);
      setQuickErrors({});
    },
    onError: (e: Error) => showFeedback({ title: "Erro ao criar lead", description: e.message, type: "error" }),
  });

  function openQuickCreate(statusKey: string) {
    setQuick({ ...emptyQuick, status: statusKey });
    setQuickErrors({});
    setQuickOpen(true);
  }

  function submitQuickCreate() {
    const errs: Record<string, string> = {};
    if (!quick.full_name.trim()) errs.full_name = "Informe o nome";
    else if (quick.full_name.trim().length > 120) errs.full_name = "Máximo 120 caracteres";
    const email = quick.email.trim();
    if (!email) errs.email = "Informe o e-mail";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "E-mail inválido";
    if (quick.phone && quick.phone.length > 40) errs.phone = "Máximo 40 caracteres";
    setQuickErrors(errs);
    if (Object.keys(errs).length) return;
    createMut.mutate({
      full_name: quick.full_name.trim(),
      email: email.toLowerCase(),
      phone: quick.phone.trim() || null,
      landing_slug: quick.landing_slug.trim() || null,
      notes: quick.notes.trim() || null,
      status: quick.status,
    });
  }

  const saveSettingsMut = useMutation({
    mutationFn: (vars: any) => saveSettingsFn({ data: vars }),
    onSuccess: (r: any) => {
      showFeedback({
        title: "Configurações salvas",
        description: r?.versioned ? "Nova versão dos templates registrada." : undefined,
        type: "success",
      });
      setVersionNote("");
      qc.invalidateQueries({ queryKey: ["admin-crm-followup-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-crm-template-versions"] });
      setSettingsOpen(false);
    },
    onError: (e: Error) => showFeedback({ title: "Erro", description: e.message, type: "error" }),
  });

  const { data: versions } = useQuery({
    queryKey: ["admin-crm-template-versions"],
    queryFn: () => listVersionsFn(),
    enabled: settingsOpen || versionsOpen,
  });

  const deleteVersionMut = useMutation({
    mutationFn: (id: string) => deleteVersionFn({ data: { id } }),
    onSuccess: () => {
      showFeedback({ title: "Versão removida", type: "success" });
      qc.invalidateQueries({ queryKey: ["admin-crm-template-versions"] });
    },
    onError: (e: Error) => showFeedback({ title: "Erro", description: e.message, type: "error" }),
  });

  function restoreVersion(v: any) {
    if (!form) return;
    setForm({ ...form, subject_template: v.subject_template, body_template: v.body_template });
    setVersionNote(`Restaurado de ${new Date(v.created_at).toLocaleString("pt-BR")}`);
    setCompareVersion(null);
    setVersionsOpen(false);
    showFeedback({
      title: "Versão restaurada no formulário",
      description: "Clique em Salvar para aplicar.",
      type: "info",
    });
  }

  function diffLines(a: string, b: string) {
    const al = (a ?? "").split("\n");
    const bl = (b ?? "").split("\n");
    const max = Math.max(al.length, bl.length);
    const out: Array<{ kind: "same" | "old" | "new"; text: string }> = [];
    for (let i = 0; i < max; i++) {
      const x = al[i];
      const y = bl[i];
      if (x === y) {
        if (x !== undefined) out.push({ kind: "same", text: x });
      } else {
        if (x !== undefined) out.push({ kind: "old", text: x });
        if (y !== undefined) out.push({ kind: "new", text: y });
      }
    }
    return out;
  }


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
            <Button size="sm" variant="outline" onClick={() => setAutomationsOpen(true)}>
              <SettingsIcon className="size-4 mr-1" />Automações por status
            </Button>
            <Button size="sm" onClick={() => openQuickCreate("new")}>
              <Plus className="size-4 mr-1" />Novo lead
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {Object.entries(STATUS_LABEL).map(([statusKey, meta]) => {
              const columnLeads = filtered.filter((l: any) => (l.status ?? "new") === statusKey);
              return (
                <div
                  key={statusKey}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-1", "ring-gold/40"); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove("ring-1", "ring-gold/40")}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("ring-1", "ring-gold/40");
                    const id = e.dataTransfer.getData("text/plain");
                    const lead = (leads ?? []).find((x: any) => x.id === id);
                    if (id && lead && lead.status !== statusKey) {
                      updateMut.mutate({ id, status: statusKey, source: "kanban", change_note: `Movido para ${STATUS_LABEL[statusKey].label} via Kanban` });
                    }
                  }}
                  className="rounded-lg border border-border/40 bg-secondary/20 p-2 min-h-[400px] flex flex-col"
                >
                  <div className={`px-2 py-1 mb-2 rounded text-xs border flex items-center justify-between gap-2 ${meta.color}`}>
                    <span className="font-semibold">{meta.label}</span>
                    <div className="flex items-center gap-1">
                      <span className="opacity-80">{columnLeads.length}</span>
                      <button
                        type="button"
                        title="Adicionar lead nesta coluna"
                        onClick={() => openQuickCreate(statusKey)}
                        className="rounded p-0.5 hover:bg-background/30"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 flex-1">
                    {columnLeads.map((l: any) => {
                      const next = nextFollowupFor(l, settings);
                      return (
                        <div
                          key={l.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("text/plain", l.id)}
                          onClick={() => openEdit(l)}
                          className="rounded-md border border-border/40 bg-background/60 p-2 text-xs cursor-grab active:cursor-grabbing hover:border-gold/40 transition"
                        >
                          <div className="font-medium text-sm truncate">{l.full_name ?? "—"}</div>
                          <div className="text-muted-foreground truncate">{l.email}</div>
                          {l.landing_slug && (
                            <div className="mt-1 text-[11px] text-muted-foreground truncate">📦 {l.landing_slug}</div>
                          )}
                          <div className="mt-2 flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
                            <span>FU: {l.followup_count ?? 0}{settings ? `/${settings.max_followups}` : ""}</span>
                            <span>{fmtDate(l.created_at)}</span>
                          </div>
                          {next && !l.followup_paused && (
                            <div className={`mt-1 text-[11px] ${next.getTime() <= Date.now() ? "text-emerald-300" : "text-muted-foreground"}`}>
                              Próx.: {next.toLocaleDateString("pt-BR")}
                            </div>
                          )}
                          {l.followup_paused && <div className="mt-1 text-[11px] text-amber-300">Pausado</div>}
                          <div className="mt-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button size="icon" variant="ghost" asChild title="E-mail" className="h-6 w-6">
                              <a href={`mailto:${l.email}`}><Mail className="size-3" /></a>
                            </Button>
                            {l.phone && (
                              <Button size="icon" variant="ghost" asChild title="WhatsApp" className="h-6 w-6">
                                <a href={`https://wa.me/${String(l.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                                  <MessageCircle className="size-3" />
                                </a>
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              title={l.followup_paused ? "Retomar" : "Pausar"}
                              onClick={() => updateMut.mutate({ id: l.id, followup_paused: !l.followup_paused })}
                            >
                              {l.followup_paused ? <Play className="size-3" /> : <Pause className="size-3" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" title="Histórico de follow-ups" onClick={() => setHistoryLead(l)}>
                              <History className="size-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" title="Auditoria de status" onClick={() => setAuditLead(l)}>
                              <ClipboardList className="size-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {columnLeads.length === 0 && (
                      <div className="text-[11px] text-muted-foreground text-center py-6 border border-dashed border-border/30 rounded">
                        Arraste leads aqui
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
                <Button onClick={() => updateMut.mutate({ id: editing.id, status, notes, source: "edit" })} disabled={updateMut.isPending}>
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

              <div className="rounded border border-gold/30 p-3 space-y-2 bg-secondary/20">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm">Pré-visualização</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowPreview((v) => !v)}>
                    {showPreview ? "Ocultar" : "Mostrar"}
                  </Button>
                </div>
                {showPreview && (
                  <>
                    <div>
                      <Label className="text-xs">Lead de exemplo</Label>
                      <Select value={previewLeadId || (previewLead?.id ?? "")} onValueChange={setPreviewLeadId}>
                        <SelectTrigger><SelectValue placeholder="Selecione um lead..." /></SelectTrigger>
                        <SelectContent>
                          {(leads ?? []).slice(0, 50).map((l: any) => (
                            <SelectItem key={l.id} value={l.id}>
                              {(l.full_name ?? "—")} · {l.email}
                            </SelectItem>
                          ))}
                          {(leads ?? []).length === 0 && (
                            <SelectItem value="__demo">Maria Silva · maria@exemplo.com (demo)</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Renderizado para: <strong>{previewLead?.full_name ?? "—"}</strong> ({previewLead?.email}) · {previewLead?.landing_slug ?? "—"}
                    </div>
                    <div className="rounded bg-background/60 p-2">
                      <div className="text-[10px] uppercase text-muted-foreground">Assunto</div>
                      <div className="text-sm">{renderTemplate(form.subject_template, previewLead)}</div>
                    </div>
                    <div className="rounded bg-background/60 p-2">
                      <div className="text-[10px] uppercase text-muted-foreground">Corpo</div>
                      <div className="text-sm whitespace-pre-wrap">{renderTemplate(form.body_template, previewLead)}</div>
                    </div>
                  </>
                )}
              </div>

              <div className="rounded border border-border/40 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Label className="text-sm">Versionamento dos templates</Label>
                    <p className="text-xs text-muted-foreground">
                      Cada alteração de assunto/corpo cria uma versão. {versions?.length ?? 0} versão(ões) registradas.
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => setVersionsOpen(true)}>
                    <GitBranch className="size-4 mr-1" />Histórico
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">Nota da nova versão (opcional)</Label>
                  <Input
                    placeholder="Ex.: ajustei o tom para soar mais próximo"
                    value={versionNote}
                    onChange={(e) => setVersionNote(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => saveSettingsMut.mutate({ ...form, version_note: versionNote || undefined })}
                  disabled={saveSettingsMut.isPending}
                >
                  {saveSettingsMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyLead} onOpenChange={(o) => !o && setHistoryLead(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif shimmer-text">
              Histórico de follow-ups
            </DialogTitle>
            {historyLead && (
              <p className="text-xs text-muted-foreground">
                {historyLead.full_name ?? historyLead.email} — {historyLead.email}
              </p>
            )}
          </DialogHeader>
          {historyLoading ? (
            <div className="py-8 text-center"><Loader2 className="size-5 animate-spin inline" /></div>
          ) : !history || history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum follow-up registrado para este lead.
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="text-left p-2">Data</th>
                    <th className="text-left p-2">Tentativa</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Assunto</th>
                    <th className="text-left p-2">Motivo da falha</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => {
                    const cls =
                      h.status === "sent"
                        ? "bg-emerald-600/30 text-emerald-200 border-emerald-500/40"
                        : h.status === "failed"
                          ? "bg-red-600/30 text-red-200 border-red-500/40"
                          : "bg-amber-600/30 text-amber-200 border-amber-500/40";
                    const label =
                      h.status === "sent" ? "Enviado" : h.status === "failed" ? "Falhou" : "Tentativa";
                    return (
                      <tr key={h.id} className="border-b border-border/20 align-top">
                        <td className="p-2 text-xs whitespace-nowrap">
                          {new Date(h.created_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="p-2 text-xs">#{h.attempt_number}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs border ${cls}`}>{label}</span>
                        </td>
                        <td className="p-2 text-xs">{h.subject ?? "—"}</td>
                        <td className="p-2 text-xs text-red-200">{h.error_message ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif shimmer-text">Versões dos templates</DialogTitle>
          </DialogHeader>
          {!versions || versions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma versão registrada ainda. A próxima alteração de assunto/corpo será salva como versão.
            </p>
          ) : (
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="text-left p-2">Data</th>
                    <th className="text-left p-2">Assunto</th>
                    <th className="text-left p-2">Nota</th>
                    <th className="text-right p-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v: any, idx: number) => {
                    const isCurrent = idx === 0;
                    return (
                      <tr key={v.id} className="border-b border-border/20 align-top">
                        <td className="p-2 text-xs whitespace-nowrap">
                          {new Date(v.created_at).toLocaleString("pt-BR")}
                          {isCurrent && (
                            <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-emerald-600/30 text-emerald-200 border border-emerald-500/40">
                              Atual
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-xs max-w-[260px] truncate" title={v.subject_template}>
                          {v.subject_template}
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">{v.note ?? "—"}</td>
                        <td className="p-2 text-right">
                          <div className="inline-flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => setCompareVersion(v)}>
                              Comparar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => restoreVersion(v)}
                              disabled={isCurrent}
                              title={isCurrent ? "Já é a versão atual" : "Restaurar no formulário"}
                            >
                              <RotateCcw className="size-3.5 mr-1" />Restaurar
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Excluir versão"
                              disabled={isCurrent || deleteVersionMut.isPending}
                              onClick={() => {
                                if (confirm("Excluir esta versão do histórico?")) {
                                  deleteVersionMut.mutate(v.id);
                                }
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!compareVersion} onOpenChange={(o) => !o && setCompareVersion(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif shimmer-text">Comparar com versão atual</DialogTitle>
            {compareVersion && (
              <p className="text-xs text-muted-foreground">
                Versão de {new Date(compareVersion.created_at).toLocaleString("pt-BR")}
                {compareVersion.note ? ` — ${compareVersion.note}` : ""}
              </p>
            )}
          </DialogHeader>
          {compareVersion && form && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {(["subject_template", "body_template"] as const).map((field) => {
                const label = field === "subject_template" ? "Assunto" : "Corpo";
                const oldText = compareVersion[field] ?? "";
                const newText = form[field] ?? "";
                const lines = diffLines(oldText, newText);
                return (
                  <div key={field}>
                    <Label className="text-sm">{label}</Label>
                    <div className="rounded border border-border/40 bg-background/60 font-mono text-xs">
                      {lines.length === 0 ? (
                        <div className="p-2 text-muted-foreground">(vazio)</div>
                      ) : (
                        lines.map((ln, i) => (
                          <div
                            key={i}
                            className={
                              ln.kind === "old"
                                ? "px-2 py-0.5 bg-red-500/15 text-red-200"
                                : ln.kind === "new"
                                  ? "px-2 py-0.5 bg-emerald-500/15 text-emerald-200"
                                  : "px-2 py-0.5"
                            }
                          >
                            <span className="inline-block w-4 select-none opacity-60">
                              {ln.kind === "old" ? "−" : ln.kind === "new" ? "+" : " "}
                            </span>
                            {ln.text || "\u00A0"}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
              <p className="text-[11px] text-muted-foreground">
                <span className="text-red-300">Vermelho</span>: versão antiga ·{" "}
                <span className="text-emerald-300">Verde</span>: atual no formulário
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCompareVersion(null)}>Fechar</Button>
                <Button onClick={() => restoreVersion(compareVersion)}>
                  <RotateCcw className="size-4 mr-1" />Restaurar esta versão
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!auditLead} onOpenChange={(o) => !o && setAuditLead(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif shimmer-text">Auditoria de status</DialogTitle>
          </DialogHeader>
          {auditLead && (
            <div className="space-y-3">
              <div className="text-sm">
                <strong>{auditLead.full_name ?? auditLead.email}</strong>
                <div className="text-xs text-muted-foreground">{auditLead.email}</div>
              </div>
              {auditLoading ? (
                <div className="py-6 text-center"><Loader2 className="size-5 animate-spin inline" /></div>
              ) : !audit || audit.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Sem mudanças registradas ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {audit.map((h: any) => {
                    const fromMeta = h.from_status ? STATUS_LABEL[h.from_status] : null;
                    const toMeta = STATUS_LABEL[h.to_status] ?? STATUS_LABEL.new;
                    return (
                      <li key={h.id} className="border border-border/40 rounded p-2 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          {fromMeta ? (
                            <span className={`px-2 py-0.5 rounded border ${fromMeta.color}`}>{fromMeta.label}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          <ArrowRight className="size-3 text-muted-foreground" />
                          <span className={`px-2 py-0.5 rounded border ${toMeta.color}`}>{toMeta.label}</span>
                          <span className="ml-auto text-muted-foreground">
                            {new Date(h.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          Origem: <span className="text-foreground">{h.source ?? "system"}</span>
                          {h.changed_by_email && <> · Por: <span className="text-foreground">{h.changed_by_email}</span></>}
                        </div>
                        {h.note && <div className="mt-1 italic">"{h.note}"</div>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <CrmStatusAutomationsDialog open={automationsOpen} onOpenChange={setAutomationsOpen} />

      <Dialog open={quickOpen} onOpenChange={(o) => { if (!o) { setQuickOpen(false); setQuickErrors({}); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif shimmer-text">Novo lead</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => { e.preventDefault(); submitQuickCreate(); }}
          >
            <div>
              <Label>Nome completo *</Label>
              <Input
                value={quick.full_name}
                maxLength={120}
                onChange={(e) => setQuick({ ...quick, full_name: e.target.value })}
                autoFocus
              />
              {quickErrors.full_name && <p className="text-xs text-red-400 mt-1">{quickErrors.full_name}</p>}
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={quick.email}
                maxLength={255}
                onChange={(e) => setQuick({ ...quick, email: e.target.value })}
              />
              {quickErrors.email && <p className="text-xs text-red-400 mt-1">{quickErrors.email}</p>}
            </div>
            <div>
              <Label>Telefone (WhatsApp)</Label>
              <Input
                value={quick.phone}
                maxLength={40}
                placeholder="55 11 99999-9999"
                onChange={(e) => setQuick({ ...quick, phone: e.target.value })}
              />
              {quickErrors.phone && <p className="text-xs text-red-400 mt-1">{quickErrors.phone}</p>}
            </div>
            <div>
              <Label>Produto / Landing</Label>
              <Input
                value={quick.landing_slug}
                maxLength={120}
                placeholder="ex.: mapa-astral"
                onChange={(e) => setQuick({ ...quick, landing_slug: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={quick.status} onValueChange={(v) => setQuick({ ...quick, status: v })}>
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
              <Textarea
                value={quick.notes}
                maxLength={2000}
                rows={3}
                onChange={(e) => setQuick({ ...quick, notes: e.target.value })}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setQuickOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "Criar lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
