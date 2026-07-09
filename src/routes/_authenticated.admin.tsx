import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Shield, MessageSquare, Save, Send, CheckCircle2, AlertTriangle, Users, Search, ShieldOff, ShieldCheck, History, RefreshCw, Settings as SettingsIcon, Wallet, Coins, MoreHorizontal, UserCog, KeyRound, Package, Trash2, Coins as CoinsIcon, Zap, Plug, Clock, UserPlus, Eye, EyeOff, Database, Download, Loader2, Phone, ArrowRightLeft, Layers, Megaphone, Mail, Smartphone, ShoppingCart, FileText, ArrowLeft, Menu, X, Sparkles, ChevronDown, Activity, Globe } from "lucide-react";
import { MercadoPagoForm } from "@/components/MercadoPagoForm";
import { AdminCreditsManager, CreditsDialog } from "@/components/AdminCreditsManager";
import { AdminCreditCosts } from "@/components/AdminCreditCosts";
import { AdminCreditPackages } from "@/components/AdminCreditPackages";
import { AdminAddons } from "@/components/AdminAddons";
import { AdminLandingPackages } from "@/components/AdminLandingPackages";
import { AdminCronStatus } from "@/components/AdminCronStatus";
import { AdminSystemDiagnostic } from "@/components/AdminSystemDiagnostic";
import { AdminGlobalSettings } from "@/components/AdminGlobalSettings";
import { AdminPlanMigration } from "@/components/AdminPlanMigration";
import { AdminMarketing } from "@/components/AdminMarketing";
import { AdminSmtp } from "@/components/AdminSmtp";
import { AdminPwa } from "@/components/AdminPwa";
import { AdminProductLandings } from "@/components/AdminProductLandings";
import { AdminProductOrders } from "@/components/AdminProductOrders";
import { AdminCrm } from "@/components/AdminCrm";
import { AdminHoroscopeStatus } from "@/components/AdminHoroscopeStatus";
import { AdminHoroscopeLanding } from "@/components/AdminHoroscopeLanding";
import { AdminHoroscopePlans } from "@/components/AdminHoroscopePlans";

import { AdminAffiliatePanel } from "@/modules/affiliate/ui/AdminAffiliatePanel";
import { getServerTime } from "@/lib/server-time.functions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  adminCreateUser,
  setUserAdmin,
  listRoleAuditLog,
  adminUpdateUser,
  adminSetUserPassword,
  adminDeleteUser,
  adminListUserSubscriptions,
  adminSetUserSubscription,
  adminApplyLandingPackage,
  getEvolutionSettings,
  saveEvolutionSettings,
  testEvolutionConnection,
  sendEvolutionTest,
} from "@/lib/admin.functions";
import { adminExportDatabase, getSyncStatus, syncToNewDatabase, syncSchemaToNewDatabase, syncRlsPoliciesToNewDatabase } from "@/lib/admin-backup.functions";
import { countUnviewedOrders } from "@/lib/product-orders.functions";


export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type AdminMenuItem = { value: string; label: string; icon: typeof SettingsIcon };
type AdminMenuGroup = { group: string; items: AdminMenuItem[] };

const ADMIN_MENU_GROUPS: AdminMenuGroup[] = [
  {
    group: "Operação",
    items: [
      { value: "pedidos", label: "Pedidos", icon: ShoppingCart },
      { value: "crm", label: "CRM Leads", icon: Mail },
      { value: "users", label: "Usuários", icon: Users },
      { value: "audit", label: "Histórico", icon: History },
    ],
  },
  {
    group: "Financeiro",
    items: [
      { value: "mercadopago", label: "Mercado Pago", icon: Wallet },
      { value: "credits", label: "Créditos/Pacotes", icon: Coins },
      { value: "packages", label: "Pacotes", icon: Layers },
      { value: "addons", label: "Add-ons", icon: Package },
      { value: "costs", label: "Custos por ação", icon: CoinsIcon },
    ],
  },
  {
    group: "Conteúdo & Marketing",
    items: [
      { value: "product-landings", label: "Landings Produtos", icon: FileText },
      { value: "horoscope-landing", label: "Horóscopo Grátis (Landing)", icon: Sparkles },
      { value: "horoscope-plans", label: "Horóscopo Planos Pagos", icon: Sparkles },
      { value: "horoscope-status", label: "Horóscopo Status", icon: Sparkles },
      { value: "marketing", label: "Marketing", icon: Megaphone },
    ],
  },
  {
    group: "Integrações & Comunicação",
    items: [
      { value: "twilio", label: "Twilio", icon: MessageSquare },
      { value: "evolution", label: "Evolution API", icon: Zap },
      { value: "smtp", label: "E-mail SMTP", icon: Mail },
      { value: "pwa", label: "PWA", icon: Smartphone },
    ],
  },
  {
    group: "Sistema",
    items: [
      { value: "settings", label: "Configurações", icon: SettingsIcon },
      { value: "global", label: "Notificações & Alertas", icon: AlertTriangle },
      { value: "affiliate", label: "Affiliate Center", icon: Users },
      { value: "cron", label: "Cron Jobs", icon: Clock },
      { value: "migration", label: "Migração", icon: ArrowRightLeft },
      { value: "backup", label: "Backup", icon: Database },
      { value: "destinations", label: "Destinos Sync", icon: Globe },
      { value: "diagnostic", label: "Diagnóstico", icon: Activity },
    ],
  },
];

