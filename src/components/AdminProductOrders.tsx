import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ExternalLink, Eye, CheckCircle2, AlertTriangle, FileText, Send, KeyRound, BadgeCheck, MessageCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LandingFieldsForm } from "@/components/LandingFieldsForm";
import { showFeedback } from "@/components/system-feedback";
import {
  listAdminOrders,
  markOrdersViewed,
  updateOrderStatus,
  updateOrderCustomerData,
  dispatchProductOrder,
  getDispatchSettings,
  saveDispatchSettings,
} from "@/lib/product-orders.functions";
import { adminBackfillProductOrderCommissions } from "@/modules/affiliate/admin.functions";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "Aguardando pagamento", color: "bg-amber-600/30 text-amber-300 border border-amber-500/40" },
  paid: { label: "Pago", color: "bg-emerald-600/30 text-emerald-200 border border-emerald-500/40" },
  processing: { label: "Processando", color: "bg-blue-600/30 text-blue-200 border border-blue-500/40" },
  delivered: { label: "Entregue", color: "bg-green-700/30 text-green-200 border border-green-500/40" },
  failed: { label: "Falhou", color: "bg-red-600/30 text-red-200 border border-red-500/40" },
  refunded: { label: "Reembolsado", color: "bg-gray-600/30 text-gray-200 border border-gray-500/40" },
};

