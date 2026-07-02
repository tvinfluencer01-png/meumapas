import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminGetDashboard,
  adminListProducts, adminUpsertProduct, adminDeleteProduct, adminToggleProductActive, adminSyncCatalogProducts,
  adminListCommissionRules, adminUpsertCommissionRule, adminDeleteCommissionRule,
  adminListCoupons, adminUpsertCoupon, adminDeleteCoupon,
  adminListCampaigns, adminUpsertCampaign,
  adminListMaterials, adminUpsertMaterial, adminDeleteMaterial, adminUploadMaterialImage,
  adminListCommissions, adminUpdateCommissionStatus,
  adminListWithdraws, adminUpdateWithdraw,
  adminBroadcastMessage,
  adminListFraudFlags, adminResolveFraudFlag,
  adminUpdateExtendedSettings,
  adminListLogs, adminListWebhookEvents,
  adminGetRanking,
  adminExport,
} from "../admin.functions";
import { adminGetAffiliateReports } from "../admin-reports.functions";
import {
  adminListAffiliates, adminSetAffiliateStatus, adminGetSettings,
  adminUpdateAffiliate, adminSetAffiliatePassword, adminSendAffiliatePasswordReset,
} from "../affiliate.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GradientStatCard } from "@/components/ui/gradient-stat-card";
import { toneByIndex, toneRow } from "@/lib/kpi-tones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import {
  LayoutDashboard, Users, Package, Percent, HandCoins, MessageSquare, ImageIcon,
  Megaphone, Trophy, FileBarChart, Settings as SettingsIcon, ScrollText, Download,
  Shield, Plus, Trash2, Pencil, Send, Loader2,
  CreditCard, Layers, Banknote, BookOpen,
  Radio, ShieldAlert, BarChart3, Cookie, Bell, Webhook, History,
} from "lucide-react";
import { toast } from "sonner";
import {
  CheckoutProvidersSection, CommissionOverridesSection, CommissionTiersSection,
  PayoutBatchesSection, LedgerSection,
} from "./AdminMonetizationSections";
import {
  PixelsSection, FraudAiSection, RoiSection, CookieConsentsSection,
} from "./AdminIntelligenceSections";
import {
  LevelsSection, BadgesSection, MissionsSection, LeaderboardSection,
} from "./AdminGamificationSections";
import {
  NotificationTemplatesSection, NotificationRulesSection,
  OutboundWebhooksSection, NotificationDispatchesSection,
} from "./AdminIntegrationsSections";

