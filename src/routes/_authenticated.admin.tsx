import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Shield, MessageSquare, Save, Send, CheckCircle2, AlertTriangle, Users, Search, ShieldOff, ShieldCheck, History, RefreshCw, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsForm } from "@/components/SettingsForm";
import { toast } from "sonner";
import { confirmDialog } from "@/components/system-feedback";
import {
  checkIsAdmin,
  getTwilioSettings,
  saveTwilioSettings,
  sendTwilioTest,
  testTwilioCredentials,
  listAdminUsers,
  setUserAdmin,
  listRoleAuditLog,
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
          <p className="text-sm text-muted-foreground">Configurações sensíveis, integrações e gestão de usuários.</p>
        </div>
      </header>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="settings" className="gap-2">
            <SettingsIcon className="size-4" /> Configurações
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="size-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <History className="size-4" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="twilio" className="gap-2">
            <MessageSquare className="size-4" /> Twilio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-0">
          <SettingsForm />
        </TabsContent>
        <TabsContent value="users" className="mt-0">
          <UsersAdmin />
        </TabsContent>
        <TabsContent value="audit" className="mt-0">
          <RoleAuditLog />
        </TabsContent>
        <TabsContent value="twilio" className="mt-0">
          <TwilioForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsersAdmin() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminUsers);
  const setFn = useServerFn(setUserAdmin);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-users", search, page],
    queryFn: () => listFn({ data: { search, page } }),
  });

  const mut = useMutation({
    mutationFn: (vars: { user_id: string; is_admin: boolean }) =>
      setFn({ data: vars }),
    onSuccess: (_r, vars) => {
      toast.success(vars.is_admin ? "Usuário promovido a admin." : "Acesso de admin removido.");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["role-audit-log"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5 text-gold" /> Usuários e permissões
        </CardTitle>
        <CardDescription>
          Promova ou remova o acesso de administrador. Mostra até 50 usuários por página.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por e-mail ou nome…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
              maxLength={120}
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Button
              variant="outline" size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >Anterior</Button>
            <span className="text-muted-foreground">Página {page}</span>
            <Button
              variant="outline" size="sm"
              disabled={!data?.hasMore || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >Próxima</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-sm">Carregando usuários…</div>
        ) : !data?.users.length ? (
          <div className="text-muted-foreground text-sm">Nenhum usuário encontrado.</div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Usuário</th>
                  <th className="px-3 py-2 font-medium">Criado em</th>
                  <th className="px-3 py-2 font-medium">Papel</th>
                  <th className="px-3 py-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">{u.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {u.is_admin ? (
                        <span className="inline-flex items-center gap-1 text-gold text-xs">
                          <ShieldCheck className="size-3" /> Admin
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Usuário</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {u.is_admin ? (
                        <Button
                          size="sm" variant="outline"
                          disabled={mut.isPending}
                          onClick={async () => {
                            const ok = await confirmDialog({
                              title: "Remover acesso de admin?",
                              description: `O usuário ${u.email} perderá os privilégios de Super Admin.`,
                              confirmText: "Remover admin",
                              destructive: true,
                            });
                            if (ok) mut.mutate({ user_id: u.id, is_admin: false });
                          }}
                        >
                          <ShieldOff className="size-3 mr-1" /> Remover admin
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={mut.isPending}
                          onClick={() => mut.mutate({ user_id: u.id, is_admin: true })}
                        >
                          <ShieldCheck className="size-3 mr-1" /> Promover
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TwilioForm() {
  const qc = useQueryClient();
  const loadFn = useServerFn(getTwilioSettings);
  const saveFn = useServerFn(saveTwilioSettings);
  const testFn = useServerFn(sendTwilioTest);
  const testCredsFn = useServerFn(testTwilioCredentials);

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

  const testCredsMut = useMutation({
    mutationFn: () =>
      testCredsFn({
        data: { account_sid: form.account_sid, auth_token: form.auth_token },
      }),
    onSuccess: (r) => {
      const name = r.friendly_name ? ` (${r.friendly_name})` : "";
      if (r.status === "active") {
        toast.success(`Conta Twilio ativa${name}.`);
      } else if (r.status === "suspended") {
        toast.warning(`Conta Twilio suspensa${name}. Regularize antes de enviar mensagens.`);
      } else if (r.status === "closed") {
        toast.error(`Conta Twilio encerrada${name}.`);
      } else {
        toast.warning(`Conta Twilio com status "${r.status}"${name}.`);
      }
    },
    onError: (e: Error) => toast.error(`Credenciais inválidas: ${e.message}`),
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
          <Button
            type="button"
            variant="outline"
            onClick={() => testCredsMut.mutate()}
            disabled={testCredsMut.isPending || !form.account_sid}
          >
            <ShieldCheck className="size-4 mr-2" />
            {testCredsMut.isPending ? "Validando…" : "Testar credenciais"}
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

function RoleAuditLog() {
  const qc = useQueryClient();
  const listFn = useServerFn(listRoleAuditLog);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["role-audit-log"],
    queryFn: () => listFn({ data: { limit: 100 } }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-5 text-gold" /> Histórico de alterações de papel
            </CardTitle>
            <CardDescription>
              Quem alterou, quando e o que mudou. Últimas 100 alterações.
            </CardDescription>
          </div>
          <Button
            variant="outline" size="sm"
            disabled={isFetching}
            onClick={() => qc.invalidateQueries({ queryKey: ["role-audit-log"] })}
          >
            <RefreshCw className={`size-3 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Carregando histórico…</div>
        ) : !data?.entries.length ? (
          <div className="text-muted-foreground text-sm">Nenhuma alteração registrada ainda.</div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Quando</th>
                  <th className="px-3 py-2 font-medium">Ação</th>
                  <th className="px-3 py-2 font-medium">Usuário alvo</th>
                  <th className="px-3 py-2 font-medium">Executado por</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2">
                      {e.action === "grant" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-500 text-xs">
                          <ShieldCheck className="size-3" /> Promoveu a {e.role}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive text-xs">
                          <ShieldOff className="size-3" /> Removeu {e.role}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div>{e.target_email ?? "—"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{e.target_user_id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{e.actor_email ?? "—"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{e.actor_user_id?.slice(0, 8) ?? "—"}…</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