const ADMIN_MENU: AdminMenuItem[] = ADMIN_MENU_GROUPS.flatMap((g) => g.items);



function AdminPage() {
  const isAdminFn = useServerFn(checkIsAdmin);
  const { data: roleData, isLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => isAdminFn(),
  });

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Carregando…</div>;
  }
  if (!roleData?.isAdmin) {
    return (
      <div className="p-8">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" /> Acesso restrito
            </CardTitle>
            <CardDescription>
              Este painel é exclusivo para super administradores.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <AdminRouter />;
}

function AdminRouter() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Se estivermos em uma sub-rota do admin (ex: /admin/ilustracoes, /admin/logs),
  // renderiza a página filha via Outlet em vez do dashboard.
  if (pathname !== "/admin" && pathname !== "/admin/") {
    return <Outlet />;
  }
  return <AdminDashboard />;
}


function AdminDashboard() {
  const initialTab =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("tab") ?? "settings"
      : "settings";
  const [tab, setTab] = useState(initialTab);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeGroup = ADMIN_MENU_GROUPS.find((g) => g.items.some((i) => i.value === tab))?.group;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    activeGroup ? { [activeGroup]: true } : {}
  );
  useEffect(() => {
    if (activeGroup) setOpenGroups((prev) => (prev[activeGroup] ? prev : { ...prev, [activeGroup]: true }));
  }, [activeGroup]);
  const toggleGroup = (g: string) => setOpenGroups((prev) => ({ ...prev, [g]: !prev[g] }));
  const unviewedFn = useServerFn(countUnviewedOrders);
  const { data: unviewed } = useQuery({
    queryKey: ["admin-unviewed-orders"],
    queryFn: () => unviewedFn(),
    refetchInterval: 30_000,
  });
  const unviewedCount = unviewed?.count ?? 0;

  function selectTab(value: string) {
    setTab(value);
    setMobileOpen(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", value);
      window.history.replaceState({}, "", url.toString());
    }
  }

  if (tab === "affiliate") {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4 lg:p-8 max-w-[1400px] mx-auto space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Users className="size-6 text-gold" />
              <div>
                <h1 className="text-2xl font-serif shimmer-text">Affiliate Center</h1>
                <p className="text-sm text-muted-foreground">Painel completo do programa de afiliados.</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => selectTab("settings")}
              className="gap-2 border-gold/30 text-gold hover:bg-gold hover:text-white"
            >
              <ArrowLeft className="size-4" /> Voltar para o Admin
            </Button>
          </div>
          <AdminAffiliatePanel />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between border-b border-border bg-background/90 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-gold" />
          <span className="font-serif text-base shimmer-text">Super Admin</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen((o) => !o)}>
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </header>

      {/* Sidebar */}
      <aside
        className={`${mobileOpen ? "flex" : "hidden"} lg:flex flex-col fixed lg:sticky inset-0 lg:inset-auto lg:top-0 z-20 h-screen w-full lg:w-72 border-r border-border bg-background/95 backdrop-blur-xl`}
      >
        <div className="shrink-0 px-4 py-4 border-b border-border space-y-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gold/30 bg-secondary/40 text-sm text-gold hover:bg-gold hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Voltar para o dashboard</span>
          </Link>
          <div className="flex items-center gap-2 px-1">
            <Shield className="size-5 text-gold" />
            <div>
              <div className="font-serif text-lg shimmer-text leading-tight">Super Admin</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Painel de controle
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-gold">
          {ADMIN_MENU_GROUPS.map((group) => {
            const isOpen = !!openGroups[group.group];
            const hasActive = group.items.some((i) => i.value === tab);
            return (
              <div key={group.group} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.group)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    hasActive ? "text-gold" : "text-muted-foreground/70 hover:text-gold"
                  }`}
                  aria-expanded={isOpen}
                >
                  <ChevronDown className={`size-3 shrink-0 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                  <span className="flex-1 text-left">{group.group}</span>
                  {!isOpen && hasActive && <span className="size-1.5 rounded-full bg-gold shadow-[0_0_6px_rgba(212,175,55,0.8)]" />}
                </button>
                {isOpen && group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = tab === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      ref={(el) => {
                        if (isActive && el) {
                          el.scrollIntoView({ block: "nearest", behavior: "smooth" });
                        }
                      }}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => selectTab(item.value)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                        isActive
                          ? "bg-gold/15 text-gold border border-gold/40 shadow-[0_0_10px_rgba(212,175,55,0.15)] font-medium"
                          : "text-muted-foreground hover:text-gold hover:bg-secondary/40 border border-transparent"
                      }`}
                    >
                      <Icon className={`size-4 shrink-0 ${isActive ? "text-gold" : ""}`} />
                      <span className="flex-1">{item.label}</span>
                      {item.value === "pedidos" && unviewedCount > 0 && (
                        <span className="relative inline-flex" title={`${unviewedCount} novo(s) pedido(s)`}>
                          <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 opacity-75 animate-ping" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                        </span>
                      )}
                      {isActive && <span className="size-1.5 rounded-full bg-gold shadow-[0_0_6px_rgba(212,175,55,0.8)]" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
          <div className="space-y-1 pt-1">
            <div className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Extras
            </div>
            <Link
              to="/admin/ilustracoes"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-gold hover:bg-secondary/40 border border-transparent transition-colors"
            >
              <Sparkles className="size-4 shrink-0" />
              <span className="flex-1">Ilustrações</span>
            </Link>
          </div>
        </nav>




        <div className="shrink-0 p-3 border-t border-border">
          <Button variant="outline" size="sm" asChild className="w-full border-gold/30 hover:bg-gold/10 text-gold">
            <Link to="/">Ver Landing Page</Link>
          </Button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-h-screen pt-14 lg:pt-0">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
          <header className="flex items-center gap-3">
            <Shield className="size-6 text-gold" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-serif shimmer-text">
                  {ADMIN_MENU.find((m) => m.value === tab)?.label ?? "Painel do Super Admin"}
                </h1>
                <ServerClock />
              </div>
              <p className="text-sm text-muted-foreground">
                Configurações sensíveis, integrações e gestão do sistema.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="border-gold/40 text-gold hover:bg-gold/10">
              <Link to="/admin/ilustracoes">
                <Sparkles className="size-4 mr-2" />
                Ilustrações
              </Link>
            </Button>
          </header>



          <AdminTabContent tab={tab} />
        </div>
      </main>
    </div>
  );
}

function ServerClock() {
  const fn = useServerFn(getServerTime);
  const [offset, setOffset] = useState<number | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    let alive = true;
    const sync = async () => {
      try {
        const t0 = Date.now();
        const { now: iso } = await fn();
        const t1 = Date.now();
        const server = new Date(iso).getTime();
        if (alive) setOffset(server - (t0 + t1) / 2);
      } catch {}
    };
    sync();
    const s = setInterval(sync, 60_000);
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => { alive = false; clearInterval(s); clearInterval(t); };
  }, [fn]);
  const display = new Date(now.getTime() + (offset ?? 0));
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono" title="Horário do servidor (America/Sao_Paulo, UTC-3)">
      <Clock className="size-3" />
      {display.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Sao_Paulo" })}
      <span className="opacity-60">UTC-3</span>
    </span>

  );
}



function AdminTabContent({ tab }: { tab: string }) {
  switch (tab) {
    case "settings": return <SettingsForm />;
    case "users": return <UsersAdmin />;
    case "costs": return <AdminCreditCosts />;
    case "audit": return <RoleAuditLog />;
    case "twilio": return <TwilioForm />;
    case "evolution": return <EvolutionForm />;
    case "mercadopago": return <MercadoPagoForm />;
    case "credits": return (
      <div className="space-y-6">
        <AdminCreditPackages />
        <AdminCreditsManager />
      </div>
    );
    case "packages": return <AdminLandingPackages />;
    case "addons": return <AdminAddons />;
    case "migration": return <AdminPlanMigration />;
    case "cron": return <AdminCronStatus />;
    case "horoscope-status": return <AdminHoroscopeStatus />;
    case "horoscope-landing": return <AdminHoroscopeLanding />;
    case "horoscope-plans": return <AdminHoroscopePlans />;

    case "backup": return <BackupAdmin />;
    case "destinations": return <AdminSyncDestinations />;
    case "diagnostic": return <AdminSystemDiagnostic />;
    case "global": return <AdminGlobalSettings />;
    case "marketing": return <AdminMarketing />;
    case "smtp": return <AdminSmtp />;
    case "pwa": return <AdminPwa />;
    case "product-landings": return <AdminProductLandings />;
    case "pedidos": return <AdminProductOrders />;
    case "crm": return <AdminCrm />;
    case "affiliate": return <AdminAffiliatePanel />;
    default: return <SettingsForm />;
  }
}


type AdminUserRow = {
  id: string;
  email: string;
  full_name: string;
  created_at: string | null | undefined;
  is_admin: boolean;
  plans: string[];
  addons: string[];
  direct_sale?: boolean;
};



type DialogKind = "create" | "edit" | "password" | "credits" | "plans" | "addons" | null;

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

  function open(kind: Exclude<DialogKind, null>, u: AdminUserRow | null = null) {
    if (u) setActive(u);
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
          <Button onClick={() => open("create")} className="gap-2">
            <UserPlus className="size-4" /> Criar usuário
          </Button>
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
                  <th className="px-3 py-2 font-medium">Plano</th>
                  <th className="px-3 py-2 font-medium">Add-ons</th>
                  <th className="px-3 py-2 font-medium">Papel</th>
                  <th className="px-3 py-2 font-medium text-right">Ações</th>

                </tr>

              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{u.full_name || "—"}</span>
                        {u.direct_sale && (
                          <span className="inline-flex items-center rounded bg-fuchsia-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                            Venda Direta
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {u.plans.length ? (
                        <div className="flex flex-wrap gap-1">
                          {u.plans.map((p) => (
                            <span key={p} className="inline-flex items-center rounded bg-secondary/60 px-2 py-0.5 text-xs text-foreground">
                              {p}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem plano</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {u.addons.length ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center rounded bg-green-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-green-700"
                            >
                              Add-Ons Ativos ({u.addons.length})
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-64">
                            <div className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                              Add-ons ativos
                            </div>
                            <ul className="space-y-1">
                              {u.addons.map((a) => (
                                <li key={a} className="text-sm flex items-center gap-2">
                                  <span className="size-1.5 rounded-full bg-green-500" />
                                  {a}
                                </li>
                              ))}
                            </ul>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
                            <Package className="size-4 mr-2" /> Adicionar plano
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => open("addons", u)}>
                            <Layers className="size-4 mr-2" /> Adicionar add-ons
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

      <Dialog open={dialog === "create"} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <CreateUserDialog onDone={close} />
        </DialogContent>
      </Dialog>
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
          {active && <PlanPackagesDialog user={active} onDone={close} />}
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "addons"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {active && <AddonsDialog user={active} onDone={close} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CreateUserDialog({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const createFn = useServerFn(adminCreateUser);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const mut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          full_name: fullName.trim(),
          email: email.trim(),
          password,
        },
      }),
    onSuccess: () => {
      toast.success("Usuário criado com sucesso.");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserPlus className="size-5 text-gold" /> Criar novo usuário
        </DialogTitle>
        <DialogDescription>Cadastre um novo usuário manualmente no sistema.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="create-fn">Nome completo</Label>
          <Input 
            id="create-fn" 
            placeholder="Ex: João Silva"
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)} 
            maxLength={120} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-em">E-mail</Label>
          <Input 
            id="create-em" 
            type="email" 
            placeholder="exemplo@email.com"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            maxLength={200} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-pwd">Senha inicial</Label>
          <div className="relative">
            <Input 
              id="create-pwd" 
              type={showPassword ? "text" : "password"} 
              placeholder="Mínimo 8 caracteres"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="size-4 text-muted-foreground" />
              ) : (
                <Eye className="size-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button 
          onClick={() => mut.mutate()} 
          disabled={mut.isPending || !fullName || !email || password.length < 8}
        >
          {mut.isPending ? "Criando…" : "Criar usuário"}
        </Button>
      </DialogFooter>
    </>
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
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

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
        <div className="relative">
          <Label htmlFor="np">Nova senha</Label>
          <Input id="np" type={showPwd ? "text" : "password"} value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="new-password" className="pr-10" />
          <button type="button" tabIndex={-1} className="absolute right-3 top-[1.6rem] text-muted-foreground hover:text-foreground" onClick={() => setShowPwd((s) => !s)}>
            {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <div className="relative">
          <Label htmlFor="cp">Confirmar senha</Label>
          <Input id="cp" type={showConfirmPwd ? "text" : "password"} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} autoComplete="new-password" className="pr-10" />
          <button type="button" tabIndex={-1} className="absolute right-3 top-[1.6rem] text-muted-foreground hover:text-foreground" onClick={() => setShowConfirmPwd((s) => !s)}>
            {showConfirmPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
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

function PlanPackagesDialog({ user, onDone }: { user: AdminUserRow; onDone: () => void }) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListUserSubscriptions);
  const applyPackageFn = useServerFn(adminApplyLandingPackage);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [mode, setMode] = useState<"add" | "replace">("add");

  const { data: subsData, refetch } = useQuery({
    queryKey: ["admin-user-subs", user.id],
    queryFn: () => listFn({ data: { user_id: user.id } }),
  });

  const { data: packagesData, isLoading: packagesLoading } = useQuery({
    queryKey: ["admin-landing-packages"],
    queryFn: async () => {
      const { listAdminLandingPackages } = await import("@/lib/landing-packages.functions");
      return listAdminLandingPackages();
    },
  });
  const availablePackages = (packagesData ?? []).filter((p: any) => p.enabled);

  const activeAddonIds = new Set(
    (subsData?.subscriptions ?? [])
      .filter((s) => s.status === "active")
      .map((s) => s.addon_id),
  );

  // Determine which package the user "has": one whose included_addons are all active
  const currentPackage = availablePackages.find((p: any) => {
    const addons: string[] = Array.isArray(p.included_addons) ? p.included_addons : [];
    return addons.length > 0 && addons.every((a) => activeAddonIds.has(a));
  });

  const applyMut = useMutation({
    mutationFn: (vars: { package_slug: string; mode: "add" | "replace"; days?: number }) =>
      applyPackageFn({ data: { user_id: user.id, ...vars } }),
    onSuccess: (res: any) => {
      const creditsMsg = res?.credits_granted ? ` (+${res.credits_granted} créditos)` : "";
      toast.success(`Pacote "${res?.package_name}" aplicado${creditsMsg}.`);
      setSelectedSlug("");
      refetch();
      qc.invalidateQueries({ queryKey: ["addons-overview"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Package className="size-5 text-gold" /> Adicionar plano
        </DialogTitle>
        <DialogDescription>
          Aplique um pacote completo para {user.email}. Os módulos e créditos são ativados por 30 dias.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-md border border-border p-3 bg-card/40 text-sm">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Plano atual</div>
        {currentPackage ? (
          <div className="font-medium">{currentPackage.name}</div>
        ) : (
          <div className="text-muted-foreground">Nenhum plano completo ativo.</div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Modo:</span>
        <Button
          size="sm"
          variant={mode === "add" ? "default" : "outline"}
          onClick={() => setMode("add")}
        >
          <UserPlus className="size-3 mr-1" /> Adicionar
        </Button>
        <Button
          size="sm"
          variant={mode === "replace" ? "default" : "outline"}
          onClick={() => setMode("replace")}
        >
          <ArrowRightLeft className="size-3 mr-1" /> Substituir
        </Button>
        <span className="text-muted-foreground ml-1">
          {mode === "add"
            ? "Soma módulos e créditos sem remover assinaturas atuais."
            : "Cancela assinaturas atuais antes de aplicar o novo pacote."}
        </span>
      </div>

      {packagesLoading ? (
        <div className="text-sm text-muted-foreground">Carregando pacotes…</div>
      ) : availablePackages.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhum pacote habilitado.</div>
      ) : (
        <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
          {availablePackages.map((p: any) => {
            const isCurrent = currentPackage?.id === p.id;
            const isSelected = selectedSlug === p.slug;
            const addons: string[] = Array.isArray(p.included_addons) ? p.included_addons : [];
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedSlug(p.slug)}
                className={`w-full text-left rounded-md border p-3 transition ${
                  isSelected
                    ? "border-gold bg-gold/5"
                    : "border-border hover:border-muted-foreground/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm flex items-center gap-2">
                      {p.name}
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                          PLANO ATUAL
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {p.description}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {p.credits_per_month ? `+${p.credits_per_month} créditos/mês` : "Sem créditos"}
                      {addons.length > 0 ? ` · ${addons.length} módulo(s)` : ""}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <DialogFooter>
        <Button variant="ghost" onClick={onDone} disabled={applyMut.isPending}>
          Fechar
        </Button>
        <Button
          onClick={() =>
            selectedSlug &&
            applyMut.mutate({ package_slug: selectedSlug, mode, days: 30 })
          }
          disabled={!selectedSlug || applyMut.isPending}
        >
          {applyMut.isPending
            ? "Aplicando…"
            : mode === "add"
              ? "Adicionar pacote"
              : "Substituir plano"}
        </Button>
      </DialogFooter>
    </>
  );
}

function AddonsDialog({ user, onDone }: { user: AdminUserRow; onDone: () => void }) {
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
      toast.success("Módulo atualizado.");
      refetch();
      qc.invalidateQueries({ queryKey: ["addons-overview"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
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
          <Layers className="size-5 text-gold" /> Adicionar add-ons
        </DialogTitle>
        <DialogDescription>
          Ative ou desative módulos individuais para {user.email}. Padrão: 30 dias.
        </DialogDescription>
      </DialogHeader>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
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
  const [showAuthToken, setShowAuthToken] = useState(false);

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
          <div className="space-y-1.5 relative">
            <Label htmlFor="token">
              Auth Token {data?.has_auth_token && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-500">
                  <CheckCircle2 className="size-3" /> salvo
                </span>
              )}
            </Label>
            <Input
              id="token"
              type={showAuthToken ? "text" : "password"}
              placeholder={data?.has_auth_token ? "•••••••••• (deixe vazio para manter)" : "Cole o Auth Token"}
              value={form.auth_token}
              onChange={(e) => setForm((f) => ({ ...f, auth_token: e.target.value }))}
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-[1.85rem] text-muted-foreground hover:text-foreground"
              onClick={() => setShowAuthToken((s) => !s)}
            >
              {showAuthToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
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

function EvolutionForm() {
  const qc = useQueryClient();
  const loadFn = useServerFn(getEvolutionSettings);
  const saveFn = useServerFn(saveEvolutionSettings);
  const testConnFn = useServerFn(testEvolutionConnection);
  const sendTestFn = useServerFn(sendEvolutionTest);

  const { data, isLoading } = useQuery({
    queryKey: ["evolution-settings"],
    queryFn: () => loadFn(),
  });

  const [form, setForm] = useState({
    base_url: "",
    global_api_key: "",
    instance_name: "",
    enabled: false,
  });
  const [testTo, setTestTo] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm((f) => ({
      ...f,
      base_url: data.base_url,
      instance_name: data.instance_name,
      enabled: data.enabled,
    }));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => {
      toast.success("Evolution API salva.");
      setForm((f) => ({ ...f, global_api_key: "" }));
      qc.invalidateQueries({ queryKey: ["evolution-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testConnMut = useMutation({
    mutationFn: () =>
      testConnFn({
        data: {
          base_url: form.base_url,
          global_api_key: form.global_api_key,
          instance_name: form.instance_name,
        },
      }),
    onSuccess: (r) => {
      if (r.mode === "instance") {
        toast.success(`Instância "${form.instance_name}" — estado: ${r.state}`);
      } else {
        toast.success(`Conexão OK. ${r.instances} instância(s) disponível(is).`);
      }
    },
    onError: (e: Error) => toast.error(`Falha: ${e.message}`),
  });

  const sendTestMut = useMutation({
    mutationFn: () => sendTestFn({ data: { to: testTo } }),
    onSuccess: (r) => toast.success(`Mensagem enviada (id ${r.id}).`),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground">Carregando configurações…</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="size-5 text-gold" /> Evolution API (WhatsApp)
            </CardTitle>
            <CardDescription>
              Integração com a{" "}
              <a
                href="https://doc.evolution-api.com/v2/pt/get-started/introduction"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-gold"
              >
                Evolution API v2
              </a>{" "}
              para envio de WhatsApp via instância própria. Quando ativa, tem prioridade sobre a Twilio nos envios automáticos.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="evo-enabled" className="text-sm">Ativa</Label>
            <Switch
              id="evo-enabled"
              checked={form.enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="evo-url">URL base da Evolution</Label>
            <Input
              id="evo-url"
              placeholder="https://api.seudominio.com"
              value={form.base_url}
              onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Domínio raiz onde sua Evolution API está hospedada — sem barra no final.
            </p>
          </div>

          <div className="space-y-1.5 relative">
            <Label htmlFor="evo-key">
              API Key global{" "}
              {data?.has_api_key && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-500">
                  <CheckCircle2 className="size-3" /> salva
                </span>
              )}
            </Label>
            <Input
              id="evo-key"
              type={showApiKey ? "text" : "password"}
              placeholder={data?.has_api_key ? "•••••••••• (deixe vazio para manter)" : "Cole a AUTHENTICATION_API_KEY"}
              value={form.global_api_key}
              onChange={(e) => setForm((f) => ({ ...f, global_api_key: e.target.value }))}
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-[1.85rem] text-muted-foreground hover:text-foreground"
              onClick={() => setShowApiKey((s) => !s)}
            >
              {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
            <p className="text-xs text-muted-foreground">
              Definida na variável <code>AUTHENTICATION_API_KEY</code> do seu servidor Evolution.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="evo-inst">Nome da instância</Label>
            <Input
              id="evo-inst"
              placeholder="cosmic-ai"
              value={form.instance_name}
              onChange={(e) => setForm((f) => ({ ...f, instance_name: e.target.value }))}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Instância já criada e conectada ao WhatsApp via QR Code.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            <Save className="size-4 mr-2" />
            {saveMut.isPending ? "Salvando…" : "Salvar configurações"}
          </Button>
          <Button
            variant="outline"
            onClick={() => testConnMut.mutate()}
            disabled={testConnMut.isPending || !form.base_url}
          >
            <Plug className="size-4 mr-2" />
            {testConnMut.isPending ? "Testando…" : "Testar conexão"}
          </Button>
        </div>

        <div className="border-t border-border/60 pt-5 space-y-3">
          <Label className="text-sm font-medium">Enviar mensagem de teste</Label>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 flex-1 min-w-[220px]">
              <Label htmlFor="evo-to" className="text-xs text-muted-foreground">Número destino (E.164)</Label>
              <Input
                id="evo-to"
                placeholder="+5511999998888"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => sendTestMut.mutate()}
              disabled={sendTestMut.isPending || !testTo}
            >
              <Send className="size-4 mr-2" />
              {sendTestMut.isPending ? "Enviando…" : "Enviar teste"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Requer salvar com a integração ativa. Use seu próprio número primeiro.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function BackupAdmin() {
  const exportFn = useServerFn(adminExportDatabase);
  const statusFn = useServerFn(getSyncStatus);
  const syncFn = useServerFn(syncToNewDatabase);
  const schemaFn = useServerFn(syncSchemaToNewDatabase);
  const rlsFn = useServerFn(syncRlsPoliciesToNewDatabase);
  const qc = useQueryClient();
  const [strategy, setStrategy] = useState<"auto" | "incremental" | "upsert_all" | "full_replace">("auto");

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["db-sync-status"],
    queryFn: () => statusFn(),
    refetchOnWindowFocus: false,
  });

  const exportMut = useMutation({
    mutationFn: () => exportFn(),
    onSuccess: (res) => {
      const blob = new Blob([res.sql], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-cosmic-ai-${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Backup gerado e download iniciado.");
    },
    onError: (e: Error) => toast.error(`Erro ao gerar backup: ${e.message}`),
  });

  const syncMut = useMutation({
    mutationFn: (strat: "incremental" | "upsert_all" | "full_replace") =>
      syncFn({ data: { strategy: strat } }),
    onSuccess: (res) => {
      const errs = res.results.filter((r) => r.error);
      if (errs.length === 0) {
        toast.success(`Sincronizado: ${res.summary.ok}/${res.summary.tables} tabelas, ${res.summary.rows} linhas.`);
      } else {
        toast.warning(`Concluído com ${errs.length} erro(s). ${res.summary.ok} tabelas OK, ${res.summary.rows} linhas.`);
      }
      qc.invalidateQueries({ queryKey: ["db-sync-status"] });
    },
    onError: (e: Error) => toast.error(`Falha na sincronização: ${e.message}`),
  });

  const schemaMut = useMutation({
    mutationFn: (dryRun: boolean) => schemaFn({ data: { dryRun } }),
    onSuccess: (res) => {
      const r = res.report;
      const parts: string[] = [];
      if (r.tablesCreated.length) parts.push(`${r.tablesCreated.length} tabela(s)`);
      if (r.columnsAdded.length) parts.push(`${r.columnsAdded.length} coluna(s)`);
      if (r.enumsCreated.length) parts.push(`${r.enumsCreated.length} enum(s)`);
      if (r.enumLabelsAdded.length) parts.push(`${r.enumLabelsAdded.length} label(s) de enum`);
      const summary = parts.length ? parts.join(", ") : "nenhuma diferença";
      if (res.dryRun) {
        toast.info(`Prévia: ${summary}. ${res.statements.length} instrução(ões) pendente(s).`);
        console.log("[schema-sync] pendentes:\n" + res.statements.join("\n"));
      } else {
        toast.success(`Schema sincronizado: ${summary}.`);
      }
    },
    onError: (e: Error) => toast.error(`Falha no schema: ${e.message}`),
  });

  const rlsMut = useMutation({
    mutationFn: (dryRun: boolean) => rlsFn({ data: { dryRun } }),
    onSuccess: (res) => {
      const msg = `${res.policies} política(s), ${res.applied} instrução(ões)` + (res.skipped ? ` — ${res.skipped} ignorada(s) (tabela ausente no destino)` : "");
      if (res.dryRun) {
        toast.info(`Prévia RLS: ${msg}`);
        console.log("[rls-sync] pendentes:\n" + res.statements.join("\n"));
      } else {
        toast.success(`RLS sincronizado: ${msg}`);
      }
    },
    onError: (e: Error) => toast.error(`Falha no RLS: ${e.message}`),
  });

  const effectiveStrategy = strategy === "auto" ? (status?.suggestion ?? "full_replace") : strategy;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-5 text-gold" /> Backup e Exportação
          </CardTitle>
          <CardDescription>
            Gere um arquivo SQL completo com a estrutura e dados de todas as tabelas do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
            <p className="font-medium flex items-center gap-2">
              <AlertTriangle className="size-4" /> Importante
            </p>
            <p className="mt-1 opacity-80">
              A exportação inclui dados sensíveis. Mantenha o arquivo em local seguro.
            </p>
          </div>
          <Button onClick={() => exportMut.mutate()} disabled={exportMut.isPending} className="w-fit">
            {exportMut.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Download className="size-4 mr-2" />}
            Gerar Backup Agora
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-5 text-gold" /> Sincronizar com Novo Banco
          </CardTitle>
          <CardDescription>
            Replica os dados deste banco (Lovable Cloud) para o Supabase de destino, mantendo os dois iguais e atualizados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Configuração do destino */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <h4 className="text-sm font-medium">Configurações do banco de destino</h4>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">NEW_SUPABASE_URL</Label>
                <Input readOnly value={status?.destinationUrl ?? "— não configurado —"} className="font-mono text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">NEW_SUPABASE_SERVICE_ROLE_KEY</Label>
                <Input readOnly value={status?.destinationConfigured ? "••••••••••••••••" : "— não configurado —"} className="font-mono text-xs" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Os valores ficam nos secrets do projeto. Para trocar, edite <code>NEW_SUPABASE_URL</code> e <code>NEW_SUPABASE_SERVICE_ROLE_KEY</code> em Configurações → Secrets.
            </p>
            <div className="text-xs">
              {statusLoading ? (
                <span className="text-muted-foreground">Verificando conexão...</span>
              ) : !status?.destinationConfigured ? (
                <span className="text-destructive">⚠ Secrets não configurados</span>
              ) : status.destinationReachable ? (
                <span className="text-emerald-500">✓ Conectado ao destino</span>
              ) : (
                <span className="text-destructive">✗ Não foi possível conectar: {status.destinationError}</span>
              )}
            </div>
          </div>

          {/* Estratégia */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Estratégia de sincronização</h4>
            <p className="text-xs text-muted-foreground">
              Sugestão do sistema: <strong className="text-gold">{status?.suggestion ?? "..."}</strong> — {status?.suggestionReason ?? ""}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { v: "auto", label: "Automático (sugerido)", desc: "Usa a recomendação do sistema" },
                { v: "incremental", label: "Incremental", desc: "Apenas linhas alteradas (updated_at). Rápido." },
                { v: "upsert_all", label: "Upsert completo", desc: "Reenvia todas as linhas por PK. Sem deletes." },
                { v: "full_replace", label: "Substituir tudo", desc: "Apaga destino e reinsere. Lento, 100% consistente." },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setStrategy(opt.v as any)}
                  className={`text-left rounded-lg border p-3 transition ${
                    strategy === opt.v ? "border-gold bg-gold/10" : "border-border hover:border-gold/50"
                  }`}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => syncMut.mutate(effectiveStrategy as any)}
              disabled={syncMut.isPending || !status?.destinationReachable}
              className="w-fit"
            >
              {syncMut.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Download className="size-4 mr-2 rotate-180" />}
              Sincronizar dados ({effectiveStrategy})
            </Button>
            <Button
              variant="outline"
              onClick={() => schemaMut.mutate(true)}
              disabled={schemaMut.isPending || !status?.destinationReachable}
              className="w-fit"
            >
              {schemaMut.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
              Prévia da migração (dry-run)
            </Button>
            <Button
              variant="secondary"
              onClick={() => schemaMut.mutate(false)}
              disabled={schemaMut.isPending || !status?.destinationReachable}
              className="w-fit"
            >
              {schemaMut.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
              Aplicar migração de schema
            </Button>
            <Button
              variant="outline"
              onClick={() => rlsMut.mutate(true)}
              disabled={rlsMut.isPending || !status?.destinationReachable}
              className="w-fit"
            >
              {rlsMut.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
              Prévia RLS (dry-run)
            </Button>
            <Button
              variant="secondary"
              onClick={() => rlsMut.mutate(false)}
              disabled={rlsMut.isPending || !status?.destinationReachable}
              className="w-fit"
            >
              {rlsMut.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
              Aplicar políticas RLS
            </Button>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            A migração de schema cria tabelas/colunas/enums faltantes (aditivo). O botão RLS habilita Row Level Security e replica todas as políticas do Lovable Cloud no destino (recria com o mesmo nome — sobrescreve se já existir).
          </p>

          {/* Última sincronização */}
          {status?.lastGlobal && (
            <p className="text-xs text-muted-foreground">
              Última sincronização: {new Date(status.lastGlobal).toLocaleString("pt-BR")}
            </p>
          )}

          {/* Histórico por tabela */}
          {status?.history && status.history.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Ver histórico por tabela ({status.history.length})
              </summary>
              <div className="mt-2 max-h-64 overflow-auto rounded border border-border">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="text-left">
                      <th className="p-2">Tabela</th>
                      <th className="p-2">Última</th>
                      <th className="p-2">Estratégia</th>
                      <th className="p-2">Linhas</th>
                      <th className="p-2">Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.history.map((h: any) => (
                      <tr key={h.table_name} className="border-t border-border">
                        <td className="p-2 font-mono">{h.table_name}</td>
                        <td className="p-2">{new Date(h.last_sync_at).toLocaleString("pt-BR")}</td>
                        <td className="p-2">{h.last_strategy ?? "—"}</td>
                        <td className="p-2">{h.rows_synced ?? 0}</td>
                        <td className="p-2 text-destructive">{h.last_error ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


