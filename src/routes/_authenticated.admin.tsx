import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Shield, MessageSquare, Save, Send, CheckCircle2, AlertTriangle, Users, Search, ShieldOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  checkIsAdmin,
  getTwilioSettings,
  saveTwilioSettings,
  sendTwilioTest,
  listAdminUsers,
  setUserAdmin,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const isAdminFn = useServerFn(checkIsAdmin);
  const { data: roleData, isLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => isAdminFn(),
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Carregando…</div>;
  }
  if (!roleData?.isAdmin) {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" /> Acesso restrito
          </CardTitle>
          <CardDescription>
            Este painel é exclusivo para super administradores. Peça a um admin para conceder seu acesso na tabela <code>user_roles</code>.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Shield className="size-6 text-gold" />
        <div>
          <h1 className="text-2xl font-serif shimmer-text">Painel do Super Admin</h1>
          <p className="text-sm text-muted-foreground">Configurações sensíveis e integrações.</p>
        </div>
      </header>

      <TwilioForm />
    </div>
  );
}

function TwilioForm() {
  const qc = useQueryClient();
  const loadFn = useServerFn(getTwilioSettings);
  const saveFn = useServerFn(saveTwilioSettings);
  const testFn = useServerFn(sendTwilioTest);

  const { data, isLoading } = useQuery({
    queryKey: ["twilio-settings"],
    queryFn: () => loadFn(),
  });

  const [form, setForm] = useState({
    account_sid: "",
    auth_token: "",
    whatsapp_from: "",
    messaging_service_sid: "",
    sms_from: "",
    enabled: false,
  });
  const [testTo, setTestTo] = useState("");
  const [testChannel, setTestChannel] = useState<"whatsapp" | "sms">("whatsapp");

  useEffect(() => {
    if (!data) return;
    setForm((f) => ({
      ...f,
      account_sid: data.account_sid,
      whatsapp_from: data.whatsapp_from,
      messaging_service_sid: data.messaging_service_sid,
      sms_from: data.sms_from,
      enabled: data.enabled,
    }));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => {
      toast.success("Configurações da Twilio salvas.");
      setForm((f) => ({ ...f, auth_token: "" }));
      qc.invalidateQueries({ queryKey: ["twilio-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testMut = useMutation({
    mutationFn: () => testFn({ data: { to: testTo, channel: testChannel } }),
    onSuccess: (r) => toast.success(`Mensagem enviada. SID: ${r.sid}`),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground">Carregando configurações…</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5 text-gold" /> Twilio (WhatsApp / SMS)
            </CardTitle>
            <CardDescription>
              Usada para enviar alertas de dias de pico, números mestres e lembretes de favoritos.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="enabled" className="text-sm">Ativa</Label>
            <Switch
              id="enabled"
              checked={form.enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sid">Account SID</Label>
            <Input
              id="sid"
              placeholder="AC••••••••••••••••••••••••••••••"
              value={form.account_sid}
              onChange={(e) => setForm((f) => ({ ...f, account_sid: e.target.value }))}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="token">
              Auth Token {data?.has_auth_token && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-500">
                  <CheckCircle2 className="size-3" /> salvo
                </span>
              )}
            </Label>
            <Input
              id="token"
              type="password"
              placeholder={data?.has_auth_token ? "•••••••••• (deixe vazio para manter)" : "Cole o Auth Token"}
              value={form.auth_token}
              onChange={(e) => setForm((f) => ({ ...f, auth_token: e.target.value }))}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wpp">Número WhatsApp remetente</Label>
            <Input
              id="wpp"
              placeholder="+14155238886 ou whatsapp:+14155238886"
              value={form.whatsapp_from}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp_from: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Use o número aprovado no Twilio Sandbox ou Business API.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sms">Número SMS remetente</Label>
            <Input
              id="sms"
              placeholder="+15558675310"
              value={form.sms_from}
              onChange={(e) => setForm((f) => ({ ...f, sms_from: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="msvc">Messaging Service SID (opcional)</Label>
            <Input
              id="msvc"
              placeholder="MG••••••••••••••••••••••••••••••"
              value={form.messaging_service_sid}
              onChange={(e) => setForm((f) => ({ ...f, messaging_service_sid: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Se preenchido, o Twilio usa esse serviço em vez do número remetente direto.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            <Save className="size-4 mr-2" />
            {saveMut.isPending ? "Salvando…" : "Salvar configurações"}
          </Button>
          {data?.updated_at && (
            <span className="text-xs text-muted-foreground">
              Atualizado em {new Date(data.updated_at).toLocaleString("pt-BR")}
            </span>
          )}
        </div>

        <div className="border-t border-border pt-5 space-y-3">
          <div>
            <h3 className="font-medium">Testar envio</h3>
            <p className="text-sm text-muted-foreground">
              Mande uma mensagem de teste para validar as credenciais.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Input
              placeholder="+5511999999999 (E.164)"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
            <select
              value={testChannel}
              onChange={(e) => setTestChannel(e.target.value as "whatsapp" | "sms")}
              className="h-10 px-3 rounded-md bg-background border border-input text-sm"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>
            <Button
              variant="secondary"
              onClick={() => testMut.mutate()}
              disabled={testMut.isPending || !testTo}
            >
              <Send className="size-4 mr-2" />
              {testMut.isPending ? "Enviando…" : "Enviar teste"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
