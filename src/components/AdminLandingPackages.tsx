import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAdminLandingPackages,
  upsertLandingPackage,
  deleteLandingPackage,
  type LandingPackage,
} from "@/lib/landing-packages.functions";
import { listAdminAddons } from "@/lib/addon-settings.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Layers, Plus, Save, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/system-feedback";
import { formatBRL } from "@/lib/addons.catalog";

type FormState = {
  id: string | null;
  slug: string;
  name: string;
  price_reais: string;
  price_label: string;
  sub_label: string;
  anchor: string;
  features: string;
  included_addons: string[];
  cta_label: string;
  featured: boolean;
  enabled: boolean;
  sort_order: number;
  credits_per_month: number;
};

const EMPTY: FormState = {
  id: null,
  slug: "",
  name: "",
  price_reais: "0,00",
  price_label: "",
  sub_label: "/ mês",
  anchor: "",
  features: "",
  included_addons: [],
  cta_label: "Ascender",
  featured: false,
  enabled: true,
  sort_order: 0,
  credits_per_month: 0,
};

function fromRow(r: LandingPackage): FormState {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    price_reais: (r.price_cents / 100).toFixed(2).replace(".", ","),
    price_label: r.price_label ?? "",
    sub_label: r.sub_label,
    anchor: r.anchor ?? "",
    features: r.features.join("\n"),
    included_addons: r.included_addons,
    cta_label: r.cta_label,
    featured: r.featured,
    enabled: r.enabled,
    sort_order: r.sort_order,
    credits_per_month: r.credits_per_month,
  };
}

