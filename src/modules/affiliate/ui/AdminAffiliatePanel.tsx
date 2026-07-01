import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminGetDashboard,
  adminListProducts, adminUpsertProduct, adminDeleteProduct,
  adminListCommissionRules, adminUpsertCommissionRule, adminDeleteCommissionRule,
  adminListCoupons, adminUpsertCoupon, adminDeleteCoupon,
  adminListCampaigns, adminUpsertCampaign,
  adminListMaterials, adminUpsertMaterial, adminDeleteMaterial,
  adminListCommissions, adminUpdateCommissionStatus,
  adminListWithdraws, adminUpdateWithdraw,
  adminBroadcastMessage,
  adminListFraudFlags, adminResolveFraudFlag,
  adminUpdateExtendedSettings,
  adminListLogs, adminListWebhookEvents,
  adminGetRanking,
  adminExport,
} from "../admin.functions";
import {
  adminListAffiliates, adminSetAffiliateStatus, adminGetSettings,
} from "../affiliate.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  CheckoutProvidersSection, CommissionOverridesSection, CommissionTiersSection,
  PayoutBatchesSection, LedgerSection,
} from "./AdminMonetizationSections";

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
  { id: "messages", label: "Mensagens", icon: MessageSquare },
  { id: "materials", label: "Materiais", icon: ImageIcon },
  { id: "campaigns", label: "Campanhas", icon: Megaphone },
  { id: "ranking", label: "Ranking", icon: Trophy },
  { id: "reports", label: "Relatórios", icon: FileBarChart },
  { id: "settings", label: "Configurações", icon: SettingsIcon },
  { id: "logs", label: "Logs & Antifraude", icon: ScrollText },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

export function AdminAffiliatePanel() {
  const [section, setSection] = useState<SectionId>("dashboard");
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <aside className="lg:w-56 shrink-0">
        <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm text-left whitespace-nowrap transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <Icon className="size-4" />
                <span>{s.label}</span>
              </button>
            );
          })}
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
        {section === "messages" && <MessagesSection />}
        {section === "materials" && <MaterialsSection />}
        {section === "campaigns" && <CampaignsSection />}
        {section === "ranking" && <RankingSection />}
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

function Kpi({ title, value, icon: Icon, tone = "" }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{title}</span>
          {Icon && <Icon className={`size-4 ${tone}`} />}
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
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
        <Kpi title="Total afiliados" value={k.totalAffiliates} icon={Users} />
        <Kpi title="Ativos" value={k.activeAffiliates} icon={Users} />
        <Kpi title="Pendentes" value={k.pendingAffiliates} icon={Users} />
        <Kpi title="Cliques hoje" value={k.clicksToday} icon={LayoutDashboard} />
        <Kpi title="Cliques total" value={k.clicksTotal} icon={LayoutDashboard} />
        <Kpi title="Conversão" value={`${k.conversion.toFixed(2)}%`} icon={Percent} />
        <Kpi title="Receita 30d" value={money(k.revenueCents)} icon={HandCoins} />
        <Kpi title="Comissões" value={money(k.commissionsCents)} icon={Percent} />
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
  const [q, setQ] = useState(""); const [status, setStatus] = useState("");
  const { data: rows } = useQuery({ queryKey: ["adm-aff", q, status], queryFn: () => listFn({ data: { q: q || undefined, status: status || undefined } }) });
  const mut = useMutation({
    mutationFn: (v: any) => statusFn({ data: v }),
    onSuccess: () => { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["adm-aff"] }); },
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
                      <DropdownMenuTrigger asChild><Button size="sm" variant="ghost">Mudar</Button></DropdownMenuTrigger>
                      <DropdownMenuContent>
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
  const { data: rows } = useQuery({ queryKey: ["adm-products"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ slug: "", name: "", price_cents: 0, active: true });
  const save = useMutation({
    mutationFn: (v: any) => upsertFn({ data: v }),
    onSuccess: () => { toast.success("Salvo"); setOpen(false); qc.invalidateQueries({ queryKey: ["adm-products"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["adm-products"] }); },
  });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Produtos afiliáveis</CardTitle></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" onClick={() => setForm({ slug: "", name: "", price_cents: 0, active: true })}><Plus className="size-4 mr-1" />Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} produto</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Categoria</Label><Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div><Label>Preço (centavos)</Label><Input type="number" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: Number(e.target.value) })} /></div>
              <div><Label>Comissão % (opcional)</Label><Input type="number" value={form.commission_rate ?? ""} onChange={(e) => setForm({ ...form, commission_rate: e.target.value ? Number(e.target.value) : null })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label>Ativo</Label></div>
            </div>
            <DialogFooter><Button onClick={() => save.mutate(form)} disabled={save.isPending}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left p-2">Slug</th><th>Nome</th><th>Preço</th><th>Comissão</th><th>Ativo</th><th></th></tr></thead>
            <tbody>
              {(rows ?? []).map((r: any) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.slug}</td><td>{r.name}</td><td className="text-center">{money(r.price_cents)}</td>
                  <td className="text-center">{r.commission_rate ?? "-"}%</td>
                  <td className="text-center">{r.active ? "✓" : "—"}</td>
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
function MaterialsSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListMaterials);
  const upFn = useServerFn(adminUpsertMaterial);
  const delFn = useServerFn(adminDeleteMaterial);
  const { data: rows } = useQuery({ queryKey: ["adm-materials"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ kind: "banner", title: "", tags: [], active: true });
  const save = useMutation({
    mutationFn: (v: any) => upFn({ data: v }),
    onSuccess: () => { toast.success("Salvo"); setOpen(false); qc.invalidateQueries({ queryKey: ["adm-materials"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({ mutationFn: (id: string) => delFn({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["adm-materials"] }) });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Materiais de marketing</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" onClick={() => setForm({ kind: "banner", title: "", tags: [], active: true })}><Plus className="size-4 mr-1" />Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Material</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Tipo</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["video","banner","reel","story","carousel","logo","copy","pdf","training"].map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>URL</Label><Input value={form.url ?? ""} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
              <div><Label>Miniatura URL</Label><Input value={form.thumb_url ?? ""} onChange={(e) => setForm({ ...form, thumb_url: e.target.value })} /></div>
              <div><Label>Texto (copy)</Label><Textarea value={form.content ?? ""} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label>Ativo</Label></div>
            </div>
            <DialogFooter><Button onClick={() => save.mutate(form)}>Salvar</Button></DialogFooter>
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
              <div className="font-medium text-sm">{m.title}</div>
              {m.description && <div className="text-xs text-muted-foreground mt-1">{m.description}</div>}
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
  const fn = useServerFn(adminExport);
  const [entity, setEntity] = useState<any>("affiliates");
  const download = async (format: "csv" | "xls" | "pdf") => {
    try {
      const res: any = await fn({ data: { entity, format } });
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
  return (
    <Card>
      <CardHeader><CardTitle>Relatórios & exportação</CardTitle><CardDescription>Exporte dados em CSV, Excel (xls) ou PDF.</CardDescription></CardHeader>
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
