import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Star, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminHoroscopeLanding } from "@/components/AdminHoroscopeLanding";
import {
  adminListHoroscopePlans,
  adminUpsertHoroscopePlan,
  adminDeleteHoroscopePlan,
} from "@/lib/horoscope-plans.functions";


type PlanForm = {
  id: string | null;
  slug: string;
  name: string;
  description: string;
  price_reais: string;
  billing_cycle: "month" | "quarter" | "year";
  interval_months: number;
  features_text: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
};

const EMPTY: PlanForm = {
  id: null, slug: "", name: "", description: "", price_reais: "19,90",
  billing_cycle: "month", interval_months: 1, features_text: "",
  is_active: true, is_featured: false, sort_order: 0,
};

function toCents(reais: string): number {
  const n = Number(reais.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function AdminHoroscopePlans() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListHoroscopePlans);
  const upsertFn = useServerFn(adminUpsertHoroscopePlan);
  const deleteFn = useServerFn(adminDeleteHoroscopePlan);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-horoscope-plans"],
    queryFn: () => listFn(),
  });

  const [form, setForm] = useState<PlanForm | null>(null);

  const save = useMutation({
    mutationFn: (f: PlanForm) =>
      upsertFn({
        data: {
          id: f.id,
          slug: f.slug.toLowerCase().trim(),
          name: f.name.trim(),
          description: f.description.trim() || null,
          price_cents: toCents(f.price_reais),
          billing_cycle: f.billing_cycle,
          interval_months: f.interval_months,
          features: f.features_text.split("\n").map((l) => l.trim()).filter(Boolean),
          is_active: f.is_active,
          is_featured: f.is_featured,
          sort_order: f.sort_order,
        },
      }),
    onSuccess: () => {
      toast.success("Plano salvo!");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["admin-horoscope-plans"] });
      qc.invalidateQueries({ queryKey: ["horoscope-plans-public"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (r: any) => {
      toast.success(r?.deactivated ? "Plano desativado (possui assinantes)." : "Plano removido.");
      qc.invalidateQueries({ queryKey: ["admin-horoscope-plans"] });
      qc.invalidateQueries({ queryKey: ["horoscope-plans-public"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const plans = (data as any)?.plans ?? [];

  const openEdit = (p: any) => {
    setForm({
      id: p.id, slug: p.slug, name: p.name, description: p.description ?? "",
      price_reais: (p.price_cents / 100).toFixed(2).replace(".", ","),
      billing_cycle: p.billing_cycle, interval_months: p.interval_months,
      features_text: Array.isArray(p.features) ? p.features.join("\n") : "",
      is_active: p.is_active, is_featured: p.is_featured, sort_order: p.sort_order,
    });
  };

  const [tab, setTab] = useState<"config" | "settings">("config");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Package className="size-5 text-gold" /> Horóscopo Planos e Config.</CardTitle>
            <CardDescription>Gerencie os planos de <code>/horoscopo-assinar</code> e as configurações da landing grátis.</CardDescription>
          </div>
          {tab === "config" && (
            <Button onClick={() => setForm({ ...EMPTY })} className="gap-2">
              <Plus className="size-4" /> Novo plano
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="config" className="gap-2"><Package className="size-4" /> Planos</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Star className="size-4" /> Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-4">
            {isLoading ? (
              <div className="py-8 flex justify-center"><Loader2 className="size-5 animate-spin text-gold" /></div>
            ) : plans.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum plano cadastrado.</p>
            ) : (
              <div className="space-y-3">
                {plans.map((p: any) => (
                  <div key={p.id} className="rounded-lg border p-4 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{p.name}</h4>
                        <code className="text-xs text-muted-foreground">{p.slug}</code>
                        {p.is_featured && <Badge className="bg-gold text-background gap-1"><Star className="size-3" /> Destaque</Badge>}
                        {!p.is_active && <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatBRL(p.price_cents)} · {p.billing_cycle === "month" ? "mensal" : p.billing_cycle === "quarter" ? "trimestral" : "anual"} · {p.interval_months} mês(es)
                      </p>
                      {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="size-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Remover "${p.name}"?`)) remove.mutate(p.id); }}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <AdminHoroscopeLanding />
          </TabsContent>
        </Tabs>
      </CardContent>



      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar plano" : "Novo plano"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Slug</Label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="mensal" />
                </div>
                <div>
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Preço (R$)</Label>
                  <Input value={form.price_reais} onChange={(e) => setForm({ ...form, price_reais: e.target.value })} placeholder="19,90" />
                </div>
                <div>
                  <Label>Ciclo</Label>
                  <Select value={form.billing_cycle} onValueChange={(v) => {
                    const bc = v as any;
                    const interval = bc === "month" ? 1 : bc === "quarter" ? 3 : 12;
                    setForm({ ...form, billing_cycle: bc, interval_months: interval });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Mensal</SelectItem>
                      <SelectItem value="quarter">Trimestral</SelectItem>
                      <SelectItem value="year">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Meses</Label>
                  <Input type="number" min={1} max={24} value={form.interval_months} onChange={(e) => setForm({ ...form, interval_months: Number(e.target.value) || 1 })} />
                </div>
              </div>
              <div>
                <Label>Features (1 por linha)</Label>
                <Textarea rows={5} value={form.features_text} onChange={(e) => setForm({ ...form, features_text: e.target.value })} placeholder="Horóscopo diário no WhatsApp&#10;Personalizado pelo seu signo&#10;Cancele quando quiser" />
              </div>
              <div className="grid grid-cols-3 gap-3 items-end">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label>Ativo</Label>
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label>Destaque</Label>
                  <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                </div>
                <div>
                  <Label>Ordem</Label>
                  <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={() => form && save.mutate(form)} disabled={save.isPending} className="gap-2">
              {save.isPending && <Loader2 className="size-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