export function AdminProductOrders() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminOrders);
  const markFn = useServerFn(markOrdersViewed);
  const updateFn = useServerFn(updateOrderStatus);
  const dispatchFn = useServerFn(dispatchProductOrder);
  const getSettingsFn = useServerFn(getDispatchSettings);
  const saveSettingsFn = useServerFn(saveDispatchSettings);
  const backfillFn = useServerFn(adminBackfillProductOrderCommissions);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-product-orders"],
    queryFn: () => listFn(),
    refetchInterval: 30_000,
  });

  const { data: settings } = useQuery({
    queryKey: ["dispatch-settings"],
    queryFn: () => getSettingsFn(),
  });

  const [autoEnabled, setAutoEnabled] = useState(false);
  const [delayValue, setDelayValue] = useState<number>(5);
  const [delayUnit, setDelayUnit] = useState<"minutes" | "hours" | "days">("minutes");
  useEffect(() => {
    if (settings) {
      setAutoEnabled(settings.auto_enabled);
      const m = settings.delay_minutes ?? 0;
      if (m > 0 && m % 1440 === 0) { setDelayUnit("days"); setDelayValue(m / 1440); }
      else if (m > 0 && m % 60 === 0) { setDelayUnit("hours"); setDelayValue(m / 60); }
      else { setDelayUnit("minutes"); setDelayValue(m); }
    }
  }, [settings]);

  const delayMin = delayUnit === "days" ? delayValue * 1440 : delayUnit === "hours" ? delayValue * 60 : delayValue;

  const settingsMutation = useMutation({
    mutationFn: () => saveSettingsFn({ data: { auto_enabled: autoEnabled, delay_minutes: delayMin } }),
    onSuccess: () => {
      showFeedback({ title: "Configurações salvas", type: "success" });
      qc.invalidateQueries({ queryKey: ["dispatch-settings"] });
    },
    onError: (e: Error) => showFeedback({ title: "Erro", description: e.message, type: "error" }),
  });


  // Marca todos como visualizados ao abrir
  useEffect(() => {
    markFn().then(() => {
      qc.invalidateQueries({ queryKey: ["admin-unviewed-orders"] });
    }).catch(() => {});
  }, [markFn, qc]);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const updateCustomerFn = useServerFn(updateOrderCustomerData);

  const editMutation = useMutation({
    mutationFn: (vars: { id: string; customer_data: Record<string, string> }) =>
      updateCustomerFn({ data: vars }),
    onSuccess: () => {
      showFeedback({ title: "Dados do cliente atualizados", type: "success" });
      qc.invalidateQueries({ queryKey: ["admin-product-orders"] });
      setEditing(null);
    },
    onError: (e: Error) => showFeedback({ title: "Erro", description: e.message, type: "error" }),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; status: any; pdf_url?: string | null }) =>
      updateFn({ data: vars }),
    onSuccess: () => {
      showFeedback({ title: "Pedido atualizado", type: "success" });
      qc.invalidateQueries({ queryKey: ["admin-product-orders"] });
      setSelected(null);
    },
    onError: (e: Error) => showFeedback({ title: "Erro", description: e.message, type: "error" }),
  });

  const [resendState, setResendState] = useState<Record<string, { status: "pending" | "success" | "error"; message?: string; at?: number }>>({});
  const resendKey = (id: string, action: "email" | "whatsapp") => `${id}:${action}`;

  const dispatchMutation = useMutation({
    mutationFn: (vars: { id: string; action: "pdf" | "email" | "both" | "password_setup" | "whatsapp" }) =>
      dispatchFn({ data: vars }),
    onMutate: (vars) => setDispatchingId(vars.id),
    onSettled: () => setDispatchingId(null),
    onSuccess: (_, vars) => {
      showFeedback({
        title:
          vars.action === "pdf" ? "PDF gerado"
          : vars.action === "email" ? "E-mail enviado"
          : vars.action === "password_setup" ? "E-mail de definição de senha enviado"
          : "Pedido despachado",
        type: "success",
      });
      qc.invalidateQueries({ queryKey: ["admin-product-orders"] });
    },
    onError: (e: Error) => showFeedback({ title: "Erro ao despachar", description: e.message, type: "error" }),
  });

  const resendMutation = useMutation({
    mutationFn: (vars: { id: string; action: "email" | "whatsapp" }) =>
      dispatchFn({ data: vars }),
    onMutate: (vars) => {
      setResendState((s) => ({ ...s, [resendKey(vars.id, vars.action)]: { status: "pending" } }));
    },
    onSuccess: (_, vars) => {
      setResendState((s) => ({ ...s, [resendKey(vars.id, vars.action)]: { status: "success", at: Date.now() } }));
      showFeedback({
        title: vars.action === "email" ? "E-mail reenviado" : "WhatsApp reenviado",
        description: "Usando a URL curta do PDF já registrada.",
        type: "success",
      });
      qc.invalidateQueries({ queryKey: ["admin-product-orders"] });
    },
    onError: (e: Error, vars) => {
      setResendState((s) => ({ ...s, [resendKey(vars.id, vars.action)]: { status: "error", message: e.message, at: Date.now() } }));
      showFeedback({ title: "Falha ao reenviar", description: e.message, type: "error" });
    },
  });


  const filtered = (orders ?? []).filter((o: any) => {
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        (o.user_email ?? "").toLowerCase().includes(s) ||
        (o.user_name ?? "").toLowerCase().includes(s) ||
        (o.landing?.title ?? "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="font-serif shimmer-text">Envio Automático</CardTitle>
          <CardDescription>
            Quando ligado, os pedidos pagos são processados automaticamente (PDF + e-mail) após o tempo de espera.
            Quando desligado, use os ícones em cada pedido pago para enviar manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} id="auto-dispatch" />
            <Label htmlFor="auto-dispatch">Envio automático ativado</Label>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="delay-val">Delay</Label>
            <div className="flex gap-2">
              <Input
                id="delay-val"
                type="number"
                min={0}
                value={delayValue}
                onChange={(e) => setDelayValue(Number(e.target.value) || 0)}
                disabled={!autoEnabled}
                className="w-28"
              />
              <Select value={delayUnit} onValueChange={(v) => setDelayUnit(v as any)} disabled={!autoEnabled}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutos</SelectItem>
                  <SelectItem value="hours">Horas</SelectItem>
                  <SelectItem value="days">Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={() => settingsMutation.mutate()} disabled={settingsMutation.isPending}>
            {settingsMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="font-serif shimmer-text">Pedidos de Produtos Avulsos</CardTitle>
          <CardDescription>Pedidos das landing pages individuais (Mapa Astral, Numerologia, etc.)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar por cliente ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="ml-auto bg-gold text-black hover:bg-gold/90"
              size="sm"
              onClick={async () => {
                try {
                  const r = await backfillFn();
                  showFeedback({ title: "Backfill concluído", description: `Total: ${r.total} · Creditados: ${r.credited} · Ignorados: ${r.skipped}`, type: "success" });
                  qc.invalidateQueries({ queryKey: ["admin-product-orders"] });
                } catch (e: any) {
                  showFeedback({ title: "Erro no backfill", description: e?.message ?? "Falha", type: "error" });
                }
              }}
            >
              ⚡ Backfill comissões
            </Button>
          </div>


          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Carregando…</div>
          ) : !filtered.length ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((o: any) => {
                const st = STATUS_LABEL[o.status] ?? { label: o.status, color: "bg-secondary" };
                const canDispatch = ["paid", "processing", "failed"].includes(o.status);
                const busy = dispatchingId === o.id;
                return (
                  <div key={o.id} className="flex flex-col gap-2 rounded-lg border border-gold/20 bg-secondary/30 p-3 sm:flex-row sm:items-center">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif text-gold truncate">{o.landing?.title ?? "—"}</span>
                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold ${st.color}`}>{st.label}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-1 items-center">
                        <span>{o.user_name ?? "—"} · {o.user_email ?? "—"}</span>
                        <span>R$ {(o.amount_cents / 100).toFixed(2)}</span>
                        <span>{new Date(o.created_at).toLocaleString("pt-BR")}</span>
                        {o.email_sent_at && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-600/20 text-emerald-300 border border-emerald-500/30">
                            <Send className="size-3" /> E-mail enviado {new Date(o.email_sent_at).toLocaleString("pt-BR")}
                          </span>
                        )}
                        {o.whatsapp_sent_at && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-600/20 text-emerald-300 border border-emerald-500/30">
                            <MessageCircle className="size-3" /> WhatsApp enviado {new Date(o.whatsapp_sent_at).toLocaleString("pt-BR")}
                          </span>
                        )}
                        {o.error_message && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600/20 text-red-300 border border-red-500/30 max-w-[320px] truncate"
                            title={o.error_message}
                          >
                            <AlertTriangle className="size-3" /> Erro: {o.error_message}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {canDispatch && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Gerar e anexar PDF"
                            disabled={busy}
                            onClick={() => dispatchMutation.mutate({ id: o.id, action: "pdf" })}
                          >
                            {busy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Enviar e-mail com PDF"
                            disabled={busy}
                            onClick={() => dispatchMutation.mutate({ id: o.id, action: "both" })}
                          >
                            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Enviar PDF por WhatsApp"
                            disabled={busy}
                            onClick={() => dispatchMutation.mutate({ id: o.id, action: "whatsapp" })}
                          >
                            {busy ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4 text-emerald-400" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Enviar e-mail de definição de senha"
                            disabled={busy}
                            onClick={() => dispatchMutation.mutate({ id: o.id, action: "password_setup" })}
                          >
                            {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                          </Button>
                        </>
                      )}
                      {o.pdf_url && (o.email_sent_at || o.whatsapp_sent_at) && (() => {
                        const emailR = resendState[resendKey(o.id, "email")];
                        const waR = resendState[resendKey(o.id, "whatsapp")];
                        const emailBusy = emailR?.status === "pending";
                        const waBusy = waR?.status === "pending";
                        return (
                          <>
                            {o.email_sent_at && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title={emailR?.status === "error" ? `Falhou: ${emailR.message}` : "Reenviar e-mail (URL curta já registrada)"}
                                disabled={emailBusy}
                                onClick={() => resendMutation.mutate({ id: o.id, action: "email" })}
                                className={
                                  emailR?.status === "success" ? "ring-1 ring-emerald-400/60" :
                                  emailR?.status === "error" ? "ring-1 ring-red-500/60" : ""
                                }
                              >
                                {emailBusy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 text-blue-300" />}
                              </Button>
                            )}
                            {o.whatsapp_sent_at && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title={waR?.status === "error" ? `Falhou: ${waR.message}` : "Reenviar WhatsApp (URL curta já registrada)"}
                                disabled={waBusy}
                                onClick={() => resendMutation.mutate({ id: o.id, action: "whatsapp" })}
                                className={
                                  waR?.status === "success" ? "ring-1 ring-emerald-400/60" :
                                  waR?.status === "error" ? "ring-1 ring-red-500/60" : ""
                                }
                              >
                                {waBusy ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4 text-emerald-300" />}
                              </Button>
                            )}
                          </>
                        );
                      })()}

                      {!["paid", "processing", "delivered"].includes(o.status) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Aprovar pagamento manualmente"
                          disabled={updateMutation.isPending}
                          onClick={() => {
                            if (confirm(`Confirmar aprovação manual do pagamento deste pedido (R$ ${(o.amount_cents / 100).toFixed(2)})?`)) {
                              updateMutation.mutate({ id: o.id, status: "paid" });
                            }
                          }}
                        >
                          <BadgeCheck className="size-4 text-emerald-400" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setSelected(o)}>
                        <Eye className="size-4 mr-1" /> Ver
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>


      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-gold/30">
          <DialogHeader>
            <DialogTitle className="font-serif shimmer-text">Pedido #{selected?.id?.slice(0, 8)}</DialogTitle>
            <DialogDescription>{selected?.landing?.title}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <Field label="Cliente" value={`${selected.user_name ?? "—"} (${selected.user_email ?? "—"})`} />
              <Field label="Valor" value={`R$ ${(selected.amount_cents / 100).toFixed(2)}`} />
              <Field label="Status atual" value={STATUS_LABEL[selected.status]?.label ?? selected.status} />
              <Field label="Pagamento MP" value={selected.mp_payment_id ?? "—"} />
              <div>
                <div className="text-xs uppercase text-gold/70 mb-1">Dados do formulário</div>
                <pre className="bg-secondary/40 p-3 rounded text-xs overflow-auto max-h-60">{JSON.stringify(selected.customer_data, null, 2)}</pre>
              </div>
              {selected.pdf_url && (
                <Field label="PDF entregue" value={<a href={selected.pdf_url} target="_blank" rel="noreferrer" className="text-gold underline inline-flex items-center gap-1">Abrir <ExternalLink className="size-3" /></a>} />
              )}
              {selected.error_message && (
                <Field label="Erro" value={<span className="text-destructive">{selected.error_message}</span>} />
              )}

              <div className="pt-2 border-t border-gold/20">
                <div className="text-xs uppercase text-gold/70 mb-2">Alterar status</div>
                <div className="flex flex-wrap gap-2">
                  {selected.status !== "processing" && selected.status === "paid" && (
                    <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: selected.id, status: "processing" })}>
                      Marcar processando
                    </Button>
                  )}
                  {selected.status !== "delivered" && (
                    <Button size="sm" onClick={() => updateMutation.mutate({ id: selected.id, status: "delivered" })}>
                      <CheckCircle2 className="size-4 mr-1" /> Marcar entregue
                    </Button>
                  )}
                  {selected.status !== "failed" && (
                    <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: selected.id, status: "failed" })}>
                      <AlertTriangle className="size-4 mr-1" /> Marcar falha
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelected(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-gold/70">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