export function AdminLandingPackages() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminLandingPackages);
  const listAddonsFn = useServerFn(listAdminAddons);

  const { data: packages, isLoading } = useQuery({
    queryKey: ["admin-landing-packages"],
    queryFn: () => listFn(),
  });

  const { data: addons } = useQuery({
    queryKey: ["admin-addons"],
    queryFn: () => listAddonsFn(),
  });

  const [editing, setEditing] = useState<FormState | null>(null);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-10 text-center">Carregando pacotes…</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="size-5 text-gold" /> Pacotes da Landing Page
              </CardTitle>
              <CardDescription>
                Crie, edite e exclua os pacotes exibidos na seção <b>Escolha sua ascensão</b>. Você pode agrupar
                vários add-ons em um único pacote — mudanças aparecem na Landing Page imediatamente.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setEditing({ ...EMPTY })} className="gap-2">
              <Plus className="size-4" /> Novo pacote
            </Button>
          </div>
        </CardHeader>
      </Card>

      {editing && (
        <PackageForm
          state={editing}
          addons={addons ?? []}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin-landing-packages"] });
            qc.invalidateQueries({ queryKey: ["public-landing-packages"] });
          }}
        />
      )}

      {!packages?.length ? (
        <div className="text-sm text-muted-foreground p-10 text-center border rounded-lg bg-muted/20">
          Nenhum pacote criado. Clique em <b>Novo pacote</b> para começar.
        </div>
      ) : (
        <div className="grid gap-3">
          {packages.map((p) => (
            <PackageCard
              key={p.id}
              row={p}
              addons={addons ?? []}
              onEdit={() => setEditing(fromRow(p))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PackageCard({
  row,
  addons,
  onEdit,
}: {
  row: LandingPackage;
  addons: Array<{ addon_id: string; effective: { name: string } }>;
  onEdit: () => void;
}) {
  const qc = useQueryClient();
  const deleteFn = useServerFn(deleteLandingPackage);
  const deleteMut = useMutation({
    mutationFn: () => deleteFn({ data: { id: row.id } }),
    onSuccess: () => {
      toast.success("Pacote excluído.");
      qc.invalidateQueries({ queryKey: ["admin-landing-packages"] });
      qc.invalidateQueries({ queryKey: ["public-landing-packages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addonNames = row.included_addons
    .map((id) => addons.find((a) => a.addon_id === id)?.effective.name ?? id)
    .filter(Boolean);

  return (
    <Card className={!row.enabled ? "opacity-60" : ""}>
      <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-serif text-lg">{row.name}</span>
            {row.featured && (
              <Badge className="bg-gold/15 text-gold border border-gold/30 gap-1">
                <Star className="size-3" /> Destaque
              </Badge>
            )}
            {!row.enabled && <Badge variant="destructive">Pausado</Badge>}
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {row.slug}
            </span>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            <span className="text-gold font-semibold">
              {row.price_label?.trim() || formatBRL(row.price_cents)}
            </span>{" "}
            <span>{row.sub_label}</span>
            {row.anchor && <span className="ml-2 italic">· {row.anchor}</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {addonNames.length > 0 ? (
              addonNames.map((n, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">
                  + {n}
                </Badge>
              ))
            ) : (
              <span className="text-[11px] text-muted-foreground italic">Sem add-ons vinculados</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            disabled={deleteMut.isPending}
            onClick={async () => {
              const ok = await confirmDialog({
                title: "Excluir pacote?",
                description: `O pacote "${row.name}" sairá da Landing Page imediatamente.`,
                confirmText: "Excluir",
                destructive: true,
              });
              if (ok) deleteMut.mutate();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PackageForm({
  state,
  addons,
  onCancel,
  onSaved,
}: {
  state: FormState;
  addons: Array<{ addon_id: string; effective: { name: string; price_cents: number; enabled: boolean } }>;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [s, setS] = useState<FormState>(state);
  useEffect(() => setS(state), [state]);

  const upsertFn = useServerFn(upsertLandingPackage);
  const saveMut = useMutation({
    mutationFn: () => {
      const price = parseFloat(s.price_reais.replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(price) || price < 0) throw new Error("Preço inválido.");
      const featuresArr = s.features.split("\n").map((x) => x.trim()).filter(Boolean);
      return upsertFn({
        data: {
          id: s.id,
          slug: s.slug.trim().toLowerCase(),
          name: s.name.trim(),
          price_cents: Math.round(price * 100),
          price_label: s.price_label.trim() || null,
          sub_label: s.sub_label.trim() || "/ mês",
          anchor: s.anchor.trim() || null,
          features: featuresArr,
          included_addons: s.included_addons,
          cta_label: s.cta_label.trim() || "Ascender",
          featured: s.featured,
          enabled: s.enabled,
          sort_order: Number(s.sort_order) || 0,
          credits_per_month: Number(s.credits_per_month) || 0,
        },
      });
    },
    onSuccess: () => {
      toast.success(s.id ? "Pacote atualizado." : "Pacote criado.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAddon = (id: string) => {
    setS((prev) => ({
      ...prev,
      included_addons: prev.included_addons.includes(id)
        ? prev.included_addons.filter((x) => x !== id)
        : [...prev.included_addons, id],
    }));
  };

  return (
    <Card className="border-gold/40 bg-gold/5">
      <CardHeader>
        <CardTitle className="text-lg">{s.id ? "Editar pacote" : "Novo pacote"}</CardTitle>
        <CardDescription>
          O pacote aparece na seção de planos da Landing Page. Marque add-ons para incluí-los neste plano.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} placeholder="Ex: Místico" />
          </div>
          <div className="space-y-1.5">
            <Label>Identificador (slug)</Label>
            <Input
              value={s.slug}
              onChange={(e) => setS({ ...s, slug: e.target.value })}
              placeholder="ex: mistico"
              disabled={!!s.id}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Preço mensal (R$)</Label>
            <Input
              value={s.price_reais}
              onChange={(e) => setS({ ...s, price_reais: e.target.value })}
              placeholder="49,90"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Rótulo de preço (opcional)</Label>
            <Input
              value={s.price_label}
              onChange={(e) => setS({ ...s, price_label: e.target.value })}
              placeholder='ex: "Grátis"'
            />
            <p className="text-[10px] text-muted-foreground">
              Se preenchido, substitui o valor em R$ na exibição.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Sufixo do preço</Label>
            <Input value={s.sub_label} onChange={(e) => setS({ ...s, sub_label: e.target.value })} placeholder="/ mês" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Âncora / selo</Label>
            <Input
              value={s.anchor}
              onChange={(e) => setS({ ...s, anchor: e.target.value })}
              placeholder='Ex: "Mais escolhido"'
            />
          </div>
          <div className="space-y-1.5">
            <Label>Texto do botão</Label>
            <Input value={s.cta_label} onChange={(e) => setS({ ...s, cta_label: e.target.value })} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Recursos (um por linha)</Label>
          <Textarea
            value={s.features}
            onChange={(e) => setS({ ...s, features: e.target.value })}
            rows={5}
            placeholder={"Mapa astral completo\nNumerologia cabalística\nRelatórios ilimitados"}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Add-ons incluídos no pacote
            <Badge variant="secondary" className="text-[10px]">
              {s.included_addons.length} selecionado(s)
            </Badge>
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-auto p-3 rounded-md border bg-background/40">
            {addons.length === 0 && (
              <p className="text-xs text-muted-foreground col-span-full">Nenhum add-on cadastrado.</p>
            )}
            {addons.map((a) => {
              const checked = s.included_addons.includes(a.addon_id);
              return (
                <label
                  key={a.addon_id}
                  className={`flex items-start gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                    checked ? "border-gold/40 bg-gold/5" : "border-border/40 hover:bg-muted/40"
                  }`}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggleAddon(a.addon_id)} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <span className="truncate">{a.effective.name}</span>
                      {!a.effective.enabled && (
                        <Badge variant="destructive" className="text-[9px]">Off</Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">{a.addon_id}</div>
                    <div className="text-[11px] text-gold/80">
                      {formatBRL(a.effective.price_cents)} / mês
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between gap-2 p-2 rounded-md border">
            <Label className="text-sm">Destaque (Mais escolhido)</Label>
            <Switch checked={s.featured} onCheckedChange={(v) => setS({ ...s, featured: v })} />
          </div>
          <div className="flex items-center justify-between gap-2 p-2 rounded-md border">
            <Label className="text-sm">Ativo na Landing Page</Label>
            <Switch checked={s.enabled} onCheckedChange={(v) => setS({ ...s, enabled: v })} />
          </div>
          <div className="space-y-1.5">
            <Label>Créditos Mensais</Label>
            <Input
              type="number"
              value={s.credits_per_month}
              onChange={(e) => setS({ ...s, credits_per_month: Number(e.target.value) })}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ordem (menor = primeiro)</Label>
            <Input
              type="number"
              value={s.sort_order}
              onChange={(e) => setS({ ...s, sort_order: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="bg-gold text-primary-foreground hover:bg-gold-glow gap-2"
          >
            <Save className="size-4" />
            {saveMut.isPending ? "Salvando..." : "Salvar e publicar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
