import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Shield, MessageSquare, Save, Send, CheckCircle2, AlertTriangle, Users, Search, ShieldOff, ShieldCheck, History, RefreshCw, Settings as SettingsIcon, Wallet, Coins, MoreHorizontal, UserCog, KeyRound, Package, Trash2, Coins as CoinsIcon } from "lucide-react";
import { MercadoPagoForm } from "@/components/MercadoPagoForm";
import { AdminCreditsManager, CreditsDialog } from "@/components/AdminCreditsManager";
import { AdminCreditCosts } from "@/components/AdminCreditCosts";
import { AdminCreditPackages } from "@/components/AdminCreditPackages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SettingsForm } from "@/components/SettingsForm";
import { toast } from "sonner";
import { confirmDialog } from "@/components/system-feedback";
import { SUBSCRIPTION_ADDONS } from "@/lib/addons.catalog";
import {
  checkIsAdmin,
  getTwilioSettings,
  saveTwilioSettings,
  sendTwilioTest,
  testTwilioCredentials,
  listAdminUsers,
  setUserAdmin,
  listRoleAuditLog,
  adminUpdateUser,
  adminSetUserPassword,
  adminDeleteUser,
  adminListUserSubscriptions,
  adminSetUserSubscription,
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
          <TabsTrigger value="mercadopago" className="gap-2">
            <Wallet className="size-4" /> Mercado Pago
          </TabsTrigger>
          <TabsTrigger value="credits" className="gap-2">
            <Coins className="size-4" /> Créditos
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
        <TabsContent value="mercadopago" className="mt-0">
          <MercadoPagoForm />
        </TabsContent>
        <TabsContent value="credits" className="mt-0 space-y-6">
          <AdminCreditCosts />
          <AdminCreditPackages />
          <AdminCreditsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type AdminUserRow = {
  id: string;
  email: string;
  full_name: string;
  created_at: string | null | undefined;
  is_admin: boolean;
};

type DialogKind = "edit" | "password" | "credits" | "plans" | null;

function UsersAdmin() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminUsers);
  const setFn = useServerFn(setUserAdmin);
  const deleteFn = useServerFn(adminDeleteUser);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<AdminUserRow | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-users", search, page],
    queryFn: () => listFn({ data: { search, page } }),
  });

  const roleMut = useMutation({
    mutationFn: (vars: { user_id: string; is_admin: boolean }) =>
      setFn({ data: vars }),
    onSuccess: (_r, vars) => {
      toast.success(vars.is_admin ? "Usuário promovido a admin." : "Acesso de admin removido.");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["role-audit-log"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (user_id: string) => deleteFn({ data: { user_id } }),
    onSuccess: () => {
      toast.success("Usuário excluído.");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function open(kind: Exclude<DialogKind, null>, u: AdminUserRow) {
    setActive(u);
    setDialog(kind);
  }
  function close() {
    setDialog(null);
    setActive(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5 text-gold" /> Usuários e permissões
        </CardTitle>
        <CardDescription>
          Edite usuários, gerencie créditos, planos e permissões. Mostra até 50 por página.
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
          <div className="rounded-md border border-border overflow-x-auto">
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Ações">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Gerenciar usuário</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => open("edit", u)}>
                            <UserCog className="size-4 mr-2" /> Editar usuário
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => open("password", u)}>
                            <KeyRound className="size-4 mr-2" /> Mudar senha
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => open("credits", u)}>
                            <CoinsIcon className="size-4 mr-2" /> Adicionar / remover créditos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => open("plans", u)}>
                            <Package className="size-4 mr-2" /> Mudar plano / Add-ons
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {u.is_admin ? (
                            <DropdownMenuItem
                              onClick={async () => {
                                const ok = await confirmDialog({
                                  title: "Remover acesso de admin?",
                                  description: `${u.email} perderá privilégios de Super Admin.`,
                                  confirmText: "Remover admin",
                                  destructive: true,
                                });
                                if (ok) roleMut.mutate({ user_id: u.id, is_admin: false });
                              }}
                            >
                              <ShieldOff className="size-4 mr-2" /> Remover admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => roleMut.mutate({ user_id: u.id, is_admin: true })}
                            >
                              <ShieldCheck className="size-4 mr-2" /> Promover a admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={async () => {
                              const ok = await confirmDialog({
                                title: "Excluir usuário?",
                                description: `Esta ação remove permanentemente ${u.email} e todos os dados associados.`,
                                confirmText: "Excluir definitivamente",
                                destructive: true,
                              });
                              if (ok) deleteMut.mutate(u.id);
                            }}
                          >
                            <Trash2 className="size-4 mr-2" /> Excluir usuário
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialog === "edit"} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          {active && <EditUserDialog user={active} onDone={close} />}
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "password"} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          {active && <PasswordDialog user={active} onDone={close} />}
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "credits"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {active && (
            <CreditsDialog
              userId={active.id}
              userLabel={active.full_name || active.email}
              onDone={close}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "plans"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {active && <PlansDialog user={active} onDone={close} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function EditUserDialog({ user, onDone }: { user: AdminUserRow; onDone: () => void }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(adminUpdateUser);
  const [fullName, setFullName] = useState(user.full_name);
  const [email, setEmail] = useState(user.email);

  const mut = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          user_id: user.id,
          full_name: fullName.trim(),
          email: email.trim() !== user.email ? email.trim() : undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Usuário atualizado.");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserCog className="size-5 text-gold" /> Editar usuário
        </DialogTitle>
        <DialogDescription>Atualize o nome e o e-mail de login.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label htmlFor="fn">Nome completo</Label>
          <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
        </div>
        <div>
          <Label htmlFor="em">E-mail</Label>
          <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          <Save className="size-4 mr-1" /> {mut.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </>
  );
}

function PasswordDialog({ user, onDone }: { user: AdminUserRow; onDone: () => void }) {
  const setPwdFn = useServerFn(adminSetUserPassword);
  const [pwd, setPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const mut = useMutation({
    mutationFn: () => setPwdFn({ data: { user_id: user.id, password: pwd } }),
    onSuccess: () => {
      toast.success("Senha atualizada.");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit() {
    if (pwd.length < 8) return toast.error("Senha deve ter ao menos 8 caracteres.");
    if (pwd !== confirmPwd) return toast.error("As senhas não coincidem.");
    mut.mutate();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound className="size-5 text-gold" /> Mudar senha
        </DialogTitle>
        <DialogDescription>
          Defina uma nova senha para <span className="font-mono">{user.email}</span>.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label htmlFor="np">Nova senha</Label>
          <Input id="np" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <Label htmlFor="cp">Confirmar senha</Label>
          <Input id="cp" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} autoComplete="new-password" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button onClick={submit} disabled={mut.isPending}>
          <Save className="size-4 mr-1" /> {mut.isPending ? "Salvando…" : "Definir nova senha"}
        </Button>
      </DialogFooter>
    </>
  );
}

function PlansDialog({ user, onDone }: { user: AdminUserRow; onDone: () => void }) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListUserSubscriptions);
  const setFn = useServerFn(adminSetUserSubscription);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-user-subs", user.id],
    queryFn: () => listFn({ data: { user_id: user.id } }),
  });

  const mut = useMutation({
    mutationFn: (vars: { addon_id: string; active: boolean; days?: number }) =>
      setFn({ data: { user_id: user.id, ...vars } }),
    onSuccess: () => {
      toast.success("Plano atualizado.");
      refetch();
      qc.invalidateQueries({ queryKey: ["addons-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeByAddon = new Map(
    (data?.subscriptions ?? [])
      .filter((s) => s.status === "active")
      .map((s) => [s.addon_id, s] as const),
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Package className="size-5 text-gold" /> Planos & Add-ons
        </DialogTitle>
        <DialogDescription>
          Habilite manualmente assinaturas para {user.email}. Padrão: 30 dias.
        </DialogDescription>
      </DialogHeader>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <div className="space-y-2">
          {SUBSCRIPTION_ADDONS.map((addon) => {
            const sub = activeByAddon.get(addon.id);
            const isActive = !!sub;
            return (
              <div
                key={addon.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm">{addon.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {addon.description}
                  </div>
                  {isActive && sub?.current_period_end && (
                    <div className="text-xs text-emerald-500 mt-1">
                      Ativo até {new Date(sub.current_period_end).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isActive ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={mut.isPending}
                        onClick={() => mut.mutate({ addon_id: addon.id, active: true, days: 30 })}
                      >
                        +30 dias
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={mut.isPending}
                        onClick={() => mut.mutate({ addon_id: addon.id, active: false })}
                      >
                        Desativar
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      disabled={mut.isPending}
                      onClick={() => mut.mutate({ addon_id: addon.id, active: true, days: 30 })}
                    >
                      Ativar 30 dias
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>Fechar</Button>
      </DialogFooter>
    </>
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
          <div className="rounded-md border border-border overflow-x-auto">
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
