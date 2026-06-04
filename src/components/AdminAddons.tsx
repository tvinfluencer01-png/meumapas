import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAdminAddons,
  upsertAdminAddon,
  resetAdminAddon,
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
import { Save, RotateCcw, Package } from "lucide-react";
import { formatBRL } from "@/lib/addons.catalog";
import { confirmDialog } from "@/components/system-feedback";

const PROMPT_SUPPORTED: Record<string, { vars: string[]; note: string }> = {
  sub_daily_horoscope: {
    vars: ["{{sign}}", "{{date}}"],
    note: "Aplicado no horóscopo diário (cron e teste). Variáveis disponíveis: {{sign}}, {{date}}.",
  },
};

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

  const [name, setName] = useState(row.effective.name);
  const [description, setDescription] = useState(row.effective.description);
  const [features, setFeatures] = useState(row.effective.features.join("\n"));
  const [priceReais, setPriceReais] = useState(
    (row.effective.price_cents / 100).toFixed(2).replace(".", ","),
  );
  const [prompt, setPrompt] = useState(row.effective.prompt ?? "");
  const [enabled, setEnabled] = useState(row.effective.enabled);

  useEffect(() => {
    setName(row.effective.name);
    setDescription(row.effective.description);
    setFeatures(row.effective.features.join("\n"));
    setPriceReais((row.effective.price_cents / 100).toFixed(2).replace(".", ","));
    setPrompt(row.effective.prompt ?? "");
    setEnabled(row.effective.enabled);
  }, [row]);

  const supportsPrompt = PROMPT_SUPPORTED[row.addon_id];

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
          prompt: supportsPrompt ? (prompt.trim() || null) : undefined,
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
        {supportsPrompt ? (
          <div>
            <Label htmlFor={`pr-${row.addon_id}`}>Prompt de IA</Label>
            <Textarea
              id={`pr-${row.addon_id}`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={10}
              placeholder="Deixe em branco para usar o prompt padrão."
              maxLength={8000}
            />
            <p className="mt-1 text-xs text-muted-foreground">{supportsPrompt.note}</p>
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