const SECTIONS = [
  { id: "dashboard", label: "Dashboard Geral", icon: LayoutDashboard },
  { id: "affiliates", label: "Afiliados", icon: Users },
  { id: "products", label: "Produtos", icon: Package },
  { id: "commissions", label: "Comissões", icon: Percent },
  { id: "overrides", label: "Overrides", icon: Percent },
  { id: "tiers", label: "Faixas", icon: Layers },
  { id: "checkouts", label: "Gateways", icon: CreditCard },
  { id: "withdraws", label: "Saques", icon: HandCoins },
  { id: "batches", label: "Lotes Pagto", icon: Banknote },
  { id: "ledger", label: "Livro-razão", icon: BookOpen },
  { id: "pixels", label: "Pixels", icon: Radio },
  { id: "fraud_ai", label: "Antifraude IA", icon: ShieldAlert },
  { id: "roi", label: "ROI / ROAS", icon: BarChart3 },
  { id: "consents", label: "Consentimentos", icon: Cookie },
  { id: "messages", label: "Mensagens", icon: MessageSquare },
  { id: "materials", label: "Materiais", icon: ImageIcon },
  { id: "campaigns", label: "Campanhas", icon: Megaphone },
  { id: "levels", label: "Níveis", icon: Layers },
  { id: "badges", label: "Badges", icon: Trophy },
  { id: "missions", label: "Missões", icon: Trophy },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  { id: "ranking", label: "Ranking (legado)", icon: Trophy },
  { id: "notif_templates", label: "Notif. Templates", icon: Bell },
  { id: "notif_rules", label: "Notif. Regras", icon: Radio },
  { id: "outbound_hooks", label: "Webhooks Saída", icon: Webhook },
  { id: "notif_dispatches", label: "Notif. Histórico", icon: History },
  { id: "reports", label: "Relatórios", icon: FileBarChart },
  { id: "settings", label: "Configurações", icon: SettingsIcon },
  { id: "logs", label: "Logs & Antifraude", icon: ScrollText },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

export function AdminAffiliatePanel() {
  const [section, setSection] = useState<SectionId>("dashboard");
  const activeLabel = SECTIONS.find((s) => s.id === section)?.label ?? "";
  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      <aside className="lg:w-64 shrink-0 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)]">
        <div className="rounded-lg border border-border bg-card/40 backdrop-blur">
          <div className="px-3 py-3 border-b border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Affiliate Center</div>
            <div className="font-serif text-sm text-gold">{activeLabel}</div>
          </div>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-y-auto lg:max-h-[calc(100vh-8rem)] p-2 scrollbar-gold">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  aria-current={active ? "page" : undefined}
                  ref={(el) => {
                    if (active && el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left whitespace-nowrap transition-colors ${
                    active
                      ? "bg-gold/15 text-gold border border-gold/40 shadow-[0_0_10px_rgba(212,175,55,0.15)] font-medium"
                      : "text-muted-foreground hover:text-gold hover:bg-secondary/40 border border-transparent"
                  }`}
                >
                  <Icon className={`size-4 shrink-0 ${active ? "text-gold" : ""}`} />
                  <span className="flex-1">{s.label}</span>
                  {active && <span className="size-1.5 rounded-full bg-gold shadow-[0_0_6px_rgba(212,175,55,0.8)]" />}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        {section === "dashboard" && <DashboardSection />}
        {section === "affiliates" && <AffiliatesSection />}
        {section === "products" && <ProductsSection />}
        {section === "commissions" && <CommissionsSection />}
        {section === "overrides" && <CommissionOverridesSection />}
        {section === "tiers" && <CommissionTiersSection />}
        {section === "checkouts" && <CheckoutProvidersSection />}
        {section === "withdraws" && <WithdrawsSection />}
        {section === "batches" && <PayoutBatchesSection />}
        {section === "ledger" && <LedgerSection />}
        {section === "pixels" && <PixelsSection />}
        {section === "fraud_ai" && <FraudAiSection />}
        {section === "roi" && <RoiSection />}
        {section === "consents" && <CookieConsentsSection />}
        {section === "messages" && <MessagesSection />}
        {section === "materials" && <MaterialsSection />}
        {section === "campaigns" && <CampaignsSection />}
        {section === "levels" && <LevelsSection />}
        {section === "badges" && <BadgesSection />}
        {section === "missions" && <MissionsSection />}
        {section === "leaderboard" && <LeaderboardSection />}
        {section === "ranking" && <RankingSection />}
        {section === "notif_templates" && <NotificationTemplatesSection />}
        {section === "notif_rules" && <NotificationRulesSection />}
        {section === "outbound_hooks" && <OutboundWebhooksSection />}
        {section === "notif_dispatches" && <NotificationDispatchesSection />}
        {section === "reports" && <ReportsSection />}
        {section === "settings" && <SettingsSection />}
        {section === "logs" && <LogsSection />}
      </div>
    </div>
  );
}

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Kpi({ title, value, icon: Icon, tone = "sky" }: { title: string; value: any; icon?: any; tone?: string }) {
  const g = KPI_TONES[tone] || KPI_TONES.sky;
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 shadow-sm transition-shadow hover:shadow-md ${g}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{title}</span>
        {Icon && <Icon className="size-4 text-foreground/70" />}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════
function DashboardSection() {
  const fn = useServerFn(adminGetDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["aff-dash"], queryFn: () => fn() });
  if (isLoading || !data) return <div className="p-6 text-center text-muted-foreground"><Loader2 className="size-5 animate-spin inline mr-2" />Carregando…</div>;
  const k = data.kpis;
  const pieData = [
    { name: "Disponível", value: k.commAvailableCents },
    { name: "Pendente", value: k.commPendingCents },
    { name: "Pago", value: k.commPaidCents },
  ];
  const COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground))", "hsl(var(--accent))"];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi title="Total afiliados" value={k.totalAffiliates} icon={Users} tone="indigo" />
        <Kpi title="Ativos" value={k.activeAffiliates} icon={Users} tone="emerald" />
        <Kpi title="Pendentes" value={k.pendingAffiliates} icon={Users} tone="amber" />
        <Kpi title="Cliques hoje" value={k.clicksToday} icon={LayoutDashboard} tone="sky" />
        <Kpi title="Cliques total" value={k.clicksTotal} icon={LayoutDashboard} tone="teal" />
        <Kpi title="Conversão" value={`${k.conversion.toFixed(2)}%`} icon={Percent} tone="violet" />
        <Kpi title="Receita 30d" value={money(k.revenueCents)} icon={HandCoins} tone="rose" />
        <Kpi title="Comissões" value={money(k.commissionsCents)} icon={Percent} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Receita e pedidos (30 dias)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name="Receita R$" />
                <Line type="monotone" dataKey="orders" stroke="hsl(var(--accent))" name="Pedidos" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Distribuição de comissões</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Mapa mundial (top países)</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {data.geo.length === 0 && <div className="text-sm text-muted-foreground">Sem dados</div>}
            {data.geo.map((g: any) => {
              const max = data.geo[0]?.clicks ?? 1;
              return (
                <div key={g.country} className="text-xs">
                  <div className="flex justify-between mb-1">
                    <span>{g.country}</span><span>{g.clicks}</span>
                  </div>
                  <div className="h-1 bg-muted rounded"><div className="h-1 bg-primary rounded" style={{ width: `${(g.clicks / max) * 100}%` }} /></div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top produtos</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topProducts} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => money(v)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top afiliados</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {data.topAffiliates.map((a: any, i: number) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <div><span className="font-semibold mr-2">#{i + 1}</span>{a.name} <span className="text-muted-foreground">({a.code})</span></div>
                <span className="text-primary font-medium">{money(a.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// AFFILIATES
// ═══════════════════════════════════════════════════════
function AffiliatesSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListAffiliates);
  const statusFn = useServerFn(adminSetAffiliateStatus);
  const updateFn = useServerFn(adminUpdateAffiliate);
  const pwdFn = useServerFn(adminSetAffiliatePassword);
  const resetFn = useServerFn(adminSendAffiliatePasswordReset);
  const [q, setQ] = useState(""); const [status, setStatus] = useState("");
  const { data: rows } = useQuery({ queryKey: ["adm-aff", q, status], queryFn: () => listFn({ data: { q: q || undefined, status: status || undefined } }) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["adm-aff"] });
  const mut = useMutation({
    mutationFn: (v: any) => statusFn({ data: v }),
    onSuccess: () => { toast.success("Status atualizado"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const [editing, setEditing] = useState<any | null>(null);
  const [pwdTarget, setPwdTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", email: "", whatsapp: "" });
  const [newPwd, setNewPwd] = useState("");

  const saveEdit = useMutation({
    mutationFn: () => updateFn({ data: { affiliateId: editing.id, ...editForm } }),
    onSuccess: () => { toast.success("Afiliado atualizado"); setEditing(null); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const savePwd = useMutation({
    mutationFn: () => pwdFn({ data: { affiliateId: pwdTarget.id, password: newPwd } }),
    onSuccess: () => { toast.success("Senha atualizada"); setPwdTarget(null); setNewPwd(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const sendReset = useMutation({
    mutationFn: (id: string) => resetFn({ data: { affiliateId: id, redirectTo: `${window.location.origin}/reset-password` } }),
    onSuccess: (r: any) => toast.success(`Email de redefinição enviado para ${r.email}`),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Afiliados</CardTitle>
        <div className="flex gap-2 mt-3">
          <Input placeholder="Buscar por nome…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="rejected">Rejeitados</SelectItem>
              <SelectItem value="suspended">Suspensos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left p-2">Nome</th><th>Código</th><th>Email</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {(rows ?? []).map((r: any) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-2">{r.full_name}</td>
                  <td className="text-center">{r.affiliate_code}</td>
                  <td className="text-center">{r.email}</td>
                  <td className="text-center"><Badge variant="secondary">{r.status}</Badge></td>
                  <td className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="sm" variant="ghost">Ações</Button></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => { setEditing(r); setEditForm({ fullName: r.full_name ?? "", email: r.email ?? "", whatsapp: r.whatsapp ?? "" }); }}>
                          <Pencil className="size-3 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setPwdTarget(r); setNewPwd(""); }}>
                          Mudar senha
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => sendReset.mutate(r.id)}>
                          <Send className="size-3 mr-2" /> Enviar senha por email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => mut.mutate({ affiliateId: r.id, status: "approved" })}>Aprovar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => mut.mutate({ affiliateId: r.id, status: "suspended" })}>Suspender</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => mut.mutate({ affiliateId: r.id, status: "rejected" })}>Rejeitar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar afiliado</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
              <div><Label>WhatsApp</Label><Input value={editForm.whatsapp} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!pwdTarget} onOpenChange={(o) => !o && setPwdTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Mudar senha — {pwdTarget?.full_name}</DialogTitle></DialogHeader>
            <div>
              <Label>Nova senha (mín. 8)</Label>
              <Input type="text" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPwdTarget(null)}>Cancelar</Button>
              <Button onClick={() => savePwd.mutate()} disabled={savePwd.isPending || newPwd.length < 8}>Salvar senha</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════
function ProductsSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListProducts);
  const upsertFn = useServerFn(adminUpsertProduct);
  const delFn = useServerFn(adminDeleteProduct);
  const toggleFn = useServerFn(adminToggleProductActive);
  const syncFn = useServerFn(adminSyncCatalogProducts);
  const { data: rows } = useQuery({ queryKey: ["adm-products"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ slug: "", name: "", price_cents: 0, active: true });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["adm-products"] });
  const save = useMutation({
    mutationFn: (v: any) => upsertFn({ data: v }),
    onSuccess: () => { toast.success("Salvo"); setOpen(false); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Removido"); invalidate(); },
  });
  const toggle = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggleFn({ data: v }),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });
  const sync = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: (r: any) => { toast.success(`Sincronizado: ${r.inserted} novo(s) produto(s) adicionado(s)`); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Produtos afiliáveis</CardTitle>
          <CardDescription>Ative/desative cada produto para exibi-lo ao afiliado. Use "Sincronizar catálogo" para importar planos, créditos e relatórios do sistema.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
            {sync.isPending ? "Sincronizando..." : "Sincronizar catálogo"}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" onClick={() => setForm({ slug: "", name: "", price_cents: 0, active: true, commission_rate: 20 })}><Plus className="size-4 mr-1" />Novo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} produto</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
                <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Descrição</Label><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Categoria</Label>
                    <Select value={form.category ?? ""} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plano">Plano (assinatura)</SelectItem>
                        <SelectItem value="creditos">Créditos avulsos</SelectItem>
                        <SelectItem value="relatorio">Relatório avulso</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Preço (centavos)</Label><Input type="number" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: Number(e.target.value) })} /></div>
                  <div><Label>Comissão %</Label><Input type="number" value={form.commission_rate ?? ""} onChange={(e) => setForm({ ...form, commission_rate: e.target.value ? Number(e.target.value) : null })} /></div>
                  <div><Label>Comissão fixa (centavos)</Label><Input type="number" value={form.commission_fixed_cents ?? ""} onChange={(e) => setForm({ ...form, commission_fixed_cents: e.target.value ? Number(e.target.value) : null })} /></div>
                </div>
                <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label>Visível para afiliados</Label></div>
              </div>
              <DialogFooter><Button onClick={() => save.mutate(form)} disabled={save.isPending}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left p-2">Produto</th><th>Categoria</th><th>Preço</th><th>Comissão</th><th>Visível</th><th></th></tr></thead>
            <tbody>
              {(rows ?? []).map((r: any) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.slug}</div>
                  </td>
                  <td className="text-center">{r.category ? <Badge variant="outline">{r.category}</Badge> : "—"}</td>
                  <td className="text-center">{money(r.price_cents)}</td>
                  <td className="text-center">{r.commission_rate != null ? `${r.commission_rate}%` : r.commission_fixed_cents != null ? money(r.commission_fixed_cents) : "—"}</td>
                  <td className="text-center">
                    <Switch checked={!!r.active} onCheckedChange={(v) => toggle.mutate({ id: r.id, active: v })} />
                  </td>
                  <td className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setForm(r); setOpen(true); }}><Pencil className="size-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="size-4" /></Button>
                  </td>
                </tr>
              ))}
              {(rows ?? []).length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum produto cadastrado. Clique em <b>Sincronizar catálogo</b> para importar automaticamente.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// COMMISSIONS (rules + list)
// ═══════════════════════════════════════════════════════
function CommissionsSection() {
  const qc = useQueryClient();
  const listRulesFn = useServerFn(adminListCommissionRules);
  const upsertRuleFn = useServerFn(adminUpsertCommissionRule);
  const delRuleFn = useServerFn(adminDeleteCommissionRule);
  const listCommFn = useServerFn(adminListCommissions);
  const setStatusFn = useServerFn(adminUpdateCommissionStatus);

  const { data: rules } = useQuery({ queryKey: ["adm-rules"], queryFn: () => listRulesFn() });
  const { data: comms } = useQuery({ queryKey: ["adm-comms"], queryFn: () => listCommFn({ data: {} }) });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", scope: "global", kind: "percent", value: 20, model: "first_purchase", priority: 0, active: true });
  const save = useMutation({
    mutationFn: (v: any) => upsertRuleFn({ data: v }),
    onSuccess: () => { toast.success("Regra salva"); setOpen(false); qc.invalidateQueries({ queryKey: ["adm-rules"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({ mutationFn: (id: string) => delRuleFn({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-rules"] }) });
  const changeStatus = useMutation({
    mutationFn: (v: any) => setStatusFn({ data: v }),
    onSuccess: () => { toast.success("Comissão atualizada"); qc.invalidateQueries({ queryKey: ["adm-comms"] }); },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Regras de comissão</CardTitle><CardDescription>Fixa / percentual, por produto, categoria, afiliado ou global. Modelos: primeira compra, recorrente ou vitalícia.</CardDescription></div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" onClick={() => setForm({ name: "", scope: "global", kind: "percent", value: 20, model: "first_purchase", priority: 0, active: true })}><Plus className="size-4 mr-1" />Nova regra</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{form.id ? "Editar" : "Nova"} regra</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Escopo</Label>
                    <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Global</SelectItem>
                        <SelectItem value="product">Produto</SelectItem>
                        <SelectItem value="category">Categoria</SelectItem>
                        <SelectItem value="affiliate">Afiliado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Referência (slug/categoria)</Label><Input value={form.scope_ref ?? ""} onChange={(e) => setForm({ ...form, scope_ref: e.target.value })} /></div>
                  <div><Label>Tipo</Label>
                    <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="percent">Percentual</SelectItem><SelectItem value="fixed">Fixo (centavos)</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Valor</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></div>
                  <div><Label>Modelo</Label>
                    <Select value={form.model} onValueChange={(v) => setForm({ ...form, model: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="first_purchase">Primeira compra</SelectItem><SelectItem value="recurring">Recorrente</SelectItem><SelectItem value="lifetime">Vitalícia</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Prioridade</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} /></div>
                </div>
                <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label>Ativa</Label></div>
              </div>
              <DialogFooter><Button onClick={() => save.mutate(form)}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left p-2">Nome</th><th>Escopo</th><th>Ref</th><th>Tipo</th><th>Valor</th><th>Modelo</th><th>Prio</th><th></th></tr></thead>
              <tbody>
                {(rules ?? []).map((r: any) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-2">{r.name}</td><td className="text-center">{r.scope}</td><td className="text-center">{r.scope_ref ?? "-"}</td>
                    <td className="text-center">{r.kind}</td><td className="text-center">{r.value}</td><td className="text-center">{r.model}</td><td className="text-center">{r.priority}</td>
                    <td className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setForm(r); setOpen(true); }}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="size-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Comissões geradas</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left p-2">Afiliado</th><th>Pedido</th><th>Valor</th><th>Rate</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {(comms ?? []).map((c: any) => (
                  <tr key={c.id} className="border-b">
                    <td className="p-2">{c.affiliate_profiles?.full_name}</td>
                    <td className="text-center">{c.affiliate_orders?.order_ref ?? "-"}</td>
                    <td className="text-center">{money(c.amount_cents)}</td>
                    <td className="text-center">{c.rate ?? "-"}%</td>
                    <td className="text-center"><Badge>{c.status}</Badge></td>
                    <td>
                      <Select value={c.status} onValueChange={(v: any) => changeStatus.mutate({ id: c.id, status: v })}>
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="approved">Aprovada</SelectItem>
                          <SelectItem value="paid">Paga</SelectItem>
                          <SelectItem value="reversed">Revertida</SelectItem>
                          <SelectItem value="blocked">Bloqueada</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// WITHDRAWS
// ═══════════════════════════════════════════════════════
function WithdrawsSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListWithdraws);
  const updFn = useServerFn(adminUpdateWithdraw);
  const { data: rows } = useQuery({ queryKey: ["adm-wd"], queryFn: () => listFn() });
  const mut = useMutation({
    mutationFn: (v: any) => updFn({ data: v }),
    onSuccess: () => { toast.success("Saque atualizado"); qc.invalidateQueries({ queryKey: ["adm-wd"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader><CardTitle>Solicitações de saque</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left p-2">Afiliado</th><th>Método</th><th>Valor</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {(rows ?? []).map((r: any) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.affiliate_profiles?.full_name}</td>
                  <td className="text-center">{r.method}</td>
                  <td className="text-center">{money(r.amount_cents)}</td>
                  <td className="text-center"><Badge>{r.status}</Badge></td>
                  <td className="text-right">
                    <Select value={r.status} onValueChange={(v: any) => mut.mutate({ id: r.id, status: v })}>
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="requested">Solicitado</SelectItem>
                        <SelectItem value="approved">Aprovado</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="rejected">Rejeitado</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// MESSAGES (broadcast)
// ═══════════════════════════════════════════════════════
function MessagesSection() {
  const fn = useServerFn(adminBroadcastMessage);
  const [form, setForm] = useState<any>({ subject: "", body: "", channel: "notification", affiliateId: "" });
  const mut = useMutation({
    mutationFn: (v: any) => fn({ data: { ...v, affiliateId: v.affiliateId || null } }),
    onSuccess: (r: any) => { toast.success(`Enviado para ${r.count} afiliado(s)`); setForm({ subject: "", body: "", channel: "notification", affiliateId: "" }); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader><CardTitle>Enviar mensagem</CardTitle><CardDescription>Envie notificações (toast/push) ou mensagens (inbox) para um afiliado específico ou todos os aprovados.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        <div><Label>Assunto</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
        <div><Label>Mensagem</Label><Textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Canal</Label>
            <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="notification">Notificação</SelectItem><SelectItem value="message">Mensagem</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Afiliado ID (opcional)</Label><Input value={form.affiliateId} onChange={(e) => setForm({ ...form, affiliateId: e.target.value })} placeholder="Vazio = todos" /></div>
        </div>
        <Button onClick={() => mut.mutate(form)} disabled={mut.isPending}><Send className="size-4 mr-2" />Enviar</Button>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// MATERIALS
// ═══════════════════════════════════════════════════════
const MATERIAL_DIMENSIONS: Record<string, { w: number; h: number; label: string }> = {
  banner: { w: 1200, h: 628, label: "1200×628 (banner web / Facebook / LinkedIn)" },
  reel: { w: 1080, h: 1920, label: "1080×1920 (Reels / TikTok / Shorts 9:16)" },
  story: { w: 1080, h: 1920, label: "1080×1920 (Stories Instagram/Facebook 9:16)" },
  carousel: { w: 1080, h: 1080, label: "1080×1080 (post quadrado Instagram 1:1)" },
  logo: { w: 512, h: 512, label: "512×512 (logo PNG transparente)" },
  video: { w: 1920, h: 1080, label: "1920×1080 (vídeo horizontal 16:9)" },
  pdf: { w: 1240, h: 1754, label: "1240×1754 (A4 300dpi)" },
  training: { w: 1280, h: 720, label: "1280×720 (thumbnail treinamento)" },
  copy: { w: 0, h: 0, label: "Texto — imagem opcional" },
};

function MaterialsSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListMaterials);
  const upFn = useServerFn(adminUpsertMaterial);
  const delFn = useServerFn(adminDeleteMaterial);
  const uploadFn = useServerFn(adminUploadMaterialImage);
  const { data: rows } = useQuery({ queryKey: ["adm-materials"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ kind: "banner", title: "", tags: [], active: true });
  const [uploading, setUploading] = useState(false);
  const save = useMutation({
    mutationFn: (v: any) => upFn({ data: v }),
    onSuccess: () => { toast.success("Salvo"); setOpen(false); qc.invalidateQueries({ queryKey: ["adm-materials"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({ mutationFn: (id: string) => delFn({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-materials"] }) });

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Arquivo maior que 5MB"); return; }
    setUploading(true);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const s = String(r.result || "");
          resolve(s.includes(",") ? s.split(",")[1] : s);
        };
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      const res = await uploadFn({ data: { filename: file.name, contentType: file.type || "image/png", dataBase64 } });
      setForm((f: any) => ({ ...f, url: res.url, thumb_url: res.url }));
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(e.message || "Falha no upload");
    } finally { setUploading(false); }
  };

  const dim = MATERIAL_DIMENSIONS[form.kind] ?? MATERIAL_DIMENSIONS.banner;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Materiais de marketing</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" onClick={() => setForm({ kind: "banner", title: "", tags: [], active: true })}><Plus className="size-4 mr-1" />Novo</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Material</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Tipo</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["video","banner","reel","story","carousel","logo","copy","pdf","training"].map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Dimensão recomendada: {dim.label}</p>
              </div>
              <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div>
                <Label>Imagem do material</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input type="file" accept="image/*" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                  {uploading && <Loader2 className="size-4 animate-spin" />}
                </div>
                {form.url && (
                  <div className="mt-2 border rounded p-2 bg-muted/30">
                    <img src={form.url} alt="preview" className="max-h-40 rounded object-contain mx-auto" />
                  </div>
                )}
              </div>
              <div><Label>URL (imagem/arquivo)</Label><Input value={form.url ?? ""} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="Preenchido automaticamente ao enviar" /></div>
              <div><Label>Miniatura URL</Label><Input value={form.thumb_url ?? ""} onChange={(e) => setForm({ ...form, thumb_url: e.target.value })} /></div>
              <div><Label>Texto (copy)</Label><Textarea value={form.content ?? ""} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label>Ativo</Label></div>
            </div>
            <DialogFooter><Button onClick={() => save.mutate(form)} disabled={save.isPending}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(rows ?? []).map((m: any) => (
            <div key={m.id} className="border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">{m.kind}</Badge>
                <div>
                  <Button size="icon" variant="ghost" onClick={() => { setForm(m); setOpen(true); }}><Pencil className="size-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(m.id)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
              {(m.thumb_url || m.url) && (
                <img src={m.thumb_url || m.url} alt={m.title} className="w-full h-32 object-cover rounded mb-2" loading="lazy" />
              )}
              <div className="font-medium text-sm">{m.title}</div>
              {m.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.description}</div>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// CAMPAIGNS
// ═══════════════════════════════════════════════════════
function CampaignsSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListCampaigns);
  const upFn = useServerFn(adminUpsertCampaign);
  const listCFn = useServerFn(adminListCoupons);
  const upCFn = useServerFn(adminUpsertCoupon);
  const delCFn = useServerFn(adminDeleteCoupon);
  const { data: camps } = useQuery({ queryKey: ["adm-camps"], queryFn: () => listFn() });
  const { data: coupons } = useQuery({ queryKey: ["adm-coupons"], queryFn: () => listCFn() });

  const [cOpen, setCOpen] = useState(false);
  const [cForm, setCForm] = useState<any>({ name: "", active: true });
  const saveC = useMutation({ mutationFn: (v: any) => upFn({ data: v }), onSuccess: () => { toast.success("Salvo"); setCOpen(false); qc.invalidateQueries({ queryKey: ["adm-camps"] }); }, onError: (e: any) => toast.error(e.message) });

  const [kOpen, setKOpen] = useState(false);
  const [kForm, setKForm] = useState<any>({ code: "", discount_percent: 10, active: true });
  const saveK = useMutation({ mutationFn: (v: any) => upCFn({ data: v }), onSuccess: () => { toast.success("Salvo"); setKOpen(false); qc.invalidateQueries({ queryKey: ["adm-coupons"] }); }, onError: (e: any) => toast.error(e.message) });
  const delK = useMutation({ mutationFn: (id: string) => delCFn({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-coupons"] }) });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Campanhas</CardTitle>
          <Dialog open={cOpen} onOpenChange={setCOpen}>
            <DialogTrigger asChild><Button size="sm" onClick={() => setCForm({ name: "", active: true })}><Plus className="size-4 mr-1" />Nova</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Campanha</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome</Label><Input value={cForm.name} onChange={(e) => setCForm({ ...cForm, name: e.target.value })} /></div>
                <div><Label>Descrição</Label><Textarea value={cForm.description ?? ""} onChange={(e) => setCForm({ ...cForm, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Início</Label><Input type="date" value={cForm.starts_at?.slice(0, 10) ?? ""} onChange={(e) => setCForm({ ...cForm, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
                  <div><Label>Fim</Label><Input type="date" value={cForm.ends_at?.slice(0, 10) ?? ""} onChange={(e) => setCForm({ ...cForm, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
                  <div><Label>Meta (centavos)</Label><Input type="number" value={cForm.goal_cents ?? ""} onChange={(e) => setCForm({ ...cForm, goal_cents: e.target.value ? Number(e.target.value) : null })} /></div>
                  <div><Label>Bônus (centavos)</Label><Input type="number" value={cForm.bonus_cents ?? ""} onChange={(e) => setCForm({ ...cForm, bonus_cents: e.target.value ? Number(e.target.value) : null })} /></div>
                </div>
                <div className="flex items-center gap-2"><Switch checked={cForm.active} onCheckedChange={(v) => setCForm({ ...cForm, active: v })} /><Label>Ativa</Label></div>
              </div>
              <DialogFooter><Button onClick={() => saveC.mutate(cForm)}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left p-2">Nome</th><th>Período</th><th>Meta</th><th>Bônus</th><th>Ativa</th></tr></thead>
            <tbody>
              {(camps ?? []).map((c: any) => (
                <tr key={c.id} className="border-b">
                  <td className="p-2">{c.name}</td>
                  <td className="text-center">{c.starts_at?.slice(0, 10) ?? "-"} → {c.ends_at?.slice(0, 10) ?? "-"}</td>
                  <td className="text-center">{c.goal_cents ? money(c.goal_cents) : "-"}</td>
                  <td className="text-center">{c.bonus_cents ? money(c.bonus_cents) : "-"}</td>
                  <td className="text-center">{c.active ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cupons</CardTitle>
          <Dialog open={kOpen} onOpenChange={setKOpen}>
            <DialogTrigger asChild><Button size="sm" onClick={() => setKForm({ code: "", discount_percent: 10, active: true })}><Plus className="size-4 mr-1" />Novo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Cupom</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Código</Label><Input value={kForm.code} onChange={(e) => setKForm({ ...kForm, code: e.target.value.toUpperCase() })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>% desconto</Label><Input type="number" value={kForm.discount_percent ?? ""} onChange={(e) => setKForm({ ...kForm, discount_percent: e.target.value ? Number(e.target.value) : null })} /></div>
                  <div><Label>R$ desconto (centavos)</Label><Input type="number" value={kForm.discount_cents ?? ""} onChange={(e) => setKForm({ ...kForm, discount_cents: e.target.value ? Number(e.target.value) : null })} /></div>
                  <div><Label>Máx. usos</Label><Input type="number" value={kForm.max_uses ?? ""} onChange={(e) => setKForm({ ...kForm, max_uses: e.target.value ? Number(e.target.value) : null })} /></div>
                  <div><Label>Expira</Label><Input type="date" value={kForm.expires_at?.slice(0, 10) ?? ""} onChange={(e) => setKForm({ ...kForm, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
                  <div className="col-span-2"><Label>Afiliado ID (opcional)</Label><Input value={kForm.affiliate_id ?? ""} onChange={(e) => setKForm({ ...kForm, affiliate_id: e.target.value || null })} /></div>
                </div>
                <div className="flex items-center gap-2"><Switch checked={kForm.active} onCheckedChange={(v) => setKForm({ ...kForm, active: v })} /><Label>Ativo</Label></div>
              </div>
              <DialogFooter><Button onClick={() => saveK.mutate(kForm)}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left p-2">Código</th><th>Desconto</th><th>Usos</th><th>Expira</th><th></th></tr></thead>
            <tbody>
              {(coupons ?? []).map((k: any) => (
                <tr key={k.id} className="border-b">
                  <td className="p-2 font-mono">{k.code}</td>
                  <td className="text-center">{k.discount_percent ? `${k.discount_percent}%` : money(k.discount_cents ?? 0)}</td>
                  <td className="text-center">{k.uses}{k.max_uses ? `/${k.max_uses}` : ""}</td>
                  <td className="text-center">{k.expires_at?.slice(0, 10) ?? "-"}</td>
                  <td className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setKForm(k); setKOpen(true); }}><Pencil className="size-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => delK.mutate(k.id)}><Trash2 className="size-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// RANKING
// ═══════════════════════════════════════════════════════
function RankingSection() {
  const fn = useServerFn(adminGetRanking);
  const { data } = useQuery({ queryKey: ["adm-rank"], queryFn: () => fn() });
  return (
    <Card>
      <CardHeader><CardTitle>Ranking do mês</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2">
          {(data ?? []).map((r: any, i: number) => (
            <div key={r.id} className="flex items-center justify-between border-b py-2">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-primary w-8">#{i + 1}</span>
                <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.code} • {r.sales} vendas</div></div>
              </div>
              <div className="text-primary font-semibold">{money(r.revenueCents)}</div>
            </div>
          ))}
          {(data ?? []).length === 0 && <div className="text-sm text-muted-foreground">Nenhuma venda neste mês.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// REPORTS + EXPORT
// ═══════════════════════════════════════════════════════
function ReportsSection() {
  const exportFn = useServerFn(adminExport);
  const reportsFn = useServerFn(adminGetAffiliateReports);
  const [entity, setEntity] = useState<any>("affiliates");
  const [days, setDays] = useState<number>(30);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["adm-aff-reports", days],
    queryFn: () => reportsFn({ data: { days } }),
  });

  const download = async (format: "csv" | "xls" | "pdf") => {
    try {
      const res: any = await exportFn({ data: { entity, format } });
      const blob = res.encoding === "base64"
        ? new Blob([Uint8Array.from(atob(res.content), (c) => c.charCodeAt(0))], { type: res.mime })
        : new Blob(["\uFEFF" + res.content], { type: res.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = res.filename; a.click();
      URL.revokeObjectURL(url);
      toast.success("Exportado");
    } catch (e: any) { toast.error(e.message); }
  };

  const downloadReportCSV = (title: string, rows: any[], headers: [string, string][]) => {
    const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.map((h) => escape(h[1])).join(","),
      ...rows.map((r) => headers.map(([k]) => escape(r[k])).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${title}-${days}d.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const t = data?.totals;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Relatórios do Affiliate Center</CardTitle>
            <CardDescription>Análise completa de tráfego, conversões e receita.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Período</Label>
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="14">14 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="180">180 dias</SelectItem>
                <SelectItem value="365">1 ano</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="size-4 animate-spin" /> : "Atualizar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || !t ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <KPI label="Cliques" value={t.clicks.toLocaleString("pt-BR")} tone="sky" />
              <KPI label="Visitantes únicos" value={t.uniqueVisitors.toLocaleString("pt-BR")} tone="indigo" />
              <KPI label="Cadastros" value={t.signups.toLocaleString("pt-BR")} tone="violet" />
              <KPI label="Checkouts" value={t.checkouts.toLocaleString("pt-BR")} tone="amber" />
              <KPI label="Vendas" value={t.sales.toLocaleString("pt-BR")} tone="emerald" />
              <KPI label="Receita" value={`R$ ${(t.revenueCents / 100).toFixed(2)}`} tone="rose" />
              <KPI label="Taxa conv." value={`${t.conversionRate}%`} tone="teal" />
            </div>
          )}
        </CardContent>
      </Card>

      {data && (
        <>
          <ReportTable
            title="Por landing page (produto)"
            description="Quais páginas geram mais tráfego e vendas."
            rows={data.byLanding}
            columns={[
              ["key", "Landing"],
              ["clicks", "Cliques"],
              ["uniqueVisitors", "Visitantes"],
              ["conversions", "Conversões"],
              ["revenueCents", "Receita"],
              ["conversionRate", "Conv. %"],
            ]}
            onExport={() => downloadReportCSV("landings", data.byLanding, [["key","Landing"],["clicks","Cliques"],["uniqueVisitors","Visitantes"],["conversions","Conversoes"],["revenueCents","Receita_centavos"],["conversionRate","Conv_pct"]])}
          />
          <ReportTable
            title="Top afiliados por tráfego"
            description="Quem mais traz cliques e visitantes."
            rows={data.byAffiliateTraffic}
            columns={[["key","Afiliado"],["clicks","Cliques"],["uniqueVisitors","Visitantes"],["conversions","Conversões"],["revenueCents","Receita"]]}
            onExport={() => downloadReportCSV("afiliados-trafego", data.byAffiliateTraffic, [["key","Afiliado"],["clicks","Cliques"],["uniqueVisitors","Visitantes"],["conversions","Conversoes"],["revenueCents","Receita_centavos"]])}
          />
          <ReportTable
            title="Top afiliados por receita"
            description="Quem mais gera vendas."
            rows={data.byAffiliateRevenue}
            columns={[["key","Afiliado"],["clicks","Cliques"],["conversions","Conversões"],["revenueCents","Receita"]]}
            onExport={() => downloadReportCSV("afiliados-receita", data.byAffiliateRevenue, [["key","Afiliado"],["clicks","Cliques"],["conversions","Conversoes"],["revenueCents","Receita_centavos"]])}
          />
          <ReportTable
            title="De onde vem o tráfego (referrers)"
            description="Sites/origens externas que enviaram visitantes."
            rows={data.byReferrer}
            columns={[["key","Origem"],["clicks","Cliques"],["uniqueVisitors","Visitantes"],["conversions","Conv."]]}
            onExport={() => downloadReportCSV("referrers", data.byReferrer, [["key","Origem"],["clicks","Cliques"],["uniqueVisitors","Visitantes"],["conversions","Conversoes"]])}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ReportTable title="UTM Source" rows={data.bySource} columns={[["key","Source"],["clicks","Cliques"],["conversions","Conv."]]} />
            <ReportTable title="UTM Medium" rows={data.byMedium} columns={[["key","Medium"],["clicks","Cliques"],["conversions","Conv."]]} />
            <ReportTable title="UTM Campaign" rows={data.byCampaign} columns={[["key","Campaign"],["clicks","Cliques"],["conversions","Conv."]]} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ReportTable title="Países" rows={data.byCountry} columns={[["key","País"],["clicks","Cliques"],["uniqueVisitors","Visitantes"]]} />
            <ReportTable title="Cidades" rows={data.byCity} columns={[["key","Cidade"],["clicks","Cliques"],["uniqueVisitors","Visitantes"]]} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ReportTable title="Dispositivo" rows={data.byDevice} columns={[["key","Device"],["clicks","Cliques"]]} />
            <ReportTable title="Navegador" rows={data.byBrowser} columns={[["key","Browser"],["clicks","Cliques"]]} />
            <ReportTable title="Sistema" rows={data.byOs} columns={[["key","OS"],["clicks","Cliques"]]} />
          </div>

          <Card>
            <CardHeader><CardTitle>Evolução diária</CardTitle><CardDescription>Cliques × conversões × receita.</CardDescription></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.daily}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2} name="Cliques" />
                    <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} name="Conversões" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader><CardTitle>Exportação bruta</CardTitle><CardDescription>Baixe dados brutos em CSV, Excel ou PDF.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Label>Entidade</Label>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="affiliates">Afiliados</SelectItem>
                <SelectItem value="commissions">Comissões</SelectItem>
                <SelectItem value="withdraws">Saques</SelectItem>
                <SelectItem value="orders">Pedidos</SelectItem>
                <SelectItem value="products">Produtos</SelectItem>
                <SelectItem value="coupons">Cupons</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => download("csv")}><Download className="size-4 mr-2" />CSV</Button>
            <Button variant="outline" onClick={() => download("xls")}><Download className="size-4 mr-2" />Excel</Button>
            <Button variant="outline" onClick={() => download("pdf")}><Download className="size-4 mr-2" />PDF</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <GradientStatCard label={label} value={value} tone={tone} size="sm" />;
}

function ReportTable({
  title, description, rows, columns, onExport,
}: {
  title: string; description?: string; rows: any[];
  columns: [string, string][]; onExport?: () => void;
}) {
  const fmt = (col: string, v: any) => {
    if (v == null) return "—";
    if (col === "revenueCents") return `R$ ${(Number(v) / 100).toFixed(2)}`;
    if (col === "conversionRate") return `${v}%`;
    if (typeof v === "number") return v.toLocaleString("pt-BR");
    return String(v);
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {onExport && (
          <Button size="sm" variant="outline" onClick={onExport}><Download className="size-3 mr-1" />CSV</Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-80">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                {columns.map(([k, l]) => (
                  <th key={k} className="text-left px-3 py-2 font-medium text-muted-foreground">{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={columns.length} className="px-3 py-4 text-center text-muted-foreground">Sem dados no período.</td></tr>
              )}
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                  {columns.map(([k]) => (
                    <td key={k} className="px-3 py-1.5 truncate max-w-xs">{fmt(k, r[k])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════
function SettingsSection() {
  const qc = useQueryClient();
  const getFn = useServerFn(adminGetSettings);
  const setFn = useServerFn(adminUpdateExtendedSettings);
  const { data } = useQuery({ queryKey: ["adm-settings-ext"], queryFn: () => getFn() });
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (data && !form) setForm(data); }, [data, form]);
  const save = useMutation({
    mutationFn: (v: any) => setFn({ data: v }),
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["adm-settings-ext"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  if (!form) return <div className="p-6 text-muted-foreground">Carregando…</div>;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Regras gerais</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Comissão padrão (%)</Label><Input type="number" value={form.default_commission_rate} onChange={(e) => setForm({ ...form, default_commission_rate: Number(e.target.value) })} /></div>
          <div><Label>Cookie (dias)</Label><Input type="number" value={form.cookie_window_days} onChange={(e) => setForm({ ...form, cookie_window_days: Number(e.target.value) })} /></div>
          <div><Label>Saque mínimo (centavos)</Label><Input type="number" value={form.min_withdraw_cents} onChange={(e) => setForm({ ...form, min_withdraw_cents: Number(e.target.value) })} /></div>
          <div><Label>Prazo liberação comissão (dias)</Label><Input type="number" value={form.hold_days ?? 30} onChange={(e) => setForm({ ...form, hold_days: Number(e.target.value) })} /></div>
          <div><Label>Modelo de comissão</Label>
            <Select value={form.commission_model ?? "first_purchase"} onValueChange={(v) => setForm({ ...form, commission_model: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="first_purchase">Primeira compra</SelectItem><SelectItem value="recurring">Recorrente</SelectItem><SelectItem value="lifetime">Vitalícia</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2"><Switch checked={!!form.auto_approve} onCheckedChange={(v) => setForm({ ...form, auto_approve: v })} /><Label>Auto-aprovar afiliados</Label></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><Shield className="inline size-4 mr-1" />Antifraude</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-2"><Switch checked={!!form.antifraud_same_cpf} onCheckedChange={(v) => setForm({ ...form, antifraud_same_cpf: v })} /><Label>Bloquear mesmo CPF em múltiplas compras</Label></div>
          <div className="flex items-center gap-2"><Switch checked={!!form.antifraud_same_ip} onCheckedChange={(v) => setForm({ ...form, antifraud_same_ip: v })} /><Label>Bloquear mesmo IP</Label></div>
          <div className="flex items-center gap-2"><Switch checked={!!form.antifraud_same_card} onCheckedChange={(v) => setForm({ ...form, antifraud_same_card: v })} /><Label>Bloquear mesmo cartão</Label></div>
          <div className="flex items-center gap-2"><Switch checked={!!form.antifraud_block_vpn} onCheckedChange={(v) => setForm({ ...form, antifraud_block_vpn: v })} /><Label>Bloquear VPN/Proxy</Label></div>
          <div className="flex items-center gap-2"><Switch checked={!!form.antifraud_block_self} onCheckedChange={(v) => setForm({ ...form, antifraud_block_self: v })} /><Label>Bloquear auto-compra (mesmo CPF)</Label></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notificações automáticas</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2"><Switch checked={!!form.auto_notify_email} onCheckedChange={(v) => setForm({ ...form, auto_notify_email: v })} /><Label>Email</Label></div>
          <div className="flex items-center gap-2"><Switch checked={!!form.auto_notify_whatsapp} onCheckedChange={(v) => setForm({ ...form, auto_notify_whatsapp: v })} /><Label>WhatsApp</Label></div>
          <div className="flex items-center gap-2"><Switch checked={!!form.auto_notify_push} onCheckedChange={(v) => setForm({ ...form, auto_notify_push: v })} /><Label>Push</Label></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Cookie & Atribuição</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Duração do cookie (dias)</Label>
            <Select
              value={String(form.cookie_lifetime_days ?? 30)}
              onValueChange={(v) => setForm({ ...form, cookie_lifetime_days: Number(v), cookie_lifetime_lifetime: false })}
              disabled={!!form.cookie_lifetime_lifetime}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[7, 15, 30, 60, 90, 180, 365].map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} dias</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 mt-6">
            <Switch
              checked={!!form.cookie_lifetime_lifetime}
              onCheckedChange={(v) => setForm({ ...form, cookie_lifetime_lifetime: v })}
            />
            <Label>Cookie vitalício</Label>
          </div>
          <div className="md:col-span-2">
            <Label>Modelo de atribuição</Label>
            <Select
              value={form.attribution_model ?? "last_click"}
              onValueChange={(v) => setForm({ ...form, attribution_model: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="first_click">Primeiro clique</SelectItem>
                <SelectItem value="last_click">Último clique</SelectItem>
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
                <SelectItem value="hybrid">Híbrido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => save.mutate(form)} disabled={save.isPending}>Salvar configurações</Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LOGS + FRAUD
// ═══════════════════════════════════════════════════════
function LogsSection() {
  const logsFn = useServerFn(adminListLogs);
  const whFn = useServerFn(adminListWebhookEvents);
  const fraudFn = useServerFn(adminListFraudFlags);
  const resolveFn = useServerFn(adminResolveFraudFlag);
  const qc = useQueryClient();
  const { data: logs } = useQuery({ queryKey: ["adm-logs"], queryFn: () => logsFn() });
  const { data: whs } = useQuery({ queryKey: ["adm-whs"], queryFn: () => whFn() });
  const { data: fraud } = useQuery({ queryKey: ["adm-fraud"], queryFn: () => fraudFn() });
  const resolve = useMutation({
    mutationFn: (v: any) => resolveFn({ data: v }),
    onSuccess: () => { toast.success("Atualizado"); qc.invalidateQueries({ queryKey: ["adm-fraud"] }); },
  });
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle><Shield className="inline size-4 mr-1" />Flags de fraude</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left p-2">Afiliado</th><th>Motivo</th><th>Severidade</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {(fraud ?? []).map((f: any) => (
                <tr key={f.id} className="border-b">
                  <td className="p-2">{f.affiliate_profiles?.full_name ?? f.affiliate_id}</td>
                  <td className="text-center">{f.reason}</td>
                  <td className="text-center"><Badge>{f.severity}</Badge></td>
                  <td className="text-center"><Badge>{f.status}</Badge></td>
                  <td className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => resolve.mutate({ id: f.id, status: "resolved" })}>Resolver</Button>
                    <Button size="sm" variant="ghost" onClick={() => resolve.mutate({ id: f.id, status: "blocked" })}>Bloquear</Button>
                    <Button size="sm" variant="ghost" onClick={() => resolve.mutate({ id: f.id, status: "ignored" })}>Ignorar</Button>
                  </td>
                </tr>
              ))}
              {(fraud ?? []).length === 0 && <tr><td colSpan={5} className="text-center py-4 text-muted-foreground">Sem flags</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Eventos de webhook</CardTitle></CardHeader>
        <CardContent className="max-h-80 overflow-y-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b"><th className="text-left p-2">Data</th><th>Provider</th><th>Evento</th><th>Status</th></tr></thead>
            <tbody>
              {(whs ?? []).map((w: any) => (
                <tr key={w.id} className="border-b">
                  <td className="p-2">{new Date(w.created_at).toLocaleString("pt-BR")}</td>
                  <td className="text-center">{w.provider}</td><td className="text-center">{w.event_type}</td>
                  <td className="text-center"><Badge>{w.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Auditoria</CardTitle></CardHeader>
        <CardContent className="max-h-80 overflow-y-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b"><th className="text-left p-2">Data</th><th>Ação</th><th>Entidade</th></tr></thead>
            <tbody>
              {(logs ?? []).map((l: any) => (
                <tr key={l.id} className="border-b">
                  <td className="p-2">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                  <td>{l.action}</td>
                  <td className="text-xs text-muted-foreground">{l.entity} {l.entity_id ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
