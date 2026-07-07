import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Save, MessageCircle, Trash2, CheckCircle2, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  adminGetHoroscopeLandingSettings,
  adminUpdateHoroscopeLandingSettings,
  adminListHoroscopeLeads,
  adminActivateHoroscopeLead,
  adminDeleteHoroscopeLead,
  adminConfigureEvolutionWebhook,
  adminTestEvolutionWebhook,
} from "@/lib/horoscope-landing.functions";

export function AdminHoroscopeLanding() {
  return (
    <div className="space-y-6">
      <SettingsBlock />
      <LeadsBlock />
    </div>
  );
}

function SettingsBlock() {
  const qc = useQueryClient();
  const getFn = useServerFn(adminGetHoroscopeLandingSettings);
  const saveFn = useServerFn(adminUpdateHoroscopeLandingSettings);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-horoscope-landing-settings"],
    queryFn: () => getFn(),
  });

  const [form, setForm] = useState<any>(null);

  // hydrate once
  if (data?.settings && form === null) setForm({ ...data.settings });

  const mutation = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => {
      toast.success("Configurações salvas!");
      qc.invalidateQueries({ queryKey: ["admin-horoscope-landing-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !form) {
    return (
      <Card><CardContent className="py-8 text-muted-foreground">Carregando…</CardContent></Card>
    );
  }

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-gold" /> Landing "Horóscopo Grátis"
        </CardTitle>
        <CardDescription>
          Configurações da página pública <code>/horoscopo-gratis</code> e da confirmação por WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <Label className="text-base">Landing ativa</Label>
            <p className="text-xs text-muted-foreground">Desative para exibir mensagem de "indisponível".</p>
          </div>
          <Switch checked={!!form.enabled} onCheckedChange={(v) => set("enabled", v)} />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Dias grátis</Label>
            <Input type="number" min={1} max={60} value={form.trial_days} onChange={(e) => set("trial_days", Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp oficial (E.164)</Label>
            <Input value={form.whatsapp_number_e164} onChange={(e) => set("whatsapp_number_e164", e.target.value)} placeholder="+5511999998888" />
          </div>
          <div className="space-y-1.5">
            <Label>Palavra-chave de ativação</Label>
            <Input value={form.activation_keyword} onChange={(e) => set("activation_keyword", e.target.value.toUpperCase())} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Título do hero</Label>
          <Input value={form.hero_title} onChange={(e) => set("hero_title", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Subtítulo do hero</Label>
          <Textarea rows={2} value={form.hero_subtitle} onChange={(e) => set("hero_subtitle", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Texto de consentimento (LGPD / Meta)</Label>
          <Textarea rows={3} value={form.consent_text} onChange={(e) => set("consent_text", e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Mensagem de sucesso (após envio)</Label>
            <Textarea rows={3} value={form.success_message} onChange={(e) => set("success_message", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Resposta automática (WhatsApp)</Label>
            <Textarea rows={3} value={form.confirmation_reply} onChange={(e) => set("confirmation_reply", e.target.value)} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Rótulo do botão CTA</Label>
            <Input value={form.cta_button_label} onChange={(e) => set("cta_button_label", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Link após fim do trial</Label>
            <Input value={form.trial_end_link ?? ""} onChange={(e) => set("trial_end_link", e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Mensagem ao final dos 7 dias</Label>
          <Textarea rows={2} value={form.trial_end_message} onChange={(e) => set("trial_end_message", e.target.value)} />
        </div>

        <EvolutionWebhookBlock />

        <div className="rounded-lg border border-gold/20 bg-gold/5 p-3 text-xs text-muted-foreground">
          <b className="text-gold">Webhook de ativação</b> — configure seu provedor WhatsApp (Evolution/Twilio) para chamar:
          <br />
          <code className="font-mono text-gold break-all">
            POST /api/public/hooks/horoscope-activation
          </code>
          <br />
          Envie o header <code>apikey: &lt;SUPABASE_PUBLISHABLE_KEY&gt;</code> e o payload nativo do provedor
          (Evolution ou Twilio). O sistema extrai o telefone + código e responde automaticamente.
        </div>

        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar configurações
        </Button>
      </CardContent>
    </Card>
  );
}

function EvolutionWebhookBlock() {
  const configureFn = useServerFn(adminConfigureEvolutionWebhook);
  const m = useMutation({
    mutationFn: () => configureFn(),
    onSuccess: (r: any) => toast.success(`Webhook configurado: ${r.webhookUrl}`),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-base flex items-center gap-2">
            <MessageCircle className="size-4 text-emerald-400" />
            Configurar webhook Evolution automaticamente
          </Label>
          <p className="text-xs text-muted-foreground">
            Aponta a instância configurada em "Evolution API" para o endpoint de ativação. Use após alterar a instância ou URL da API.
          </p>
        </div>
        <Button onClick={() => m.mutate()} disabled={m.isPending} variant="secondary" className="gap-2">
          {m.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          Configurar agora
        </Button>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending_confirmation: { label: "aguardando", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  active: { label: "ativo (trial)", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  expired: { label: "trial expirado", className: "bg-muted text-muted-foreground" },
  unsubscribed: { label: "cancelado", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

function LeadsBlock() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListHoroscopeLeads);
  const activateFn = useServerFn(adminActivateHoroscopeLead);
  const deleteFn = useServerFn(adminDeleteHoroscopeLead);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-horoscope-leads", page, search, status],
    queryFn: () => listFn({ data: { page, search: search || null, status: status || null } }),
  });

  const activate = useMutation({
    mutationFn: (id: string) => activateFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Lead ativado. Começa a receber amanhã.");
      qc.invalidateQueries({ queryKey: ["admin-horoscope-leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Lead removido.");
      qc.invalidateQueries({ queryKey: ["admin-horoscope-leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 25;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="size-5 text-gold" /> Leads capturados
        </CardTitle>
        <CardDescription>{total} lead(s) no total.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Buscar nome, e-mail, telefone ou código…" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} className="max-w-sm" />
          <select
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value); }}
            className="rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos</option>
            <option value="pending_confirmation">Aguardando</option>
            <option value="active">Ativo (trial)</option>
            <option value="expired">Expirado</option>
            <option value="unsubscribed">Cancelado</option>
          </select>
        </div>

        <div className="rounded-md border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Nome / Contato</th>
                <th className="px-3 py-2 font-medium">Signo</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Trial</th>
                <th className="px-3 py-2 font-medium">Criado</th>
                <th className="px-3 py-2 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading || isFetching ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Carregando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Nenhum lead ainda.</td></tr>
              ) : rows.map((r: any) => {
                const st = STATUS_LABEL[r.status] ?? { label: r.status, className: "" };
                return (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.full_name}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.phone_e164}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.sun_sign ?? "—"}</td>
                    <td className="px-3 py-2"><Badge className={st.className} variant="outline">{st.label}</Badge></td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(r.activation_code); toast.success("Código copiado."); }}
                        className="inline-flex items-center gap-1 text-gold hover:underline"
                      >
                        {r.activation_code} <Copy className="size-3" />
                      </button>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {r.trial_starts_on ? `${r.trial_starts_on} → ${r.trial_ends_on}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2 text-right space-x-1">
                      {r.status === "pending_confirmation" && (
                        <Button size="sm" variant="outline" onClick={() => activate.mutate(r.id)} className="gap-1">
                          <CheckCircle2 className="size-3.5" /> Ativar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => del.mutate(r.id)} className="text-destructive">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
