import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAdminAddons,
  upsertAdminAddon,
  deleteAdminAddon,
  improveAddonPrompt,
  type AddonRow,
} from "@/lib/addon-settings.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Package, Sparkles, Undo2, Plus, Trash2 } from "lucide-react";
import { formatBRL } from "@/lib/addons.catalog";
import { confirmDialog } from "@/components/system-feedback";

export function AdminAddons() {
  const listFn = useServerFn(listAdminAddons);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-addons"],
    queryFn: () => listFn(),
  });

  const [creating, setCreating] = useState(false);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-10 text-center">Carregando planos…</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-5 text-gold" /> Planos & Assinaturas
              </CardTitle>
              <CardDescription>
                Gerencie os planos de assinatura recorrente. Mudanças refletem imediatamente na Landing Page.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setCreating(true)} className="gap-2">
              <Plus className="size-4" /> Novo Plano
            </Button>
          </div>
        </CardHeader>
      </Card>

      {creating && (
        <AddonCreator onCancel={() => setCreating(false)} />
      )}

      {!data?.length ? (
        <div className="text-sm text-muted-foreground p-10 text-center border rounded-lg bg-muted/20">
          Nenhum plano configurado.
        </div>
      ) : (
        <div className="grid gap-4">
          {data.map((row) => (
            <AddonEditor key={row.addon_id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddonCreator({ onCancel }: { onCancel: () => void }) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertAdminAddon);

  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");
  const [priceReais, setPriceReais] = useState("29,90");

  const saveMut = useMutation({
    mutationFn: () => {
      const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
      if (!cleanId) throw new Error("Informe um ID único.");
      if (!name.trim()) throw new Error("Informe o nome do plano.");
      
      const price = parseFloat(priceReais.replace(",", "."));
      if (isNaN(price)) throw new Error("Preço inválido.");
      
      const cents = Math.round(price * 100);
      const featuresArr = features.split("\n").map(s => s.trim()).filter(Boolean);
      
      return upsertFn({
        data: {
          addon_id: cleanId,
          name: name.trim(),
          description: description.trim(),
          features: featuresArr,
          price_cents: cents,
          enabled: true,
        },
      });
    },
    onSuccess: () => {
      toast.success("Plano criado com sucesso.");
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      onCancel();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-gold/40 bg-gold/5 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Novo Plano de Assinatura</CardTitle>
        <CardDescription>Crie um plano que será exibido na Landing Page e no checkout.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Identificador Único (ID)</Label>
            <Input 
              placeholder="ex: sub_premium_anual" 
              value={id} 
              onChange={e => setId(e.target.value)} 
            />
            <p className="text-[10px] text-muted-foreground">Apenas letras, números e underlines.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Nome do Plano</Label>
            <Input 
              placeholder="Ex: Místico Ilimitado" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Preço Mensal (R$)</Label>
            <Input 
              value={priceReais} 
              onChange={e => setPriceReais(e.target.value)} 
            />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição Curta</Label>
            <Input 
              placeholder="Aparece abaixo do título"
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Recursos e Benefícios (um por linha)</Label>
          <Textarea 
            placeholder="Relatórios Ilimitados&#10;Oráculo IA Premium&#10;Suporte Prioritário" 
            value={features} 
            rows={4}
            onChange={e => setFeatures(e.target.value)} 
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="bg-gold text-primary-foreground hover:bg-gold-glow">
            {saveMut.isPending ? "Criando..." : "Salvar e Publicar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AddonEditor({ row }: { row: AddonRow }) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertAdminAddon);
  const deleteFn = useServerFn(deleteAdminAddon);
  const improveFn = useServerFn(improveAddonPrompt);

  const [name, setName] = useState(row.effective.name);
  const [description, setDescription] = useState(row.effective.description);
  const [features, setFeatures] = useState(row.effective.features.join("\n"));
  const [priceReais, setPriceReais] = useState(
    (row.effective.price_cents / 100).toFixed(2).replace(".", ","),
  );
  const [prompt, setPrompt] = useState(row.effective.prompt ?? "");
  const [enabled, setEnabled] = useState(row.effective.enabled);
  const [requireUserKey, setRequireUserKey] = useState(row.effective.require_user_key);
  const [improveInstruction, setImproveInstruction] = useState("");

  useEffect(() => {
    setName(row.effective.name);
    setDescription(row.effective.description);
    setFeatures(row.effective.features.join("\n"));
    setPriceReais((row.effective.price_cents / 100).toFixed(2).replace(".", ","));
    setPrompt(row.effective.prompt ?? "");
    setEnabled(row.effective.enabled);
    setRequireUserKey(row.effective.require_user_key);
  }, [row]);

  const hasPromptDefault = !!row.defaults.prompt_template;

  const saveMut = useMutation({
    mutationFn: () => {
      const cents = Math.round(parseFloat(priceReais.replace(",", ".")) * 100);
      if (!Number.isFinite(cents) || cents < 0) {
        throw new Error("Preço inválido.");
      }
      const featuresArr = features
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      return upsertFn({
        data: {
          addon_id: row.addon_id,
          name: name.trim() || null,
          description: description.trim() || null,
          features: featuresArr,
          price_cents: cents,
          prompt: hasPromptDefault ? (prompt.trim() || null) : undefined,
          enabled,
          require_user_key: requireUserKey,
        },
      });
    },
    onSuccess: () => {
      toast.success("Plano atualizado.");
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteFn({ data: { addon_id: row.addon_id } }),
    onSuccess: () => {
      toast.success("Plano excluído.");
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const improveMut = useMutation({
    mutationFn: () =>
      improveFn({
        data: {
          addon_id: row.addon_id,
          prompt,
          instruction: improveInstruction.trim() || undefined,
        },
      }),
    onSuccess: (res) => {
      setPrompt(res.prompt);
      toast.success("Prompt aprimorado. Revise e clique em Salvar.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isCatalog = !row.addon_id.startsWith("sub_") || row.defaults.prompt_template !== null;

  return (
    <Card className={!enabled ? "opacity-75 grayscale-[0.5]" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {name}
              {row.defaults.highlight && (
                <Badge variant="secondary" className="text-xs bg-gold/10 text-gold border-gold/20">Destaque</Badge>
              )}
              {!enabled && <Badge variant="destructive" className="text-xs">Pausado</Badge>}
            </CardTitle>
            <CardDescription className="font-mono text-[10px] uppercase tracking-wider">{row.addon_id}</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor={`en-${row.addon_id}`} className="text-xs font-medium">Ativo na Loja</Label>
              <Switch
                id={`en-${row.addon_id}`}
                checked={enabled}
                onCheckedChange={v => {
                  setEnabled(v);
                  // Auto-save status change for better UX
                  saveMut.mutate();
                }}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nome de Exibição</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Preço Mensal (R$)</Label>
            <Input
              value={priceReais}
              onChange={(e) => setPriceReais(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Recursos (um por linha)</Label>
          <Textarea
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            rows={3}
          />
        </div>

        {hasPromptDefault && (
          <div className="space-y-2 rounded-md border border-gold/20 bg-gold/5 p-3">
            <Label className="text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="size-3" /> Inteligência do Plano (Prompt)
            </Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              rows={5}
              className="font-mono text-[11px] bg-background/50"
            />
            <div className="flex gap-2 items-center">
               <Input 
                 placeholder="Instrução para a IA melhorar este prompt..."
                 value={improveInstruction}
                 onChange={e => setImproveInstruction(e.target.value)}
                 className="text-xs h-8"
               />
               <Button 
                 size="sm" 
                 variant="outline" 
                 onClick={() => improveMut.mutate()}
                 disabled={improveMut.isPending}
                 className="shrink-0 h-8 text-[11px]"
               >
                 Aprimorar
               </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
          <div className="flex gap-2">
            <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="gap-2">
              <Save className="size-4" />
              {saveMut.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:bg-destructive/10 border-destructive/20"
              disabled={deleteMut.isPending}
              onClick={async () => {
                const ok = await confirmDialog({
                  title: "Excluir plano?",
                  description: `O plano "${name}" será removido permanentemente. Assinantes atuais não serão afetados imediatamente, mas o plano sairá da loja.`,
                  confirmText: "Excluir",
                  destructive: true,
                });
                if (ok) deleteMut.mutate();
              }}
            >
              <Trash2 className="size-4 mr-1" /> Excluir
            </Button>
          </div>
          
          {row.override?.updated_at && (
            <span className="text-[10px] text-muted-foreground italic">
              Atualizado em {new Date(row.override.updated_at).toLocaleString("pt-BR")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
