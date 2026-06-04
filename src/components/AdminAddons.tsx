import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAdminAddons,
  upsertAdminAddon,
  resetAdminAddon,
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
import { Save, RotateCcw, Package, Sparkles, Undo2 } from "lucide-react";
import { formatBRL } from "@/lib/addons.catalog";
import { confirmDialog } from "@/components/system-feedback";

export function AdminAddons() {
  const listFn = useServerFn(listAdminAddons);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-addons"],
    queryFn: () => listFn(),
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando add-ons…</div>;
  }
  if (!data?.length) {
    return <div className="text-sm text-muted-foreground">Nenhum add-on configurado.</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="size-5 text-gold" /> Add-ons & Assinaturas
          </CardTitle>
          <CardDescription>
            Edite nome, descrição, recursos, preço, prompt de IA e disponibilidade. Mudanças se aplicam imediatamente ao checkout e às gerações que usarem o prompt customizado.
          </CardDescription>
        </CardHeader>
      </Card>
      {data.map((row) => (
        <AddonEditor key={row.addon_id} row={row} />
      ))}
    </div>
  );
}

function AddonEditor({ row }: { row: AddonRow }) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertAdminAddon);
  const resetFn = useServerFn(resetAdminAddon);
  const improveFn = useServerFn(improveAddonPrompt);

  const [name, setName] = useState(row.effective.name);
  const [description, setDescription] = useState(row.effective.description);
  const [features, setFeatures] = useState(row.effective.features.join("\n"));
  const [priceReais, setPriceReais] = useState(
    (row.effective.price_cents / 100).toFixed(2).replace(".", ","),
  );
  const [prompt, setPrompt] = useState(row.effective.prompt ?? "");
  const [enabled, setEnabled] = useState(row.effective.enabled);
  const [improveInstruction, setImproveInstruction] = useState("");

  useEffect(() => {
    setName(row.effective.name);
    setDescription(row.effective.description);
    setFeatures(row.effective.features.join("\n"));
    setPriceReais((row.effective.price_cents / 100).toFixed(2).replace(".", ","));
    setPrompt(row.effective.prompt ?? "");
    setEnabled(row.effective.enabled);
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
        },
      });
    },
    onSuccess: () => {
      toast.success("Add-on atualizado.");
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMut = useMutation({
    mutationFn: () => resetFn({ data: { addon_id: row.addon_id } }),
    onSuccess: () => {
      toast.success("Restaurado para o padrão do catálogo.");
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

  const hasOverride = !!row.override;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {name}
              {row.defaults.highlight && (
                <Badge variant="secondary" className="text-xs">Destaque</Badge>
              )}
              {hasOverride && <Badge className="text-xs">Personalizado</Badge>}
              {!enabled && <Badge variant="destructive" className="text-xs">Desativado</Badge>}
            </CardTitle>
            <CardDescription className="font-mono text-xs">{row.addon_id}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`en-${row.addon_id}`} className="text-xs">Disponível</Label>
            <Switch
              id={`en-${row.addon_id}`}
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`n-${row.addon_id}`}>Nome</Label>
            <Input
              id={`n-${row.addon_id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>
          <div>
            <Label htmlFor={`p-${row.addon_id}`}>
              Preço (R$/mês) — padrão: {formatBRL(row.defaults.price_cents)}
            </Label>
            <Input
              id={`p-${row.addon_id}`}
              value={priceReais}
              onChange={(e) => setPriceReais(e.target.value)}
              inputMode="decimal"
              placeholder="29,90"
            />
          </div>
        </div>
        <div>
          <Label htmlFor={`d-${row.addon_id}`}>Descrição</Label>
          <Textarea
            id={`d-${row.addon_id}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={1000}
          />
        </div>
        <div>
          <Label htmlFor={`f-${row.addon_id}`}>Recursos (um por linha)</Label>
          <Textarea
            id={`f-${row.addon_id}`}
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            rows={Math.min(8, Math.max(3, features.split("\n").length))}
          />
        </div>
        {hasPromptDefault ? (
          <div className="space-y-2 rounded-md border border-border/60 bg-card/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor={`pr-${row.addon_id}`} className="flex items-center gap-2">
                Prompt de IA
                {row.defaults.prompt_applied ? (
                  <Badge variant="secondary" className="text-[10px]">Aplicado em runtime</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Referência</Badge>
                )}
              </Label>
              {hasOverride && row.override?.prompt && (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setPrompt(row.defaults.prompt_template ?? "")}
                  title="Voltar ao prompt padrão do sistema"
                >
                  <Undo2 className="size-3 mr-1" /> Restaurar prompt padrão
                </Button>
              )}
            </div>
            <Textarea
              id={`pr-${row.addon_id}`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={Math.min(20, Math.max(8, prompt.split("\n").length))}
              placeholder="Prompt do sistema…"
              maxLength={8000}
              className="font-mono text-xs"
            />
            {row.defaults.prompt_vars.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Variáveis disponíveis:{" "}
                {row.defaults.prompt_vars.map((v) => (
                  <code key={v} className="mx-0.5 rounded bg-muted px-1">{v}</code>
                ))}
              </p>
            )}
            {row.defaults.prompt_note && (
              <p className="text-xs text-muted-foreground">{row.defaults.prompt_note}</p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end pt-1">
              <div className="flex-1">
                <Label htmlFor={`imp-${row.addon_id}`} className="text-xs">
                  Instrução opcional para o aprimoramento
                </Label>
                <Input
                  id={`imp-${row.addon_id}`}
                  value={improveInstruction}
                  onChange={(e) => setImproveInstruction(e.target.value)}
                  placeholder="Ex: mais simbólico, foque em ações práticas…"
                  maxLength={300}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={improveMut.isPending || prompt.trim().length < 10}
                onClick={() => improveMut.mutate()}
              >
                <Sparkles className="size-4 mr-1" />
                {improveMut.isPending ? "Aprimorando…" : "Aprimorar com IA"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Este add-on não possui prompt de IA editável.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            <Save className="size-4 mr-1" />
            {saveMut.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
          {hasOverride && (
            <Button
              variant="outline"
              disabled={resetMut.isPending}
              onClick={async () => {
                const ok = await confirmDialog({
                  title: "Restaurar padrão?",
                  description: "As personalizações deste add-on serão removidas.",
                  confirmText: "Restaurar",
                });
                if (ok) resetMut.mutate();
              }}
            >
              <RotateCcw className="size-4 mr-1" /> Restaurar padrão
            </Button>
          )}
          {row.override?.updated_at && (
            <span className="text-xs text-muted-foreground">
              Última edição: {new Date(row.override.updated_at).toLocaleString("pt-BR")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
